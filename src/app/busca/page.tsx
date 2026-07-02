"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ToggleTema from "@/components/toggle-tema";
import MapaEscolas from "@/components/mapa-escolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";

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
  const sp = useSearchParams();
  const supabase = useRef(createClient());
  const [mounted, setMounted] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [ufs, setUfs] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [serieSlug, setSerieSlug] = useState("");
  const [results, setResults] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [viewMap, setViewMap] = useState(false);
  const [showUfDropdown, setShowUfDropdown] = useState(false);
  const [showCidadeDropdown, setShowCidadeDropdown] = useState(false);

  // Restore last search from localStorage
  useEffect(() => {
    const savedLoc = localStorage.getItem("mj_userLocation");
    const savedUf = localStorage.getItem("mj_uf");
    const savedCidade = localStorage.getItem("mj_cidade");
    const savedResults = localStorage.getItem("mj_results");
    if (savedLoc && savedUf && savedCidade && savedResults) {
      setUserLocation(JSON.parse(savedLoc));
    }
  }, []);

  // Load UFs on mount
  useEffect(() => {
    supabase.current.rpc("get_ufs").then(({ data }) => {
      if (data) setUfs(data.map((r: any) => r.uf).filter(Boolean));
    });
    setMounted(true);
  }, []);

  // Load cities when UF changes
  useEffect(() => {
    if (!uf) { setCidades([]); return; }
    supabase.current.rpc("get_cidades", { p_uf: uf }).then(({ data }) => {
      if (data) setCidades(data.map((r: any) => r.municipio).filter(Boolean));
    });
  }, [uf]);

  // Autocomplete suggestions
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

  const doSearch = useCallback(async (q: string) => {
    if (!uf || !cidade) return;
    setLoading(true);
    const { data } = await supabase.current.rpc("buscar_escolas_com_precos", {
      p_uf: uf, p_municipio: cidade, p_serie_slug: serieSlug || null, p_termo: q || null,
    });
    if (data) {
      setResults(data);
      localStorage.setItem("mj_results", JSON.stringify(data));
    }
    setLoading(false);
    setFetched(true);
  }, [uf, cidade, serieSlug]);

  useEffect(() => {
    if (!uf || !cidade || !mounted) return;
    const timer = setTimeout(() => doSearch(query), 300);
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

      const { data } = await supabase.current.rpc("escolas_perto_de_mim", { p_lat: latitude, p_lon: longitude, p_raio_km: 5 });
      if (data) { setResults(data); localStorage.setItem("mj_results", JSON.stringify(data)); }
      setFetched(true);
    } catch (err: any) {
      setGeoError(err.code === 1 ? "Permissão negada." : "Erro ao obter localização.");
    }
    setGeoLoading(false);
  }

  const selectedSerieNome = SERIES.find((s) => s.slug === serieSlug)?.nome || "";

  return (
    <div className="min-h-dvh bg-[#f0f4f9] dark:bg-[#131314] transition-colors">
      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col min-h-dvh">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-base font-semibold text-[#1f1f1f] dark:text-slate-200">
            Mensalidade Justa
          </h1>
          <ToggleTema />
        </div>
        <div className="px-4 pb-3 space-y-2">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">🔍</span>
            <input className="w-full bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
              placeholder="Buscar escola..." value={query} onChange={(e) => setQuery(e.target.value)} />
            {suggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map((s) => (
                  <Link key={s.id} href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
                    className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <div className="font-medium text-[#1f1f1f] dark:text-slate-200 truncate">{s.nome}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{s.municipio} - {s.uf}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <div className="relative">
              <button onClick={() => setShowUfDropdown(!showUfDropdown)}
                className="badge">{uf || "UF ▾"}</button>
              {showUfDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto min-w-[80px]">
                  <button onClick={() => { setUf(""); setShowUfDropdown(false); }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">—</button>
                  {ufs.map((u) => (
                    <button key={u} onClick={() => { setUf(u); setShowUfDropdown(false); }}
                      className={`block w-full text-left px-3 py-1.5 text-xs ${uf === u ? "text-[#3b82f6] font-medium" : "text-[#1f1f1f] dark:text-slate-200"} hover:bg-slate-50 dark:hover:bg-slate-800`}>{u}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setShowCidadeDropdown(!showCidadeDropdown)}
                className="badge" disabled={!uf}>{cidade ? cidade.slice(0, 12) + "..." : "Cidade ▾"}</button>
              {showCidadeDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto min-w-[150px]">
                  <button onClick={() => { setCidade(""); setShowCidadeDropdown(false); }}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">—</button>
                  {cidades.map((c) => (
                    <button key={c} onClick={() => { setCidade(c); setShowCidadeDropdown(false); }}
                      className={`block w-full text-left px-3 py-1.5 text-xs ${cidade === c ? "text-[#3b82f6] font-medium" : "text-[#1f1f1f] dark:text-slate-200"} hover:bg-slate-50 dark:hover:bg-slate-800`}>{c}</button>
                  ))}
                </div>
              )}
            </div>
            <select className="badge text-xs" value={serieSlug} onChange={(e) => setSerieSlug(e.target.value)}>
              <option value="">🎓 Série</option>
              {GRUPOS.map((g) => (
                <optgroup key={g} label={g}>
                  {SERIES.filter((s) => s.grupo === g).map((s) => (
                    <option key={s.slug} value={s.slug}>{s.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button onClick={buscarPertoDeMim} disabled={geoLoading}
              className="badge">{geoLoading ? "📍..." : "📍 Perto de mim"}</button>
          </div>
          {geoError && <p className="text-xs text-red-500">{geoError}</p>}
        </div>

        <div className="flex-1 px-4 pb-4 space-y-2 overflow-y-auto">
          {loading && <p className="text-center text-sm text-slate-400 py-8 animate-pulse">Buscando...</p>}
          {!loading && !fetched && (
            <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p>Selecione UF e Cidade para começar.</p>
            </div>
          )}
          {!loading && fetched && results.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma escola encontrada.</p>
          )}
          {!loading && fetched && results.length > 0 && !viewMap && (
            <ResultList results={results} hoveredId={hoveredId} onHover={setHoveredId} />
          )}
          {viewMap && (
            <div className="h-[70dvh] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <MapaEscolas escolas={results} userLocation={userLocation} hoveredId={hoveredId} />
            </div>
          )}
        </div>

        {fetched && results.length > 0 && (
          <button onClick={() => setViewMap((v) => !v)}
            className="floating-btn fixed bottom-24 right-4 z-10">
            {viewMap ? "📝 Lista" : "📍 Mapa"}
          </button>
        )}
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex h-dvh">
        {/* Left panel */}
        <div className="w-[45%] lg:w-[42%] flex flex-col border-r border-slate-200 dark:border-slate-800">
          <div className="shrink-0 px-6 pt-5 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold text-[#1f1f1f] dark:text-slate-200">
                Mensalidade <span className="bg-gradient-to-r from-[#a855f7] via-[#3b82f6] to-[#f43f5e] bg-clip-text text-transparent">Justa</span>
              </h1>
              <ToggleTema />
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm pointer-events-none text-slate-400">🔍</span>
              <input className="w-full bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1f1f1f] dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
                placeholder="Buscar escola por nome..." value={query} onChange={(e) => setQuery(e.target.value)} />
              {suggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
                  {suggestions.map((s) => (
                    <Link key={s.id} href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
                      className="block px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="font-medium text-[#1f1f1f] dark:text-slate-200 truncate">{s.nome}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{s.municipio} - {s.uf}</div>
                    </Link>
                  ))}
                </div>
              )}
            </form>
            <div className="flex gap-1.5 flex-wrap">
              <div className="relative">
                <button onClick={() => setShowUfDropdown(!showUfDropdown)}
                  className="badge">{uf || "UF ▾"}</button>
                {showUfDropdown && (
                  <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto min-w-[80px]">
                    <button onClick={() => { setUf(""); setShowUfDropdown(false); }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">—</button>
                    {ufs.map((u) => (
                      <button key={u} onClick={() => { setUf(u); setShowUfDropdown(false); }}
                        className={`block w-full text-left px-3 py-1.5 text-xs ${uf === u ? "text-[#3b82f6] font-medium" : "text-[#1f1f1f] dark:text-slate-200"} hover:bg-slate-50 dark:hover:bg-slate-800`}>{u}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setShowCidadeDropdown(!showCidadeDropdown)}
                  className="badge" disabled={!uf}>{cidade || "Cidade ▾"}</button>
                {showCidadeDropdown && (
                  <div className="absolute top-full mt-1 left-0 bg-white dark:bg-[#1e1e1f] border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto min-w-[180px]">
                    <button onClick={() => { setCidade(""); setShowCidadeDropdown(false); }}
                      className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400">—</button>
                    {cidades.map((c) => (
                      <button key={c} onClick={() => { setCidade(c); setShowCidadeDropdown(false); }}
                        className={`block w-full text-left px-3 py-1.5 text-xs ${cidade === c ? "text-[#3b82f6] font-medium" : "text-[#1f1f1f] dark:text-slate-200"} hover:bg-slate-50 dark:hover:bg-slate-800`}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
              <select className="badge text-xs" value={serieSlug} onChange={(e) => setSerieSlug(e.target.value)}>
                <option value="">🎓 Série</option>
                {GRUPOS.map((g) => (
                  <optgroup key={g} label={g}>
                    {SERIES.filter((s) => s.grupo === g).map((s) => (
                      <option key={s.slug} value={s.slug}>{s.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button onClick={buscarPertoDeMim} disabled={geoLoading}
                className="badge">{geoLoading ? "📍..." : "📍 Perto de mim"}</button>
            </div>
            {geoError && <p className="text-xs text-red-500">{geoError}</p>}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
            {loading && <p className="text-center text-sm text-slate-400 py-8 animate-pulse">Buscando...</p>}
            {!loading && !fetched && (
              <div className="flex flex-col items-center justify-center h-full text-sm text-slate-400 dark:text-slate-500">
                <p className="text-4xl mb-3">🔍</p>
                <p>Selecione UF e Cidade<br />para explorar escolas.</p>
              </div>
            )}
            {!loading && fetched && results.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-8">Nenhuma escola encontrada.</p>
            )}
            {!loading && fetched && results.length > 0 && (
              <ResultList results={results} hoveredId={hoveredId} onHover={setHoveredId} />
            )}
          </div>
        </div>

        {/* Right panel - Map */}
        <div className="flex-1 bg-[#e8eaed] dark:bg-[#1a1a1b]">
          <MapaEscolas escolas={results} userLocation={userLocation} hoveredId={hoveredId} />
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
        <Link key={escola.id} href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
          className="block bg-white dark:bg-[#1e1e1f] border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 transition-all hover:border-[#3b82f6]/30 hover:shadow-sm"
          onMouseEnter={() => onHover(escola.id)} onMouseLeave={() => onHover(null)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-[#1f1f1f] dark:text-slate-200 truncate leading-snug">
                {escola.nome}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {escola.bairro && `${escola.bairro}, `}{escola.municipio} - {escola.uf}
              </p>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              escola.dependencia_administrativa === "Privada"
                ? "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
            }`}>
              {escola.dependencia_administrativa === "Privada" ? "Privada" : "Pública"}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between gap-2">
              {escola.valor_mensalidade != null ? (
                <p className="text-xs font-semibold text-[#3b82f6] dark:text-[#60a5fa]">
                  R$ {Number(escola.valor_mensalidade).toFixed(2)}/mês
                </p>
              ) : (
                <p className="text-xs text-slate-400">Mensalidade: —</p>
              )}
              {escola.distancia_km !== undefined && (
                <p className="text-xs text-slate-400">{escola.distancia_km} km</p>
              )}
            </div>
            {(escola.valor_matricula != null || escola.valor_material != null) && (
              <div className="flex gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                {escola.valor_matricula != null && <span>Matrícula: R$ {Number(escola.valor_matricula).toFixed(2)}</span>}
                {escola.valor_material != null && <span>Material: R$ {Number(escola.valor_material).toFixed(2)}</span>}
              </div>
            )}
          </div>
        </Link>
      ))}
    </>
  );
}

export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Carregando...</div>}>
      <BuscaContent />
    </Suspense>
  );
}
