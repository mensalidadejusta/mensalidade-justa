"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Navigation, DollarSign, GraduationCap, Map, List, Maximize2, Minimize2, MapPin } from "lucide-react";
import MapaEscolas from "@/components/mapa-escolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";
import SearchableSelect from "@/components/searchable-select";
import BuscaResults from "./busca-results";
import type { EscolaResult } from "./busca-results";

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

  const [localQuery, setLocalQuery] = useState(
    searchParams.get("q") ?? ""
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ufs, setUfs] = useState<string[]>(initialUfs);
  const [cidades, setCidades] = useState<string[]>(initialCidades);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [viewMap, setViewMap] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [navTick, setNavTick] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const uf = searchParams.get("uf") ?? "";
  const cidade = searchParams.get("cidade") ?? "";
  const serieSlug = searchParams.get("serie") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

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
    if (ufs.length === 0) {
      supabase.current.rpc("get_ufs").then(({ data }) => {
        if (data)
          setUfs(data.map((r: any) => r.uf).filter(Boolean));
      });
    }
  }, []);

  useEffect(() => {
    if (uf && cidades.length === 0) {
      supabase.current
        .rpc("get_cidades", { p_uf: uf })
        .then(({ data }) => {
          if (data)
            setCidades(
              data.map((r: any) => r.municipio).filter(Boolean)
            );
        });
    }
  }, [uf]);

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

  async function buscarPertoDeMim() {
    if (!navigator.geolocation) {
      setGeoError("Geolocaliza\u00e7\u00e3o n\u00e3o suportada.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    try {
      const pos = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        }
      );
      const { latitude, longitude } = pos.coords;
      const loc = { lat: latitude, lon: longitude };
      setUserLocation(loc);
      localStorage.setItem("mj_userLocation", JSON.stringify(loc));

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
        { headers: { "User-Agent": "MensalidadeJusta/1.0" } }
      );
      const geo = await geoRes.json();
      const a = geo.address || {};
      const cid =
        a.city || a.town || a.village || a.municipality || "";
      const est =
        a["ISO3166-2-lvl4"]?.replace("BR-", "") ||
        a.state?.slice(0, 2) ||
        "";
      if (!est || !cid) {
        setGeoError("N\u00e3o foi poss\u00edvel identificar sua cidade.");
        return;
      }

      const { data: raw } = await supabase.current.rpc(
        "get_cidades",
        { p_uf: est }
      );
      const lista: string[] = raw
        ? raw.map((r: any) => r.municipio).filter(Boolean)
        : [];
      setCidades(lista);
      const match =
        lista.includes(cid)
          ? cid
          : lista.find(
              (c) =>
                c
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase() ===
                cid
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
            ) || cid;

      localStorage.setItem("mj_uf", est);
      localStorage.setItem("mj_cidade", match);
      updateFilters({ uf: est, cidade: match, q: localQuery });
    } catch (err: any) {
      setGeoError(
        err.code === 1
          ? "Permiss\u00e3o negada."
          : "Erro ao obter localiza\u00e7\u00e3o."
      );
    }
    setGeoLoading(false);
  }

  const sortedResultados = useMemo(
    () => (resultados ? sortResults(resultados, userLocation) : null),
    [resultados, userLocation]
  );

  const hasResults = sortedResultados && sortedResultados.length > 0;

  const logo = (
    <div className="text-center md:text-left">
      <h1 className="text-sm md:text-2xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Mensalidade Justa
        </span>
      </h1>
      <p className="hidden md:block text-xs text-[var(--color-text-tertiary)] mt-1 font-medium">
        Compare mensalidades escolares de forma an{'\u00f4'}nima
      </p>
    </div>
  );

  const buscaInput = (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3.5 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 pointer-events-none text-[var(--color-text-tertiary)] z-10" />
        <input
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full py-2 md:py-3 pl-9 md:pl-11 pr-3.5 md:pr-4 text-xs md:text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-300 shadow-sm"
          placeholder="Buscar escola por nome..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 max-w-xl mx-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl z-30 overflow-hidden backdrop-blur-md">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(
                s.codigo_inep,
                s.nome
              )}`}
              className="block px-4 py-3 text-sm hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] last:border-0 transition-all duration-300"
            >
              <div className="font-medium text-[var(--color-text)] truncate">
                {s.nome}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const filterBar = (
    <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide snap-x md:flex-wrap md:justify-center pb-1">
      <button
        onClick={buscarPertoDeMim}
        disabled={geoLoading}
        className="shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-300 active:scale-95"
      >
        <Navigation className="w-3.5 h-3.5" />
        {geoLoading ? '...' : 'Perto de mim'}
      </button>
      <div className="shrink-0 snap-start">
        <SearchableSelect
          label="UF"
          value={uf}
          options={ufs}
          onChange={(v) => updateFilters({ uf: v, cidade: "" })}
          placeholder="UF"
        />
      </div>
      <div className="shrink-0 snap-start">
        <SearchableSelect
          label="Cidade"
          value={cidade}
          options={cidades}
          onChange={(v) => updateFilters({ cidade: v })}
          placeholder="Cidade"
          disabled={!uf}
        />
      </div>
      <button
        onClick={() => {
          const current = readParam("privada") !== "0";
          updateFilters({ privada: current ? "0" : "1" });
        }}
        className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
          readParam("privada") !== "0"
            ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
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
        className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
          readParam("publica") !== "0"
            ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
            : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
        }`}
      >
        <GraduationCap className="w-3.5 h-3.5" />
        P{'\u00fa'}blicas
      </button>
      <div className="shrink-0 snap-start">
        <SearchableSelect
          label="Etapa"
          value={serieSlug}
          series={SERIES}
          grupos={GRUPOS}
          onChange={(v) => updateFilters({ serie: v })}
        />
      </div>
      <div className="shrink-0 snap-start">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-tertiary)] pointer-events-none" />
          <input
            className="pl-8 pr-4 py-2 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-tertiary)] hover:border-[var(--color-border-hover)] transition-all duration-300 w-36 outline-none focus:border-[var(--color-primary)]/40"
            placeholder="Mensalidade M{'\u00e1'}x."
            type="number"
            min="0"
            step="100"
            value={maxPrice}
            onChange={(e) =>
              updateFilters({ maxPrice: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] font-sans selection:bg-[var(--color-primary)]/30">
      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-dvh">
        {/* Sticky header */}
        <div className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-md border-b border-[var(--color-border)]/50 px-4 pt-3 pb-2 space-y-2.5">
          <div className="flex items-center justify-center">
            {logo}
          </div>
          {buscaInput}
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide snap-x w-full pb-0.5">
            <button
              onClick={buscarPertoDeMim}
              disabled={geoLoading}
              className="shrink-0 snap-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-300 active:scale-95"
            >
              <Navigation className="w-3 h-3" />
              {geoLoading ? '...' : 'Perto de mim'}
            </button>
            <div className="shrink-0 snap-start">
              <SearchableSelect
                label="UF"
                value={uf}
                options={ufs}
                onChange={(v) => updateFilters({ uf: v, cidade: "" })}
                placeholder="UF"
              />
            </div>
            <div className="shrink-0 snap-start">
              <SearchableSelect
                label="Cidade"
                value={cidade}
                options={cidades}
                onChange={(v) => updateFilters({ cidade: v })}
                placeholder="Cidade"
                disabled={!uf}
              />
            </div>
            <button
              onClick={() => {
                const current = readParam("privada") !== "0";
                updateFilters({ privada: current ? "0" : "1" });
              }}
              className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
                readParam("privada") !== "0"
                  ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              }`}
            >
              <DollarSign className="w-3 h-3" />
              Privadas
            </button>
            <button
              onClick={() => {
                const current = readParam("publica") !== "0";
                updateFilters({ publica: current ? "0" : "1" });
              }}
              className={`shrink-0 snap-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border ${
                readParam("publica") !== "0"
                  ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              P{'\u00fa'}blicas
            </button>
            <div className="shrink-0 snap-start">
              <SearchableSelect
                label="Etapa"
                value={serieSlug}
                series={SERIES}
                grupos={GRUPOS}
                onChange={(v) => updateFilters({ serie: v })}
              />
            </div>
            <div className="shrink-0 snap-start">
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-tertiary)] pointer-events-none" />
                <input
                  className="pl-7 pr-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] placeholder:text-[var(--color-text-tertiary)] hover:border-[var(--color-border-hover)] transition-all duration-300 w-32 outline-none focus:border-[var(--color-primary)]/40"
                  placeholder="Mensalidade M{'\u00e1'}x."
                  type="number"
                  min="0"
                  step="100"
                  value={maxPrice}
                  onChange={(e) =>
                    updateFilters({ maxPrice: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          {geoError && (
            <p className="text-xs text-[var(--color-danger)] font-medium">
              {geoError}
            </p>
          )}
        </div>

        {/* Results area with fade transition — fixed height */}
        <div className="relative h-[calc(100dvh-132px)]">
          {uf && hasResults && (
            <>
              {/* List */}
              <div
                className={`absolute inset-0 px-4 pb-20 overflow-y-auto transition-all duration-300 ease-in-out ${
                  viewMap
                    ? "opacity-0 scale-[0.97] pointer-events-none"
                    : "opacity-100 scale-100"
                }`}
              >
                <BuscaResults
                  resultados={sortedResultados!}
                  hoveredId={hoveredId}
                  onHover={handleHover}
                />
              </div>

              {/* Map */}
              <div
                className={`absolute inset-0 px-4 pb-20 transition-all duration-300 ease-in-out ${
                  viewMap
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-[0.97] pointer-events-none"
                }`}
              >
                <div className="h-full rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-lg">
                  <MapaEscolas
                    escolas={sortedResultados || []}
                    userLocation={userLocation}
                    hoveredId={hoveredId}
                  />
                </div>
              </div>
            </>
          )}

          {/* Empty states */}
          {!uf && (
            <div className="flex items-center justify-center h-full text-center text-sm text-[var(--color-text-tertiary)] px-4">
              <div>
                <div className="flex justify-center mb-2">
                  <Search className="w-6 h-6 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="font-medium text-xs">
                  Selecione uma localiza{'\u00e7\u00e3o'}o para iniciar.
                </p>
              </div>
            </div>
          )}

          {uf && !hasResults && (
            <div className="flex items-center justify-center h-full text-center text-xs text-[var(--color-text-tertiary)] px-4">
              <p className="font-medium">
                Nenhuma escola cadastrada nesta regi{'\u00e3'}o.
              </p>
            </div>
          )}
        </div>

        {/* FAB - View toggle */}
        {hasResults && (
          <button
            onClick={() => setViewMap((v) => !v)}
            className="floating-btn fixed bottom-[72px] left-1/2 -translate-x-1/2 z-40 backdrop-blur-lg active:scale-95"
          >
            {viewMap ? (
              <><List className="w-4 h-4" /> Ver Lista</>
            ) : (
              <><Map className="w-4 h-4" /> Ver Mapa</>
            )}
          </button>
        )}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex h-dvh overflow-hidden">
        {/* Left panel */}
        <div
          className="flex flex-col border-r border-[var(--color-border)]/60 transition-all duration-300 ease-in-out"
          style={{ width: showMap ? "55%" : "100%" }}
        >
          <header className="shrink-0 px-8 pt-8 pb-5 space-y-5 border-b border-[var(--color-border)]/40">
            {logo}
            {buscaInput}
            {filterBar}
            {geoError && (
              <p className="text-xs text-[var(--color-danger)] font-medium">
                {geoError}
              </p>
            )}
          </header>

          <main className="flex-1 overflow-y-auto px-8 py-4 space-y-3 bg-[var(--color-bg)]">
            {sortedResultados ? (
              <BuscaResults
                resultados={sortedResultados}
                hoveredId={hoveredId}
                onHover={handleHover}
              />
            ) : uf && cidade ? (
              <div className="text-center text-sm text-[var(--color-text-tertiary)] py-12">
                <div className="flex justify-center mb-3">
                  <Search className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="font-medium">
                  Nenhuma escola encontrada.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-sm text-[var(--color-text-tertiary)]">
                <div className="flex justify-center mb-3">
                  <MapPin className="w-10 h-10 text-[var(--color-text-tertiary)]" />
                </div>
                <p className="font-semibold text-center">
                  Defina uma UF e Cidade para carregar
                  <br />
                  as escolas no mapa.
                </p>
              </div>
            )}
          </main>
        </div>

        {/* Right panel - Map */}
        {showMap && (
          <div className="flex-1 relative p-3 min-w-0">
            <div className="h-full rounded-3xl overflow-hidden border border-[var(--color-border)]/80 shadow-2xl bg-[var(--color-surface)]">
              <MapaEscolas
                escolas={sortedResultados || []}
                userLocation={userLocation}
                hoveredId={hoveredId}
              />
            </div>
            <button
              onClick={() => setShowMap(false)}
              className="absolute top-6 right-6 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-surface)]/80 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:border-[var(--color-border-hover)] transition-all duration-300 backdrop-blur-md"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Ocultar Mapa
            </button>
          </div>
        )}

        {/* "Show map" button when hidden */}
        {!showMap && (
          <button
            onClick={() => setShowMap(true)}
            className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] shadow-2xl hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-all duration-300 active:scale-95"
          >
            <Maximize2 className="w-4 h-4" /> Ver Mapa
          </button>
        )}
      </div>
    </div>
  );
}
