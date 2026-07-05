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
    let distancia_km = e.distancia_km;
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
  const [navTick, setNavTick] = useState(0);
  const [filtroLoc, setFiltroLoc] = useState<FiltroLocalizacao | null>(null);
  const [resultadosCoordenadas, setResultadosCoordenadas] = useState<EscolaResult[] | null>(null);
  const [carregandoCoordenadas, setCarregandoCoordenadas] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mapReqId = useRef(0);

  const uf = filtroLoc?.uf ?? searchParams.get("uf") ?? "";
  const cidade = filtroLoc?.cidade ?? searchParams.get("cidade") ?? "";
  const serieSlug = searchParams.get("serie") ?? "";
  const showPrivada = searchParams.get("privada") !== "0";
  const showPublica = searchParams.get("publica") !== "0";
  const showMap = searchParams.get("map") === "1";
  const temBusca = !!(uf && cidade) || !!resultadosCoordenadas;

  const counts = useMemo(() => {
    const base = resultadosCoordenadas ?? resultados;
    if (!base) return { privadas: 0, publicas: 0 };
    return {
      privadas: base.filter((e) => e.dependencia_administrativa === "Privada").length,
      publicas: base.filter((e) => e.dependencia_administrativa !== "Privada").length,
    };
  }, [resultados, resultadosCoordenadas]);

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

  useEffect(() => {
    function buscarPorUrl() {
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      const lat = params.get("lat");
      const lon = params.get("lon");
      if (!lat || !lon) return;
      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (isNaN(latNum) || isNaN(lonNum)) return;
      if (resultadosCoordenadas !== null) return;

      (async () => {
        setCarregandoCoordenadas(true);
        try {
          const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
            p_lat: latNum,
            p_lon: lonNum,
            p_raio_km: 50,
          });
          const mapped = (data || []).map((item: any) => ({
            ...item,
            distancia_km: item.distancia_km ?? undefined,
          })) as EscolaResult[];
          setResultadosCoordenadas(mapped);
          setUserLocation({ lat: latNum, lon: lonNum });
        } catch {
          setResultadosCoordenadas([]);
        }
        setCarregandoCoordenadas(false);
      })();
    }

    buscarPorUrl();
  }, [searchParams, resultadosCoordenadas]);

  useEffect(() => {
    if (!showMap || temBusca) return;
    if (resultadosCoordenadas !== null) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const novosParams = new URLSearchParams(window.location.search);
        novosParams.set("lat", lat.toString());
        novosParams.set("lon", lon.toString());
        router.replace(`${pathname}?${novosParams.toString()}`);
        setCarregandoCoordenadas(true);
        try {
          const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
            p_lat: lat, p_lon: lon, p_raio_km: 50,
          });
          const mapped = (data || []).map((item: any) => ({
            ...item, distancia_km: item.distancia_km ?? undefined,
          })) as EscolaResult[];
          setResultadosCoordenadas(mapped);
          setUserLocation({ lat, lon });
        } catch {
          setResultadosCoordenadas([]);
        }
        setCarregandoCoordenadas(false);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [showMap]);

  async function handleLocationChange(filtro: FiltroLocalizacao) {
    setFiltroLoc(filtro);

    if (filtro.latitude != null && filtro.longitude != null) {
      const novosParams = new URLSearchParams(window.location.search);
      novosParams.set("lat", filtro.latitude.toString());
      novosParams.set("lon", filtro.longitude.toString());
      if (filtro.cidade) novosParams.set("cidade", filtro.cidade);
      if (filtro.uf) novosParams.set("uf", filtro.uf);
      router.replace(`${pathname}?${novosParams.toString()}`);
      setNavTick((n) => n + 1);
      setCarregandoCoordenadas(true);
      try {
        const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
          p_lat: filtro.latitude,
          p_lon: filtro.longitude,
          p_raio_km: 50,
        });
        const mapped = (data || []).map((item: any) => ({
          ...item,
          distancia_km: item.distancia_km ?? undefined,
          etapas_modalidades: item.etapas_modalidades ?? null,
        })) as EscolaResult[];
        setResultadosCoordenadas(mapped);
        setUserLocation({ lat: filtro.latitude, lon: filtro.longitude });
      } catch {
        setResultadosCoordenadas([]);
      }
      setCarregandoCoordenadas(false);
      return;
    }

    if (filtro.cidade && filtro.uf) {
      return;
    }

    if (filtro.buscaRaw) {
      const novosParams = new URLSearchParams(window.location.search);
      novosParams.set("q", filtro.buscaRaw);
      router.replace(`${pathname}?${novosParams.toString()}`);
      setNavTick((n) => n + 1);
      setResultadosCoordenadas(null);
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

  const dadosExibir = useMemo(() => {
    const base = resultadosCoordenadas ?? resultados;
    if (!base) return null;

    let filtrado = [...base];

    if (showPrivada && !showPublica) {
      filtrado = filtrado.filter((e) => e.dependencia_administrativa === "Privada");
    } else if (showPublica && !showPrivada) {
      filtrado = filtrado.filter((e) => e.dependencia_administrativa !== "Privada");
    } else if (!showPrivada && !showPublica) {
      filtrado = [];
    }

    if (serieSlug) {
      const slugs = serieSlug.split(",").filter(Boolean);
      if (slugs.length > 0) {
        const slugToGrupo = new Map(SERIES.map((s) => [s.slug, s.grupo]));
        const gruposSelecionados = slugs.map((s) => slugToGrupo.get(s)).filter(Boolean);
        filtrado = filtrado.filter((e) => {
          if (!e.etapas_modalidades) return false;
          const etapas = e.etapas_modalidades.toLowerCase();
          return gruposSelecionados.some((g) => {
            const grupo = g!.toLowerCase();
            if (grupo.startsWith("ensino fundamental")) {
              return etapas.includes("ensino fundamental");
            }
            if (grupo.startsWith("educação infantil")) {
              return etapas.includes("educação infantil");
            }
            if (grupo.startsWith("ensino médio")) {
              return etapas.includes("ensino médio");
            }
            return etapas.includes(grupo);
          });
        });
      }
    }

    return filtrado;
  }, [resultados, resultadosCoordenadas, showPrivada, showPublica, serieSlug]);

  const sortedResultados = useMemo(
    () => (dadosExibir ? sortResults(dadosExibir, userLocation) : null),
    [dadosExibir, userLocation]
  );

  const hasResults = sortedResultados && sortedResultados.length > 0;

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const handleMapBoundsChange = useCallback(async (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => {
    const id = ++mapReqId.current;
    try {
      const { data } = await supabase.current.rpc("escolas_no_mapa", {
        p_min_lat: bounds.minLat, p_min_lon: bounds.minLon,
        p_max_lat: bounds.maxLat, p_max_lon: bounds.maxLon,
        p_limit: 200,
      });
      if (id !== mapReqId.current) return;
      if (data?.length) {
        const mapped = data.map((item: any) => ({
          ...item, distancia_km: undefined,
        })) as EscolaResult[];
        setResultadosCoordenadas(mapped);
      }
    } catch {}
  }, []);

  const nomeBuscaInput = (
    <div className="relative w-full" ref={searchRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-text-tertiary z-10" />
          <input
            className="w-full bg-surface border border-border/50 rounded-full py-3 pl-11 pr-4 text-[15px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-[#1f3b9b]/40 focus:ring-4 focus:ring-[#1f3b9b]/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_-5px_rgba(66,133,244,0.2),0_-4px_20px_-8px_rgba(139,92,246,0.15),0_4px_20px_-8px_rgba(236,72,153,0.1)]"
            placeholder="Buscar escola por nome..."
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); updateFilters({ q: localQuery }); } }}
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-surface border border-border rounded-2xl shadow-xl z-30 overflow-hidden">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
              className="block px-4 py-3 text-sm hover:bg-surface-hover border-b border-border last:border-0 transition-all duration-200"
            >
              <div className="font-medium text-text truncate">{s.nome}</div>
              <div className="text-xs text-text-tertiary mt-0.5">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg text-text selection:bg-primary/30 flex flex-col">
      {/* ===== MOBILE ===== */}
      <div className={`md:hidden flex flex-col min-h-dvh ${!((uf && cidade) || resultadosCoordenadas) ? "justify-center" : ""}`}>
        <div className="px-4 pt-0 pb-4">
          <div className="w-full max-w-lg mx-auto space-y-4">
            <div className="text-center">
              <h1 className="text-2xl font-[400] tracking-tight">
                <span className="bg-gradient-to-r from-primary via-purple-500 to-coral bg-clip-text text-transparent">
                  Mensalidade Justa
                </span>
              </h1>
              <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                A maior rede colaborativa de pre{'\u00e7'}os escolares do Brasil.<br />Compare mensalidades reais compartilhadas por outros pais.
              </p>
            </div>
            <CaixaBuscaLocalizacao
              onLocationChange={handleLocationChange}
              className="w-full"
            />
            {nomeBuscaInput}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const current = readParam("privada") !== "0";
                  updateFilters({ privada: current ? "0" : "1" });
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-transparent ${
                  showPrivada
                    ? "bg-[#ad46ff] text-white"
                    : "bg-surface-hover text-text-secondary"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                Privadas{counts.privadas > 0 ? ` (${counts.privadas})` : ""}
              </button>
              <button
                onClick={() => {
                  const current = readParam("publica") !== "0";
                  updateFilters({ publica: current ? "0" : "1" });
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-transparent ${
                  showPublica
                    ? "bg-[#6ee7b7] text-black"
                    : "bg-surface-hover text-text-secondary"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                P{'\u00fa'}blicas{counts.publicas > 0 ? ` (${counts.publicas})` : ""}
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

        {showMap && sortedResultados && (
          <div className="px-4 pb-4">
            <div className="h-[300px] rounded-2xl overflow-hidden border border-border shadow-lg">
              <MapaEscolas escolas={sortedResultados} userLocation={userLocation} hoveredId={hoveredId} serieSlug={serieSlug} onBoundsChange={handleMapBoundsChange} />
            </div>
          </div>
        )}
        {((uf && cidade) || resultadosCoordenadas) && (
          <div className="px-4 pb-24">
            {carregandoCoordenadas ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-sm text-text-tertiary">Buscando escolas pr{'\u00f3'}ximas...</p>
                </div>
              </div>
            ) : sortedResultados && sortedResultados.length > 0 ? (
              <div className="w-full mx-auto">
                <BuscaResults resultados={sortedResultados} hoveredId={hoveredId} onHover={handleHover} serieSlug={serieSlug} />
              </div>
            ) : (
              <div className="text-center text-sm text-text-tertiary py-12">
                <p className="font-medium">Nenhuma escola encontrada.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex min-h-dvh relative">
        {showMap && (
          <div className="absolute inset-0 z-0">
            <MapaEscolas
              escolas={sortedResultados || []}
              userLocation={userLocation}
              hoveredId={hoveredId}
              serieSlug={serieSlug}
              onBoundsChange={handleMapBoundsChange}
            />
          </div>
        )}

        {showMap ? (
          <div className="relative z-10 w-full pointer-events-none">
            <div className="w-96 ml-3 mt-3 pointer-events-auto">
              <div className="bg-bg border border-border/50 rounded-2xl shadow-lg p-3 space-y-2">
                <CaixaBuscaLocalizacao
                  onLocationChange={handleLocationChange}
                  className="w-full"
                  iconOnlyGeo
                />
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const current = readParam("privada") !== "0";
                      updateFilters({ privada: current ? "0" : "1" });
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 ${
                      showPrivada
                        ? "bg-[#ad46ff] text-white"
                        : "bg-surface-hover border-transparent text-text-secondary"
                    }`}
                  >
                    <DollarSign className="w-3 h-3" />
                    Privadas{counts.privadas > 0 ? ` (${counts.privadas})` : ""}
                  </button>
                  <button
                    onClick={() => {
                      const current = readParam("publica") !== "0";
                      updateFilters({ publica: current ? "0" : "1" });
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 ${
                      showPublica
                        ? "bg-[#6ee7b7] text-black"
                        : "bg-surface-hover border-transparent text-text-secondary"
                    }`}
                  >
                    <GraduationCap className="w-3 h-3" />
                    P{'\u00fa'}blicas{counts.publicas > 0 ? ` (${counts.publicas})` : ""}
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
        ) : (
          <div className={`flex flex-col transition-all duration-500 ease-in-out w-full ${!((uf && cidade) || resultadosCoordenadas) ? "justify-center" : ""}`}>
            <div className="pt-0 pb-4 px-4">
              <div className="mx-auto space-y-5 max-w-2xl">
                <div className="text-center">
                  <h1 className="text-4xl font-[400] tracking-tight">
                    <span className="bg-gradient-to-r from-primary via-purple-500 to-coral bg-clip-text text-transparent">
                      Mensalidade Justa
                    </span>
                  </h1>
                  <p className="text-sm text-text-tertiary mt-2 leading-relaxed max-w-lg mx-auto">
                    A maior rede colaborativa de pre{'\u00e7'}os escolares do Brasil.<br />Compare mensalidades reais compartilhadas por outros pais.
                  </p>
                </div>

              <CaixaBuscaLocalizacao
                onLocationChange={handleLocationChange}
                className="w-full"
              />
              {nomeBuscaInput}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        const current = readParam("privada") !== "0";
                        updateFilters({ privada: current ? "0" : "1" });
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 ${
                        showPrivada
                          ? "bg-[#ad46ff] text-white"
                          : "bg-surface-hover border-transparent text-text-secondary"
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Privadas{counts.privadas > 0 ? ` (${counts.privadas})` : ""}
                    </button>
                    <button
                      onClick={() => {
                        const current = readParam("publica") !== "0";
                        updateFilters({ publica: current ? "0" : "1" });
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 ${
                        showPublica
                          ? "bg-[#6ee7b7] text-black"
                          : "bg-surface-hover border-transparent text-text-secondary"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      P{'\u00fa'}blicas{counts.publicas > 0 ? ` (${counts.publicas})` : ""}
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

            {((uf && cidade) || resultadosCoordenadas) && (
              <div className="px-4 pb-8">
                <div className="mx-auto max-w-6xl">
                  {carregandoCoordenadas ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-sm text-text-tertiary">Buscando escolas pr{'\u00f3'}ximas...</p>
                      </div>
                    </div>
                  ) : sortedResultados && sortedResultados.length > 0 ? (
                    <BuscaResults resultados={sortedResultados} hoveredId={hoveredId} onHover={handleHover} serieSlug={serieSlug} />
                  ) : (
                    <div className="text-center text-sm text-text-tertiary py-12">
                      <p className="font-medium">Nenhuma escola encontrada.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
