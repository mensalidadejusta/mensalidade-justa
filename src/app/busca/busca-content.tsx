"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, GraduationCap, Search, MapPin, Navigation, Loader2 } from "lucide-react";
import MapaEscolas from "@/components/mapa-escolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";
import SearchableSelect from "@/components/searchable-select";
import CaixaBuscaLocalizacao from "@/components/caixa-busca-localizacao";
import BuscaResults from "./busca-results";
import type { EscolaResult } from "./busca-results";
import type { FiltroLocalizacao } from "@/components/caixa-busca-localizacao";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function sortResults(
  data: EscolaResult[],
  userLocation: { lat: number; lon: number } | null
): EscolaResult[] {
  const withDistance = data.map((e) => {
    let distancia_km: number | undefined;
    if (userLocation && e.latitude && e.longitude) {
      distancia_km = haversine(
        userLocation.lat,
        userLocation.lon,
        e.latitude,
        e.longitude
      );
    }
    return { ...e, distancia_km };
  });

  return withDistance.sort((a, b) => {
    const aHasPreco = a.series_precos && a.series_precos.length > 0;
    const bHasPreco = b.series_precos && b.series_precos.length > 0;
    if (aHasPreco && !bHasPreco) return -1;
    if (!aHasPreco && bHasPreco) return 1;
    const distA = a.distancia_km ?? 99999;
    const distB = b.distancia_km ?? 99999;
    return distA - distB;
  });
}

type Props = {
  ufs: string[];
  cidades: string[];
  resultados: EscolaResult[] | null;
};

export default function BuscaContent({
  ufs: initialUfs,
  cidades: initialCidades,
  resultados,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useRef(createClient());

  const [localQuery, setLocalQuery] = useState(searchParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ufs, setUfs] = useState<string[]>(initialUfs);
  const [cidades, setCidades] = useState<string[]>(initialCidades);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [navTick, setNavTick] = useState(0);
  const [filtroLoc, setFiltroLoc] = useState<FiltroLocalizacao | null>(null);
  const [resultadosCoordenadas, setResultadosCoordenadas] = useState<EscolaResult[] | null>(null);
  const [carregandoCoordenadas, setCarregandoCoordenadas] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const uf = filtroLoc?.uf ?? searchParams.get("uf") ?? "";
  const cidade = filtroLoc?.cidade ?? searchParams.get("cidade") ?? "";
  const serieSlug = searchParams.get("serie") ?? "";
  const showPrivada = searchParams.get("privada") !== "0";
  const showPublica = searchParams.get("publica") !== "0";

  function readParam(key: string): string {
    if (typeof window === "undefined") return searchParams.get(key) ?? "";
    return new URLSearchParams(window.location.search).get(key) ?? "";
  }

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(
      typeof window !== "undefined"
        ? window.location.search
        : searchParams.toString()
    );
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.replace(`${pathname}?${params.toString()}`);
    setNavTick((n) => n + 1);
  }

  useEffect(() => {
    setLocalQuery(readParam("q"));

    const handler = () => {
      setNavTick((n) => n + 1);
      setLocalQuery(readParam("q"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    if (initialUfs.length > 0) setUfs(initialUfs);
  }, [initialUfs]);

  useEffect(() => {
    if (initialCidades.length > 0) setCidades(initialCidades);
  }, [initialCidades]);

  async function handleLocationChange(filtro: FiltroLocalizacao) {
    setFiltroLoc(filtro);

    if (filtro.latitude != null && filtro.longitude != null) {
      setCarregandoCoordenadas(true);
      try {
        const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
          p_lat: filtro.latitude,
          p_lon: filtro.longitude,
          p_raio_km: 100,
        });
        const mapped = (data || []).map((item: any) => ({
          ...item,
          distancia_km: item.distancia_km ?? undefined,
        })) as EscolaResult[];
        setResultadosCoordenadas(mapped);
      } catch {
        setResultadosCoordenadas([]);
      }
      setCarregandoCoordenadas(false);
      return;
    }

    if (filtro.cidade && filtro.uf) {
      updateFilters({ uf: filtro.uf, cidade: filtro.cidade, q: localQuery });
    } else if (filtro.buscaRaw) {
      updateFilters({ q: filtro.buscaRaw });
    }
  }

  useEffect(() => {
    if (localQuery === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => {
      updateFilters({ q: localQuery });
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery]);

  useEffect(() => {
    if (localQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase.current
        .from("escolas")
        .select("id, nome, municipio, uf, codigo_inep")
        .ilike("nome", `%${localQuery}%`)
        .order("nome")
        .limit(6);
      if (data) setSuggestions(data);
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery]);

  useEffect(() => {
    if (suggestions.length === 0) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current?.contains(e.target as Node)) return;
      setSuggestions([]);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [suggestions]);

  const dadosExibir = resultados ?? resultadosCoordenadas;

  const sortedResultados = useMemo(
    () => (dadosExibir ? sortResults(dadosExibir, userLocation) : null),
    [dadosExibir, userLocation]
  );

  const hasResults = sortedResultados && sortedResultados.length > 0;

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const nomeBuscaInput = (
    <div className="relative w-full" ref={searchRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--color-text-tertiary)] z-10" />
          <input
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 pl-11 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-300"
            placeholder="Buscar escola por nome..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl z-30 overflow-hidden">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
              className="block px-4 py-3 text-sm hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] last:border-0 transition-all duration-200"
            >
              <div className="font-medium text-[var(--color-text)] truncate">{s.nome}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] selection:bg-[var(--color-primary)]/30 flex flex-col">
      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-dvh">
        <div className="flex flex-col items-center justify-start flex-1 px-4 pt-6 pb-4">
          <div className="w-full max-w-lg mx-auto space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Mensalidade Justa
                </span>
              </h1>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
                A maior rede colaborativa de pre{'\u00e7'}os escolares do Brasil. Compare mensalidades reais compartilhadas por outros pais.
              </p>
            </div>
            <CaixaBuscaLocalizacao
              onLocationChange={handleLocationChange}
              className="w-full"
            />
            {nomeBuscaInput}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const current = readParam("privada") !== "0";
                  updateFilters({ privada: current ? "0" : "1" });
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
                  showPrivada
                    ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Privadas
              </button>
              <button
                onClick={() => {
                  const current = readParam("publica") !== "0";
                  updateFilters({ publica: current ? "0" : "1" });
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
                  showPublica
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                    : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                P{'\u00fa'}blicas
              </button>
              <SearchableSelect
                label="Etapa"
                value={serieSlug}
                series={SERIES}
                grupos={GRUPOS}
                onChange={(v) => updateFilters({ serie: v })}
                isMultiple={true}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 pb-24 overflow-y-auto">
          {(uf && cidade) || resultadosCoordenadas ? (
            carregandoCoordenadas ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
                  <p className="text-sm text-[var(--color-text-tertiary)]">Buscando escolas pr{'\u00f3'}ximas...</p>
                </div>
              </div>
            ) : sortedResultados ? (
              <div className="max-w-lg mx-auto">
                <BuscaResults resultados={sortedResultados} hoveredId={hoveredId} onHover={handleHover} />
              </div>
            ) : (
              <div className="text-center text-sm text-[var(--color-text-tertiary)] py-12">
                <p className="font-medium">Nenhuma escola encontrada.</p>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-center text-xs text-[var(--color-text-tertiary)] px-4">
              <div>
                <div className="flex justify-center mb-2">
                  <MapPin className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="font-medium">Digite um endere{'\u00e7'}o ou cidade para come{'\u00e7'}ar.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex flex-col min-h-dvh">
        <div className="flex flex-col items-center justify-start flex-1 pt-10 pb-4 px-4">
          <div className="w-full max-w-2xl mx-auto space-y-5">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Mensalidade Justa
                </span>
              </h1>
              <p className="text-sm text-[var(--color-text-tertiary)] mt-2 leading-relaxed max-w-lg mx-auto">
                A maior rede colaborativa de pre{'\u00e7'}os escolares do Brasil. Compare mensalidades reais compartilhadas por outros pais.
              </p>
            </div>

            <div className="space-y-4">
              <CaixaBuscaLocalizacao
                onLocationChange={handleLocationChange}
                className="w-full"
              />
              {nomeBuscaInput}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    const current = readParam("privada") !== "0";
                    updateFilters({ privada: current ? "0" : "1" });
                  }}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 border ${
                    showPrivada
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Privadas
                </button>
                <button
                  onClick={() => {
                    const current = readParam("publica") !== "0";
                    updateFilters({ publica: current ? "0" : "1" });
                  }}
                  className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 border ${
                    showPublica
                      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                      : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  P{'\u00fa'}blicas
                </button>
                <SearchableSelect
                  label="Etapa"
                  value={serieSlug}
                  series={SERIES}
                  grupos={GRUPOS}
                  onChange={(v) => updateFilters({ serie: v })}
                  isMultiple={true}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 pb-8">
          {(uf && cidade) || resultadosCoordenadas ? (
            <div className="max-w-2xl mx-auto">
              {carregandoCoordenadas ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
                    <p className="text-sm text-[var(--color-text-tertiary)]">Buscando escolas pr{'\u00f3'}ximas...</p>
                  </div>
                </div>
              ) : sortedResultados ? (
                <BuscaResults resultados={sortedResultados} hoveredId={hoveredId} onHover={handleHover} />
              ) : (
                <div className="text-center text-sm text-[var(--color-text-tertiary)] py-12">
                  <p className="font-medium">Nenhuma escola encontrada.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-center text-sm text-[var(--color-text-tertiary)]">
              <div>
                <div className="flex justify-center mb-3">
                  <MapPin className="w-10 h-10 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="font-medium">Digite um endere{'\u00e7'}o ou cidade para come{'\u00e7'}ar.</p>
              </div>
            </div>
          )}
        </div>

        {showMap && sortedResultados && (
          <div className="fixed inset-0 z-50 bg-[var(--color-bg)]">
            <div className="h-full w-full">
              <MapaEscolas escolas={sortedResultados} userLocation={userLocation} hoveredId={hoveredId} />
            </div>
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface)]/80 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all duration-300 backdrop-blur-md"
            >
              Fechar Mapa
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
