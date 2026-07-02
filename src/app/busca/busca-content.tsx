"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ToggleTema from "@/components/toggle-tema";
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
  const [localPrivada, setLocalPrivada] = useState(
    searchParams.get("privada") !== "0"
  );
  const [localPublica, setLocalPublica] = useState(
    searchParams.get("publica") !== "0"
  );

  const uf = searchParams.get("uf") ?? "";
  const cidade = searchParams.get("cidade") ?? "";
  const serieSlug = searchParams.get("serie") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  function updateFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.replace(`${pathname}?${params.toString()}`);
  }

  // Sync local state from URL on browser back/forward
  useEffect(() => {
    const handler = () => {
      const p = new URLSearchParams(window.location.search);
      setLocalPrivada(p.get("privada") !== "0");
      setLocalPublica(p.get("publica") !== "0");
      setLocalQuery(p.get("q") ?? "");
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
      setGeoError(
        "Geolocaliza\u00e7\u00e3o n\u00e3o suportada."
      );
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
      localStorage.setItem(
        "mj_userLocation",
        JSON.stringify(loc)
      );

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
        setGeoError(
          "N\u00e3o foi poss\u00edvel identificar sua cidade."
        );
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

  const buscaInput = (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">
        {'\uD83D\uDD0D'}
      </span>
      <input
        className="w-full bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all shadow-sm"
        placeholder="Buscar escola..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-20 overflow-hidden backdrop-blur-md">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(
                s.codigo_inep,
                s.nome
              )}`}
              className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/40 last:border-0 transition-colors"
            >
              <div className="font-medium text-[#1f1f1f] dark:text-slate-200 truncate">
                {s.nome}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const buscaInputDesktop = (
    <form onSubmit={(e) => e.preventDefault()} className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">
        {'\uD83D\uDD0D'}
      </span>
      <input
        className="w-full bg-[#f0f4f9] dark:bg-[#2c2c2e] border-0 rounded-2xl py-3 pl-11 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
        placeholder="Buscar escola por nome..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(
                s.codigo_inep,
                s.nome
              )}`}
              className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-[#3a3a3c] border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
            >
              <div className="font-semibold text-[#1f1f1f] dark:text-slate-200 truncate">
                {s.nome}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </form>
  );

  const filterBar = (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={buscarPertoDeMim}
        disabled={geoLoading}
        className="badge transition-all active:scale-95"
      >
        {geoLoading
          ? '\uD83D\uDCCD...'
          : '\uD83D\uDCCD Perto de mim'}
      </button>
      <SearchableSelect
        label="UF"
        value={uf}
        options={ufs}
        onChange={(v) => updateFilters({ uf: v, cidade: "" })}
        placeholder="UF"
      />
      <SearchableSelect
        label="Cidade"
        value={cidade}
        options={cidades}
        onChange={(v) => updateFilters({ cidade: v })}
        placeholder="Cidade"
        disabled={!uf}
      />
      <button
        onClick={() => {
          const next = !localPrivada;
          setLocalPrivada(next);
          updateFilters({ privada: next ? "1" : "0" });
        }}
        className={`badge transition-all ${
          localPrivada
            ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]"
            : ""
        }`}
      >
        {'\uD83C\uDFE2'} Privadas
      </button>
      <button
        onClick={() => {
          const next = !localPublica;
          setLocalPublica(next);
          updateFilters({ publica: next ? "1" : "0" });
        }}
        className={`badge transition-all ${
          localPublica
            ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]"
            : ""
        }`}
      >
        {'\uD83C\uDFDB\uFE0F'} P{'\u00fa'}blicas
      </button>
      <SearchableSelect
        label="Etapa"
        value={serieSlug}
        series={SERIES}
        grupos={GRUPOS}
        onChange={(v) => updateFilters({ serie: v })}
      />
      <div className="relative min-w-[100px]">
        <input
          className="badge w-full text-xs text-left font-normal"
          placeholder="Mensalidade M\u00e1xima"
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
  );

  return (
    <div className="min-h-dvh bg-[#f0f4f9] dark:bg-[#131314] transition-colors font-sans selection:bg-blue-500/30">
      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-dvh">
        <header className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-[#1f1f1f] dark:text-slate-200 tracking-tight">
            Mensalidade Justa
          </h1>
          <ToggleTema />
        </header>

        <div className="px-4 pb-3 space-y-2">
          {buscaInput}
          {filterBar}
          {geoError && (
            <p className="text-xs text-red-500 font-medium">
              {geoError}
            </p>
          )}
        </div>

        {!uf && (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-slate-400 dark:text-slate-500 px-4">
            <div>
              <p className="text-3xl mb-3">{'\uD83D\uDD0D'}</p>
              <p className="font-medium">
                Selecione uma localiza
                {'\u00e7\u00e3o'}o para iniciar.
              </p>
            </div>
          </div>
        )}

        {uf && !hasResults && (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-slate-400 px-4">
            <p className="font-medium">
              Nenhuma escola cadastrada nesta regi
              {'\u00e3'}o.
            </p>
          </div>
        )}

        {uf && hasResults && !viewMap && (
          <main className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
            <BuscaResults resultados={sortedResultados!} />
          </main>
        )}

        {uf && viewMap && (
          <div className="flex-1 px-4 pb-4">
            <div className="h-[68dvh] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800/80">
              <MapaEscolas
                escolas={sortedResultados || []}
                userLocation={userLocation}
                hoveredId={hoveredId}
              />
            </div>
          </div>
        )}

        {hasResults && (
          <button
            onClick={() => setViewMap((v) => !v)}
            className="floating-btn fixed bottom-6 right-4 z-30 shadow-xl font-medium tracking-wide active:scale-95 transition-transform"
          >
            {viewMap
              ? '\uD83D\uDCDD Exibir Lista'
              : '\uD83D\uDCCD Ver no Mapa'}
          </button>
        )}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex h-dvh overflow-hidden">
        <div className="w-[43%] lg:w-[38%] flex flex-col bg-white dark:bg-[#1c1c1e] shadow-2xl z-10 border-r border-slate-200/60 dark:border-slate-800/60">
          <header className="shrink-0 px-6 pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-[#1f1f1f] dark:text-slate-100 tracking-tight">
                Mensalidade{' '}
                <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent font-extrabold">
                  Justa
                </span>
              </h1>
              <ToggleTema />
            </div>
            {buscaInputDesktop}
            {filterBar}
            {geoError && (
              <p className="text-xs text-red-500 font-medium">
                {geoError}
              </p>
            )}
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#f8fafc] dark:bg-[#131314]">
            {sortedResultados ? (
              <BuscaResults resultados={sortedResultados} />
            ) : uf && cidade ? (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
                <p className="text-3xl mb-3">{'\uD83D\uDD0D'}</p>
                <p className="font-medium">
                  Nenhuma escola encontrada.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                <p className="text-4xl mb-3 animate-bounce">
                  {'\uD83D\uDDFA\uFE0F'}
                </p>
                <p className="font-semibold text-center">
                  Defina uma UF e Cidade para carregar
                  <br />
                  as escolas no mapa.
                </p>
              </div>
            )}
          </main>
        </div>

        <div className="flex-1 p-4 bg-[#f0f4f9] dark:bg-[#0e0e10] flex flex-col h-full">
          <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800/80 shadow-2xl relative bg-slate-100 dark:bg-[#18181c]">
            <MapaEscolas
              escolas={sortedResultados || []}
              userLocation={userLocation}
              hoveredId={hoveredId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
