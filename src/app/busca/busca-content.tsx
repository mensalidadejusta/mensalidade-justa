"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search, Map, MapPin, ChevronRight, ArrowLeft, Star, EyeOff, TrendingUp,
  Navigation, DollarSign, GraduationCap, List, Maximize2, Minimize2,
} from "lucide-react";
import MapaEscolas from "@/components/mapa-escolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";
import SearchableSelect from "@/components/searchable-select";
import BuscaResults from "./busca-results";
import type { EscolaResult } from "./busca-results";

type ScreenState = "initial" | "results";

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
  const searchRef = useRef<HTMLDivElement>(null);

  const [localQuery, setLocalQuery] = useState(searchParams.get("q") ?? "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [ufs, setUfs] = useState<string[]>(initialUfs);
  const [cidades, setCidades] = useState<string[]>(initialCidades);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [screenState, setScreenState] = useState<ScreenState>("initial");
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
        if (data) setUfs(data.map((r: any) => r.uf).filter(Boolean));
      });
    }
  }, []);

  useEffect(() => {
    if (uf && cidades.length === 0) {
      supabase.current.rpc("get_cidades", { p_uf: uf }).then(({ data }) => {
        if (data) setCidades(data.map((r: any) => r.municipio).filter(Boolean));
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

  useEffect(() => {
    if (suggestions.length === 0) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current?.contains(e.target as Node)) return;
      setSuggestions([]);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [suggestions]);

  function triggerSearch() {
    if (uf && cidade) setScreenState("results");
    else setScreenState("results");
  }

  async function buscarPertoDeMim() {
    if (!navigator.geolocation) {
      setGeoError("Geolocaliza\u00e7\u00e3o n\u00e3o suportada.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
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
      const est =
        a["ISO3166-2-lvl4"]?.replace("BR-", "") || a.state?.slice(0, 2) || "";
      if (!est || !cid) {
        setGeoError("N\u00e3o foi poss\u00edvel identificar sua cidade.");
        return;
      }

      const { data: raw } = await supabase.current.rpc("get_cidades", { p_uf: est });
      const lista: string[] = raw
        ? raw.map((r: any) => r.municipio).filter(Boolean)
        : [];
      setCidades(lista);
      const match =
        lista.includes(cid)
          ? cid
          : lista.find(
              (c) =>
                c.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ===
                cid.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
            ) || cid;

      localStorage.setItem("mj_uf", est);
      localStorage.setItem("mj_cidade", match);
      updateFilters({ uf: est, cidade: match, q: localQuery });
      setScreenState("results");
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
  const hasUfCidade = uf && cidade;

  const logo = (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-[24px] font-bold bg-gradient-to-r from-[#ddb7ff] to-[#a855f7] bg-clip-text text-transparent">
        Mensalidade Justa
      </span>
    </div>
  );

  const buscaInput = (
    <div className="relative w-full" ref={searchRef}>
      <div className="bg-[#16161a] border border-[#26262b] rounded-xl p-2 flex items-center gap-3 transition-all duration-300 focus-within:border-[#ddb7ff] focus-within:ring-2 focus-within:ring-[#ddb7ff]/20">
        <div className="pl-3 flex items-center text-[#988d9f] transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input
          className="bg-transparent border-none focus:ring-0 text-[16px] w-full placeholder:text-[#988d9f]/50 text-[#eadfed] outline-none"
          placeholder="Nome da escola, bairro ou cidade..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") triggerSearch();
          }}
        />
        <button
          onClick={buscarPertoDeMim}
          disabled={geoLoading}
          className="flex items-center gap-2 bg-[#b76dff]/10 hover:bg-[#b76dff]/20 text-[#a855f7] px-4 py-2 rounded-lg transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
        >
          <Map className="w-5 h-5" />
          <span className="text-[12px] font-bold uppercase tracking-wider">
            {geoLoading ? "..." : "Perto de mim"}
          </span>
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#16161a] border border-[#26262b] rounded-2xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/escola/${makeEscolaSlug(s.codigo_inep, s.nome)}`}
              className="block px-4 py-3 text-sm hover:bg-[#1f1a23] border-b border-[#26262b] last:border-0 transition-all duration-200"
            >
              <div className="font-medium text-[#eadfed] truncate">{s.nome}</div>
              <div className="text-xs text-[#988d9f] mt-0.5">
                {s.municipio} - {s.uf}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const resultadoHeader = (
    <div>
      <button
        onClick={() => setScreenState("initial")}
        className="flex items-center gap-2 text-[#ddb7ff] mb-4 hover:opacity-80 transition-opacity"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-[12px] font-bold uppercase tracking-wider">Voltar para busca</span>
      </button>
      <h2 className="text-[24px] font-semibold text-[#eadfed]">
        Resultados {cidade ? `em ${cidade}` : ""}
      </h2>
      <p className="text-[14px] text-[#988d9f]">
        {sortedResultados ? `Encontramos ${sortedResultados.length} escola${sortedResultados.length !== 1 ? "s" : ""}${hasUfCidade ? "" : ""}` : ""}
      </p>
    </div>
  );

  const pageZero = (
    <div className="space-y-8">
      <div>
        <h1 className="text-[40px] font-bold tracking-[-0.02em] text-[#eadfed] max-w-md leading-[1.1] mb-4">
          Encontre a escola ideal para o futuro que voc{'\u00ea'} acredita.
        </h1>
        <p className="text-[16px] text-[#988d9f] max-w-sm leading-relaxed">
          Compare mensalidades, infraestrutura e avalia{'\u00e7'}{'\u00f5'}es reais de milhares de institui{'\u00e7'}{'\u00f5'}es brasileiras.
        </p>
      </div>

      <div
        onClick={() => {
          if (uf && cidade) setScreenState("results");
          else {
            const savedUf = localStorage.getItem("mj_uf");
            const savedCidade = localStorage.getItem("mj_cidade");
            if (savedUf && savedCidade) {
              updateFilters({ uf: savedUf, cidade: savedCidade });
              setScreenState("results");
            }
          }
        }}
        className="bg-[#16161a] border border-[#26262b] rounded-xl p-6 flex items-center justify-between group hover:border-[#ddb7ff]/50 hover:bg-[#1f1a23] transition-all cursor-pointer shadow-lg shadow-black/20"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-[#231e27] flex items-center justify-center border border-[#26262b] group-hover:scale-110 transition-transform">
            <MapPin className="text-[#ddb7ff] w-8 h-8" />
          </div>
          <div>
            <p className="text-[12px] font-medium text-[#988d9f] uppercase tracking-[0.1em] mb-1">Sua regi{'\u00e3'}o atual</p>
            <p className="text-[20px] font-semibold text-[#eadfed]">
              {uf && cidade ? `${cidade} \u2014 ${uf}` : "Defina sua localiza\u00e7\u00e3o"}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#988d9f] group-hover:text-[#ddb7ff] group-hover:bg-[#ddb7ff]/10 transition-all">
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      <div>
        <p className="text-[12px] font-bold text-[#988d9f] uppercase tracking-widest mb-4">Buscas frequentes</p>
        <div className="flex flex-wrap gap-3">
          {["Educa\u00e7\u00e3o Infantil", "Ensino M\u00e9dio", "Escolas Privadas", "Bil\u00edngues"].map((label) => (
            <button
              key={label}
              onClick={() => {
                const slugMap: Record<string, string> = {
                  "Educa\u00e7\u00e3o Infantil": "pre-1",
                  "Ensino M\u00e9dio": "1-ano-ensino-medio",
                };
                if (slugMap[label]) updateFilters({ serie: slugMap[label] });
                if (label === "Escolas Privadas") updateFilters({ privada: "1", publica: "0" });
                if (hasUfCidade) setScreenState("results");
              }}
              className="bg-[#16161a] border border-[#26262b] px-5 py-2.5 rounded-full text-[12px] font-medium hover:border-[#ddb7ff] hover:text-[#ddb7ff] transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const resultsList = (
    <div className="space-y-4">
      {sortedResultados?.map((escola) => {
        const isPrivada = escola.dependencia_administrativa === "Privada";
        return (
          <Link
            key={escola.id}
            href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
            className="block bg-[#16161a] border border-[#26262b] rounded-xl p-4 hover:border-[#ddb7ff]/30 transition-all cursor-pointer group"
            onMouseEnter={() => setHoveredId(escola.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-[#231e27] rounded-lg border border-[#26262b] overflow-hidden shrink-0">
                <img
                  src={`https://lh3.googleusercontent.com/aida-public/AB6AXuA_v68gvoNU0rUqzG5N66ExRVgDRUEvTO0di-vbB8Tn3BJdW-X67fXVPpFC6Z0G7U5dLDjq7To8KaWb0Hg-GD7bHSZtY1f3UPB9OdqwK_PdWLk3__c20PXE8fOpKdKhqTiN9NAvgg83d9Tger8xRFaRT6d6wMc2mnjbhu0OxdylMiIocVRzwKoDCvX0EEfBuKjdCQPkF1BxhkH28bNDyim0wenWbu6UiNww9CCAo_MACRS1qpso2z7DUtp9-O-9e9k_WU9goFjYLa8`}
                  alt={escola.nome}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="text-[16px] font-bold text-[#eadfed] truncate">{escola.nome}</h3>
                  {isPrivada ? (
                    <span className="text-[16px] font-bold text-[#ddb7ff] shrink-0">
                      R${' '}
                      {(() => {
                        if (!escola.series_precos?.length) return "\u2014";
                        const precos = escola.series_precos
                          .map((s) => Number(s.valor_mensalidade))
                          .filter((v) => !isNaN(v));
                        if (!precos.length) return "\u2014";
                        const media = precos.reduce((a, b) => a + b, 0) / precos.length;
                        return media.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
                      })()}
                      /m{'\u00ea'}s
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-[#00a572]/10 text-[#4edea3] text-[10px] font-bold rounded border border-[#00a572]/20 uppercase shrink-0">
                      Ensino Gratuito
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#988d9f] mb-2 truncate">
                  {escola.bairro ? `${escola.bairro}, ` : ""}
                  {escola.municipio}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[#fabc4e]">
                    <Star className="w-[14px] h-[14px] fill-current" />
                    <span className="text-[12px] font-bold">{"\u2014"}</span>
                  </div>
                  <span className="text-[#26262b]">|</span>
                  <span className="text-[12px] text-[#988d9f]">
                    {isPrivada ? "Mensalidade m\u00e9dia" : `Depend\u00eancia: ${escola.dependencia_administrativa}`}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  return (
    <div className="min-h-dvh bg-[#0d0d0d] text-[#eadfed] overflow-hidden h-screen">
      {/* ===== MOBILE ===== */}
      <div className="md:hidden flex flex-col h-full bg-[#0d0d0d]">
        <div className="sticky top-0 z-40 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-[#26262b]/50 px-4 pt-3 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setScreenState("initial")}
              className="text-[#ddb7ff] hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold bg-gradient-to-r from-[#ddb7ff] to-[#a855f7] bg-clip-text text-transparent shrink-0">
              MJ
            </span>
          </div>
          {buscaInput}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20 pt-4">
          {screenState === "initial" ? pageZero : resultsList}
        </div>
      </div>

      {/* ===== DESKTOP ===== */}
      <div className="hidden md:flex h-screen w-full">
        {/* LEFT PANEL */}
        <section
          className="h-full bg-[#0d0d0d] flex flex-col relative z-20 border-r border-[#26262b] transition-all duration-300"
          style={{ width: showMap ? "55vw" : "100vw" }}
        >
          <nav className="flex flex-col h-full p-[32px]">
            <header className="mb-6">
              {logo}
              {screenState === "initial" ? (
                <div>
                  <h1 className="text-[40px] font-bold tracking-[-0.02em] text-[#eadfed] max-w-md leading-[1.1] mb-4">
                    Encontre a escola ideal para o futuro que voc{'\u00ea'} acredita.
                  </h1>
                  <p className="text-[16px] text-[#988d9f] max-w-sm leading-relaxed">
                    Compare mensalidades, infraestrutura e avalia{'\u00e7'}{'\u00f5'}es reais de milhares de institui{'\u00e7'}{'\u00f5'}es brasileiras.
                  </p>
                </div>
              ) : (
                resultadoHeader
              )}
            </header>

            <div className="mb-6">{buscaInput}</div>

            <div className="flex-grow overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#26262b transparent" }}>
              {screenState === "initial" ? pageZero : resultsList}
            </div>

            <footer className="mt-6 pt-6 border-t border-[#26262b] flex items-center justify-between">
              <p className="text-[10px] font-bold text-[#988d9f]/60 uppercase tracking-widest">
                {ufs.length > 0 ? `${ufs.length} UFs dispon\u00edveis` : "212k+ Escolas catalogadas"}
              </p>
              <div className="flex gap-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                <span className="text-[10px] font-bold text-[#4edea3] uppercase tracking-widest">Sistema Online</span>
              </div>
            </footer>
          </nav>
        </section>

        {/* RIGHT PANEL — MAP */}
        {showMap && (
          <section className="w-[45vw] h-full relative overflow-hidden bg-[#0d0d0d]">
            {/* Background pattern */}
            <div className="absolute inset-0 z-0 opacity-40">
              <div
                className="w-full h-full bg-[#0d0d0d]"
                style={{
                  backgroundImage: "radial-gradient(#26262b 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              {hasResults && sortedResultados ? (
                <div className="absolute inset-0 w-full h-full">
                  <MapaEscolas
                    escolas={sortedResultados}
                    userLocation={userLocation}
                    hoveredId={hoveredId}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <p className="text-[#988d9f] text-sm">Selecione uma localiza{'\u00e7'}{'\u00e3'}o para ver o mapa</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowMap(false)}
              className="absolute top-[32px] right-[32px] z-10 bg-[#16161a]/80 backdrop-blur-md border border-[#26262b] text-[#eadfed] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#16161a] transition-all shadow-xl active:scale-95"
            >
              <EyeOff className="w-[18px] h-[18px]" />
              <span className="text-[12px] font-bold uppercase tracking-wider">Ocultar Mapa</span>
            </button>

            {/* Floating tooltip */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 w-[80%]">
              <div className="bg-[#16161a] border border-[#26262b] p-4 rounded-xl shadow-2xl flex items-center gap-4">
                <div className="p-3 bg-[#4edea3]/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-[#4edea3]" />
                </div>
                <div>
                  <h4 className="text-[12px] font-bold text-[#988d9f] uppercase tracking-widest">Destaque na Regi{'\u00e3'}o</h4>
                  <p className="text-[16px] text-[#eadfed]">
                    {hasResults && sortedResultados && sortedResultados.length > 0
                      ? sortedResultados[0].nome
                      : "Nenhum destaque dispon\u00edvel"}
                    {sortedResultados?.[0]?.series_precos?.length ? (
                      <span className="text-[#4edea3] font-bold ml-1">
                        {'\u2022'} {sortedResultados[0].series_precos.length} pre{'\u00e7'}os
                      </span>
                    ) : hasResults && sortedResultados?.[0] ? (
                      <span className="text-[#4edea3] font-bold ml-1">{'\u2022'} Gratuita</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Show map button when hidden */}
        {!showMap && (
          <button
            onClick={() => setShowMap(true)}
            className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium bg-[#16161a] border border-[#26262b] text-[#eadfed] shadow-2xl hover:bg-[#1f1a23] hover:border-[#ddb7ff]/40 transition-all duration-300 active:scale-95"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider">Ver Mapa</span>
          </button>
        )}
      </div>
    </div>
  );
}
