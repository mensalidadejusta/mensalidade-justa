"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ToggleTema from "@/components/toggle-tema";
import MapaEscolas from "@/components/mapa-escolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";
import SearchableSelect from "@/components/searchable-select";

type Escola = {
  id: number; nome: string; uf: string; municipio: string;
  bairro: string | null; dependencia_administrativa: string;
  latitude: number | null; longitude: number | null; codigo_inep: string;
  distancia_km?: number;
  valor_mensalidade?: number | null;
  valor_matricula?: number | null;
  valor_material?: number | null;
};

function BuscaContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useRef(createClient());
  const [mounted, setMounted] = useState(false);

  // Estados sincronizados inicialmente com a URL (Melhoria de SEO)
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [uf, setUf] = useState(searchParams.get("uf") || "");
  const [cidade, setCidade] = useState(searchParams.get("cidade") || "");
  const [serieSlug, setSerieSlug] = useState(searchParams.get("serie") || "");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ufs, setUfs] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [results, setResults] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [viewMap, setViewMap] = useState(false);

  // Sincroniza os estados com a URL para permitir compartilhamento e indexação de links
  const updateQueryParams = useCallback((filters: { q?: string; uf?: string; cidade?: string; serie?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Carregar dados iniciais e recuperar LocalStorage se a URL estiver vazia
  useEffect(() => {
    setMounted(true);
    supabase.current.rpc("get_ufs").then(({ data }) => {
      if (data) setUfs(data.map((r: any) => r.uf).filter(Boolean));
    });

    if (!searchParams.get("uf") && !searchParams.get("cidade")) {
      const savedLoc = localStorage.getItem("mj_userLocation");
      const savedUf = localStorage.getItem("mj_uf");
      const savedCidade = localStorage.getItem("mj_cidade");
      if (savedUf) setUf(savedUf);
      if (savedCidade) setCidade(savedCidade);
      if (savedLoc) {
        const loc = JSON.parse(savedLoc);
        setUserLocation(loc);
        // Re-order cached results by distance from saved location
        const savedJson = localStorage.getItem("mj_results");
        if (savedJson) {
          try {
            const arr = JSON.parse(savedJson);
            const R = 6371;
            arr.forEach((e: any) => {
              if (e.latitude && e.longitude) {
                const dLat = (loc.lat - e.latitude) * Math.PI / 180;
                const dLon = (loc.lon - e.longitude) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(e.latitude * Math.PI / 180) * Math.cos(loc.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                e.distancia_km = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
              }
            });
            arr.sort((a: any, b: any) => (a.distancia_km || 999) - (b.distancia_km || 999));
            setResults(arr);
          } catch {}
        }
      }
    }
  }, [searchParams]);

  // Carregar cidades quando UF mudar
  useEffect(() => {
    if (!uf) { setCidades([]); return; }
    supabase.current.rpc("get_cidades", { p_uf: uf }).then(({ data }) => {
      if (data) setCidades(data.map((r: any) => r.municipio).filter(Boolean));
    });
  }, [uf]);

  // Autocomplete de Sugestões
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.current
        .from("escolas")
        .select("id, nome, municipio, uf, codigo_inep")
        .ilike("nome", `%${query}%`)
        .order("nome")
        .limit(6);
      if (data) setSuggestions(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Haversine: calcula distância em km entre duas coordenadas
  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Ordena resultados por distância quando userLocation está disponível
  function sortByDistance(arr: any[]) {
    if (!userLocation) return arr;
    return arr
      .map((e: any) => {
        if (e.latitude && e.longitude) {
          e.distancia_km = Math.round(haversine(userLocation.lat, userLocation.lon, e.latitude, e.longitude) * 100) / 100;
        }
        return e;
      })
      .sort((a: any, b: any) => {
        if (!a.distancia_km) return 1;
        if (!b.distancia_km) return -1;
        return a.distancia_km - b.distancia_km;
      });
  }

  // Função principal de busca
  const doSearch = useCallback(async (q: string, currentUf: string, currentCidade: string, currentSerie: string) => {
    if (!currentUf || !currentCidade) return;
    setLoading(true);
    
    // Atualiza a URL para o robô do Google poder ler os filtros aplicados
    updateQueryParams({ q, uf: currentUf, cidade: currentCidade, serie: currentSerie });

    const { data } = await supabase.current.rpc("buscar_escolas_com_precos", {
      p_uf: currentUf, p_municipio: currentCidade, p_serie_slug: currentSerie || null, p_termo: q || null,
    });
    if (data) {
      const ordenado = sortByDistance(data);
      setResults(ordenado);
      localStorage.setItem("mj_results", JSON.stringify(ordenado));
    }
    setLoading(false);
    setFetched(true);
  }, [updateQueryParams, userLocation]);

  // Debounce para digitação ou troca de filtros
  useEffect(() => {
    if (!uf || !cidade || !mounted) return;
    const timer = setTimeout(() => doSearch(query, uf, cidade, serieSlug), 300);
    return () => clearTimeout(timer);
  }, [query, uf, cidade, serieSlug, mounted, doSearch]);

  async function buscarPertoDeMim() {
    if (!navigator.geolocation) { setGeoError("Geolocalização não suportada."); return; }
    setGeoLoading(true); setGeoError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
        });
      });
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
      const cid = a.city || a.town || a.village || a.municipality || "";
      const est = a["ISO3166-2-lvl4"]?.replace("BR-", "") || a.state?.slice(0, 2) || "";
      if (!est || !cid) { setGeoError("Não foi possível identificar sua cidade."); return; }

      setUf(est);
      const { data: raw } = await supabase.current.rpc("get_cidades", { p_uf: est });
      const lista: string[] = raw ? raw.map((r: any) => r.municipio).filter(Boolean) : [];
      setCidades(lista);
      const match = lista.includes(cid) ? cid : lista.find((c) =>
        c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ===
        cid.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      ) || cid;
      
      setCidade(match);
      localStorage.setItem("mj_uf", est);
      localStorage.setItem("mj_cidade", match);
      doSearch(query, est, match, serieSlug);
    } catch (err: any) {
      setGeoError(err.code === 1 ? "Permissão negada." : "Erro ao obter localização.");
    }
    setGeoLoading(false);
  }

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
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">🔍</span>
            <input className="w-full bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700/60 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400/80 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all shadow-sm"
              placeholder="Buscar escola..." value={query} onChange={(e) => setQuery(e.target.value)} />
            
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl z-20 overflow-hidden backdrop-blur-md">
                {suggestions.map((s) => (
                  <Link key={s.id} href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
                    className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/40 last:border-0 transition-colors">
                    <div className="font-medium text-[#1f1f1f] dark:text-slate-200 truncate">{s.nome}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{s.municipio} - {s.uf}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1.5 flex-wrap">
            <SearchableSelect label="UF" value={uf} options={ufs} onChange={(v) => { setUf(v); setCidade(""); }} placeholder="UF" />
            <SearchableSelect label="Cidade" value={cidade} options={cidades} onChange={setCidade} placeholder="Cidade" disabled={!uf} />

            <SearchableSelect label="🎓 Série" value={serieSlug} series={SERIES} grupos={GRUPOS} onChange={setSerieSlug} />

            <button onClick={buscarPertoDeMim} disabled={geoLoading} className="badge transition-all active:scale-95">{geoLoading ? "📍..." : "📍 Perto de mim"}</button>
          </div>
          {geoError && <p className="text-xs text-red-500 font-medium">{geoError}</p>}
        </div>

        <main className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
          {loading && <p className="text-center text-sm text-slate-400 py-8 animate-pulse">Buscando escolas premium...</p>}
          {!loading && !fetched && (
            <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="font-medium">Selecione uma localização para iniciar.</p>
            </div>
          )}
          {!loading && fetched && results.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma escola cadastrada nesta região.</p>
          )}
          {!loading && fetched && results.length > 0 && !viewMap && (
            <ResultList results={results} hoveredId={hoveredId} onHover={setHoveredId} />
          )}
          {viewMap && (
            <div className="h-[68dvh] rounded-2xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800/80">
              <MapaEscolas escolas={results} userLocation={userLocation} hoveredId={hoveredId} />
            </div>
          )}
        </main>

        {fetched && results.length > 0 && (
          <button onClick={() => setViewMap((v) => !v)} className="floating-btn fixed bottom-6 right-4 z-30 shadow-xl font-medium tracking-wide active:scale-95 transition-transform">
            {viewMap ? "📝 Exibir Lista" : "📍 Ver no Mapa"}
          </button>
        )}
      </div>

      {/* ===== DESKTOP (Layout Avançado Estilo Gemini) ===== */}
      <div className="hidden md:flex h-dvh overflow-hidden">
        {/* Painel Esquerdo */}
        <div className="w-[43%] lg:w-[38%] flex flex-col bg-white dark:bg-[#1c1c1e] shadow-2xl z-10 border-r border-slate-200/60 dark:border-slate-800/60">
          <header className="shrink-0 px-6 pt-6 pb-4 space-y-4 border-b border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-[#1f1f1f] dark:text-slate-100 tracking-tight">
                Mensalidade <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent font-extrabold">Justa</span>
              </h1>
              <ToggleTema />
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">🔍</span>
              <input className="w-full bg-[#f0f4f9] dark:bg-[#2c2c2e] border-0 rounded-2xl py-3 pl-11 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                placeholder="Buscar escola por nome..." value={query} onChange={(e) => setQuery(e.target.value)} />
              
              {suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                  {suggestions.map((s) => (
                    <Link key={s.id} href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
                      className="block px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-[#3a3a3c] border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
                      <div className="font-semibold text-[#1f1f1f] dark:text-slate-200 truncate">{s.nome}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{s.municipio} - {s.uf}</div>
                    </Link>
                  ))}
                </div>
              )}
            </form>

            <div className="flex gap-1.5 flex-wrap">
              <SearchableSelect label="UF" value={uf} options={ufs} onChange={(v) => { setUf(v); setCidade(""); }} placeholder="UF" />
              <SearchableSelect label="Cidade" value={cidade} options={cidades} onChange={setCidade} placeholder="Cidade" disabled={!uf} />

              <SearchableSelect label="🎓 Série" value={serieSlug} series={SERIES} grupos={GRUPOS} onChange={setSerieSlug} />

              <button onClick={buscarPertoDeMim} disabled={geoLoading} className="badge hover:bg-blue-50 dark:hover:bg-blue-950/40">{geoLoading ? "📍 Calculando..." : "📍 Perto de mim"}</button>
            </div>
            {geoError && <p className="text-xs text-red-500 font-medium">{geoError}</p>}
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#f8fafc] dark:bg-[#131314]">
            {loading && <p className="text-center text-sm text-slate-400 py-12 animate-pulse font-medium">Buscando a melhor mensalidade...</p>}
            {!loading && !fetched && (
              <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                <p className="text-4xl mb-3 animate-bounce">🗺️</p>
                <p className="font-semibold text-center">Defina uma UF e Cidade para carregar<br />as escolas no mapa.</p>
              </div>
            )}
            {!loading && fetched && results.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-12 font-medium">Nenhuma escola correspondente.</p>
            )}
            {!loading && fetched && results.length > 0 && (
              <ResultList results={results} hoveredId={hoveredId} onHover={setHoveredId} />
            )}
          </main>
        </div>

        {/* Painel do Mapa Otimizado (Design Premium Gemini) */}
        <div className="flex-1 p-4 bg-[#f0f4f9] dark:bg-[#0e0e10] flex flex-col h-full">
          <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200/70 dark:border-slate-800/80 shadow-2xl relative bg-slate-100 dark:bg-[#18181c]">
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800 animate-pulse text-sm text-slate-400">Carregando mapa interativo...</div>}>
              <MapaEscolas escolas={results} userLocation={userLocation} hoveredId={hoveredId} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultList({ results, hoveredId, onHover }: {
  results: Escola[]; hoveredId: number | null; onHover: (id: number | null) => void;
}) {
  return (
    <>
      {results.map((escola) => (
        <article key={escola.id}>
          <Link href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
            className={`block bg-white dark:bg-[#1e1e1f] border rounded-2xl p-4 transition-all duration-200 hover:shadow-md ${
              hoveredId === escola.id 
                ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md transform -translate-y-0.5" 
                : "border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700"
            }`}
            onMouseEnter={() => onHover(escola.id)} onMouseLeave={() => onHover(null)}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-[#1f1f1f] dark:text-slate-100 tracking-tight leading-snug truncate">
                  {escola.nome}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  {escola.bairro && `${escola.bairro}, `}{escola.municipio} - {escola.uf}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                escola.dependencia_administrativa === "Privada"
                  ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
              }`}>
                {escola.dependencia_administrativa === "Privada" ? "Privada" : "Pública"}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                {escola.valor_mensalidade != null ? (
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    R$ {Number(escola.valor_mensalidade).toFixed(2)}<span className="text-[10px] text-slate-400 font-normal"> /mês</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">Mensalidade sob consulta</p>
                )}
                {escola.distancia_km !== undefined && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">📍 {escola.distancia_km} km</p>
                )}
              </div>
              {(escola.valor_matricula != null || escola.valor_material != null) && (
                <div className="flex gap-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {escola.valor_matricula != null && <span>Matrícula: <strong className="text-slate-600 dark:text-slate-300">R$ {Number(escola.valor_matricula).toFixed(2)}</strong></span>}
                  {escola.valor_material != null && <span>Material: <strong className="text-slate-600 dark:text-slate-300">R$ {Number(escola.valor_material).toFixed(2)}</strong></span>}
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}
    </>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-slate-400 font-medium animate-pulse">Iniciando motor de busca...</div>}>
      <BuscaContent />
    </Suspense>
  );
}