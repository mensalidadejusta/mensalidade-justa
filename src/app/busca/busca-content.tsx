"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DollarSign, GraduationCap, MapPin, Crosshair, Loader2, User, LogIn, LogOut, Info } from "lucide-react";
import MapaEscolas from "@/components/MapaEscolas";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";
import SearchableSelect from "@/components/SearchableSelect";
import CaixaBuscaLocalizacao from "@/components/CaixaBuscaLocalizacao";
import BuscaResults from "./busca-results";
import type { EscolaResult } from "./busca-results";
import type { FiltroLocalizacao } from "@/components/CaixaBuscaLocalizacao";
import SchemaEscolas from "@/components/SchemaEscolas";
import BotaoTema from "@/components/BotaoTema";
import { useAuth } from "@/lib/auth-context";

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
  const boundsCache = useRef<Map<string, EscolaResult[]>>(new Map());
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [activeTile, setActiveTile] = useState("Padr\u00e3o");
  const [layersOpen, setLayersOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState<"estado" | "cidade" | "escola">("estado");
  const [isMenuAberto, setIsMenuAberto] = useState(false);
  const { user } = useAuth();

  async function handleLogout() {
    const client = supabase.current;
    await client.auth.signOut();
    setIsMenuAberto(false);
  }

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

      setMapCenter({ lat: latNum, lon: lonNum });

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

  function handleLocationSelect(loc: { label: string; slug: string; lat: number; lng: number }) {
    setMapCenter({ lat: loc.lat, lon: loc.lng });
    const novosParams = new URLSearchParams(window.location.search);
    novosParams.set("cidade", loc.slug);
    novosParams.set("lat", loc.lat.toString());
    novosParams.set("lon", loc.lng.toString());
    router.replace(`${pathname}?${novosParams.toString()}`, { scroll: false });
    setNavTick((n) => n + 1);
    setCarregandoCoordenadas(true);
    (async () => {
      try {
        const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
          p_lat: loc.lat, p_lon: loc.lng, p_raio_km: 50,
        });
        const mapped = (data || []).map((item: any) => ({
          ...item, distancia_km: item.distancia_km ?? undefined,
          etapas_modalidades: item.etapas_modalidades ?? null,
        })) as EscolaResult[];
        setResultadosCoordenadas(mapped);
        setUserLocation({ lat: loc.lat, lon: loc.lng });
      } catch { setResultadosCoordenadas([]); }
      setCarregandoCoordenadas(false);
    })();
  }

  async function handleLocationChange(filtro: FiltroLocalizacao) {
    setFiltroLoc(filtro);

    if (filtro.latitude != null && filtro.longitude != null) {
      setMapCenter({ lat: filtro.latitude, lon: filtro.longitude });
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
      const novosParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      novosParams.set("uf", filtro.uf);
      novosParams.set("cidade", filtro.cidade);
      novosParams.delete("lat");
      novosParams.delete("lon");
      router.replace(`${pathname}?${novosParams.toString()}`);
      setNavTick((n) => n + 1);
      setResultadosCoordenadas(null);
      return;
    }

    if (filtro.buscaRaw) {
      let cidade = "", uf = "";
      try {
        const raw: any = await supabase.current.rpc("buscar_cidades", { p_termo: filtro.buscaRaw });
        if (raw.data?.length) { cidade = raw.data[0].cidade; uf = raw.data[0].uf; }
      } catch {}
      if (cidade && uf) {
        const novosParams = new URLSearchParams(window.location.search);
        novosParams.set("uf", uf);
        novosParams.set("cidade", cidade);
        novosParams.delete("lat");
        novosParams.delete("lon");
        router.replace(`${pathname}?${novosParams.toString()}`);
        setNavTick((n) => n + 1);
        setResultadosCoordenadas(null);
      } else {
        const novosParams = new URLSearchParams(window.location.search);
        novosParams.set("q", filtro.buscaRaw);
        router.replace(`${pathname}?${novosParams.toString()}`);
        setNavTick((n) => n + 1);
        setResultadosCoordenadas(null);
      }
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
        const slugToGrupo = new Map<string, string>(SERIES.map((s) => [s.slug, s.grupo]));
        const grupoSet = new Set<string>();
        for (const s of slugs) {
          const g = slugToGrupo.get(s);
          if (g) grupoSet.add(g);
        }
        const termoBusca: string[] = [];
        for (const g of grupoSet) {
          const lower = g.toLowerCase();
          if (lower.startsWith("ensino fundamental")) termoBusca.push("ensino fundamental");
          else if (lower.startsWith("educação infantil")) termoBusca.push("educação infantil");
          else if (lower.startsWith("ensino médio")) termoBusca.push("ensino médio");
          else termoBusca.push(lower);
        }
        filtrado = filtrado.filter((e) => {
          if (!e.etapas_modalidades) return false;
          const etapas = e.etapas_modalidades.toLowerCase();
          return termoBusca.some((t) => etapas.includes(t));
        });
      }
    }

    if (localQuery) {
      const termo = localQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      filtrado = filtrado.filter((e) => {
        const nome = e.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return nome.includes(termo);
      });
    }

    return filtrado;
  }, [resultados, resultadosCoordenadas, showPrivada, showPublica, serieSlug, localQuery]);

  const sortedResultados = useMemo(
    () => (dadosExibir ? sortResults(dadosExibir, userLocation) : null),
    [dadosExibir, userLocation]
  );

  const exibirCards = false; // ← ativar quando o ranking estiver pronto
  const hasResults = sortedResultados && sortedResultados.length > 0;

  const handleHover = useCallback((id: number | null) => {
    setHoveredId(id);
  }, []);

  const handleMapBoundsChange = useCallback(async (bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => {
    const cacheKey = `${bounds.minLat.toFixed(1)}-${bounds.minLon.toFixed(1)}-${bounds.maxLat.toFixed(1)}-${bounds.maxLon.toFixed(1)}`;
    const cached = boundsCache.current.get(cacheKey);
    if (cached) { setResultadosCoordenadas(cached); return; }

    const id = ++mapReqId.current;
    const clat = (bounds.minLat + bounds.maxLat) / 2;
    const clon = (bounds.minLon + bounds.maxLon) / 2;
    try {
      const { data } = await supabase.current.rpc("escolas_no_mapa", {
        p_min_lat: bounds.minLat, p_min_lon: bounds.minLon,
        p_max_lat: bounds.maxLat, p_max_lon: bounds.maxLon,
        p_center_lat: clat, p_center_lon: clon,
        p_limit: 200,
      });
      if (id !== mapReqId.current) return;
      if (data?.length) {
        const mapped = data.map((item: any) => ({
          ...item, distancia_km: undefined,
        })) as EscolaResult[];
        boundsCache.current.set(cacheKey, mapped);
        if (boundsCache.current.size > 10) {
          const firstKey = boundsCache.current.keys().next().value;
          if (firstKey) boundsCache.current.delete(firstKey);
        }
        setResultadosCoordenadas(mapped);
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-text selection:bg-primary/30">
      {/* ===== MAPA (fixed, respeita sidebar + bottom) ===== */}
      <div className="fixed inset-0 bottom-0 z-0">
        <MapaEscolas
          escolas={sortedResultados || []}
          userLocation={userLocation}
          hoveredId={hoveredId}
          serieSlug={serieSlug}
          mapCenter={mapCenter}
          activeTile={activeTile}
          onBoundsChange={handleMapBoundsChange}
          showPrivada={showPrivada}
          showPublica={showPublica}
          onZoomModeChange={setZoomMode}
        />
      </div>

      {/* ===== Flutuante topo-direito (tema + auth) — apenas desktop ===== */}
      <div className="hidden md:flex fixed top-4 right-4 z-[501] items-center gap-2 bg-surface p-2 rounded-full shadow-lg border border-border">
        <BotaoTema />
        {user ? (
          <div className="relative">
            <button onClick={() => setIsMenuAberto(!isMenuAberto)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover hover:bg-border transition-colors text-text-secondary hover:text-text"
            >
              <User className="w-4 h-4" />
            </button>
            {isMenuAberto && (
              <>
                <div className="fixed inset-0 z-[501]" onClick={() => setIsMenuAberto(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface rounded-2xl shadow-xl border border-border z-[502] p-4">
                  <p className="text-sm font-semibold text-text truncate block mb-1">{user.email}</p>
                  <div className="border-b border-border my-2" />
                  <Link href="/perfil" onClick={() => setIsMenuAberto(false)}
                    className="flex items-center gap-2 text-sm text-text hover:bg-surface-hover p-2 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Gerenciar sua Conta
                  </Link>
                  <button onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors w-full text-left mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link href="/login"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-hover hover:bg-border transition-colors text-text-secondary hover:text-text"
          >
            <LogIn className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Busca e filtros flutuando sobre o mapa (estilo Google Maps) */}
      <div className="fixed inset-0 bottom-0 z-[500] pointer-events-none">
        <div className="pointer-events-auto px-3 pt-2 md:pl-3 md:pr-0 md:pt-3 flex flex-col md:flex-row md:items-start md:gap-3">
          <div className="flex items-center gap-2">
            <Link href="/sobre"
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-[#0070F3] text-white hover:brightness-110 transition-all duration-200 shadow-sm"
              title="Sobre o projeto">
              <Info className="w-5 h-5" />
            </Link>
            <CaixaBuscaLocalizacao
            onLocationChange={handleLocationChange}
            onLocationSelect={handleLocationSelect}
            onSchoolSelect={(_slug, nome, lat, lng) => {
              setLocalQuery(nome);
              updateFilters({ q: nome });
              if (lat && lng) {
                setMapCenter({ lat, lon: lng });
              }
            }}
            className="w-full md:w-96 shadow-lg"
          />
          </div>
          <div className="flex justify-center items-center gap-2 flex-wrap md:justify-start md:flex-1 mt-2 md:mt-0">
            <button
              onClick={() => { const c = readParam("privada") !== "0"; updateFilters({ privada: c ? "0" : "1" }); }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 shadow-sm ${
                showPrivada ? "bg-[#0070F3] text-white" : "bg-surface-hover text-text-secondary"
              }`}
            >
              <DollarSign className="w-3 h-3" />
              Privadas{zoomMode === "escola" && counts.privadas > 0 ? ` (${counts.privadas})` : ""}
            </button>
            <button
              onClick={() => { const c = readParam("publica") !== "0"; updateFilters({ publica: c ? "0" : "1" }); }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 active:scale-95 border border-border/50 shadow-sm ${
                showPublica ? "bg-[#34A853] text-white" : "bg-surface-hover text-text-secondary"
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              P{'\u00fa'}blicas{zoomMode === "escola" && counts.publicas > 0 ? ` (${counts.publicas})` : ""}
            </button>
            <SearchableSelect label="Etapa" value={serieSlug} series={SERIES} grupos={GRUPOS} onChange={(v) => updateFilters({ serie: v })} isMultiple={true} />
          </div>
        </div>

        {/* Botoes flutuantes inferior direito (estilo Google Maps) */}
        <div className="absolute bottom-20 md:bottom-6 right-4 z-[500] pointer-events-auto flex flex-col gap-2">
          {/* Botao localizacao (toggle on/off) */}
          <button
            type="button"
            onClick={async () => {
              if (isLocationActive) {
                setIsLocationActive(false);
                setUserLocation(null);
                return;
              }
              if (!navigator.geolocation) return;
              try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
                  });
                });
                setIsLocationActive(true);
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const novosParams = new URLSearchParams(window.location.search);
                novosParams.set("lat", lat.toString());
                novosParams.set("lon", lon.toString());
                router.replace(`${pathname}?${novosParams.toString()}`, { scroll: false });
                setMapCenter({ lat, lon });
                setCarregandoCoordenadas(true);
                const { data } = await supabase.current.rpc("escolas_perto_de_mim", {
                  p_lat: lat, p_lon: lon, p_raio_km: 50,
                });
                const mapped = (data || []).map((item: any) => ({
                  ...item, distancia_km: item.distancia_km ?? undefined,
                  etapas_modalidades: item.etapas_modalidades ?? null,
                })) as EscolaResult[];
                setResultadosCoordenadas(mapped);
                setUserLocation({ lat, lon });
                setCarregandoCoordenadas(false);
              } catch {}
            }}
            className={`w-10 h-10 flex items-center justify-center rounded-xl shadow-lg transition-all duration-200 active:scale-95 border ${
              isLocationActive
                ? "bg-[#1a73e8] text-white border-[#1a73e8]"
                : "bg-surface text-text border-border/50 hover:bg-surface-hover"
            }`}
            title={isLocationActive ? "Desativar localiza\u00e7\u00e3o" : "Minha localiza\u00e7\u00e3o"}
            aria-label={isLocationActive ? "Desativar localiza\u00e7\u00e3o" : "Minha localiza\u00e7\u00e3o"}
          >
            <Crosshair className="w-5 h-5" />
          </button>

          {/* Botao camadas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLayersOpen((p) => !p)}
              className="w-10 h-10 flex items-center justify-center rounded-xl shadow-lg transition-all duration-200 active:scale-95 border bg-surface text-text border-border/50 hover:bg-surface-hover"
              title="Camadas do mapa"
              aria-label="Camadas do mapa"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </button>

            {layersOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLayersOpen(false)} />
                <div className="absolute bottom-full right-0 mb-2 z-50 bg-surface border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-40">
                  {[
                    { key: "Padr\u00e3o", label: "Mapa Padr\u00e3o" },
                    { key: "Sat\u00e9lite", label: "Sat\u00e9lite" },
                    { key: "Terreno", label: "Terreno" },
                    { key: "Claro", label: "Claro" },
                    { key: "Escuro", label: "Escuro" },
                  ].map((layer) => (
                    <button
                      key={layer.key}
                      type="button"
                      onClick={() => { setActiveTile(layer.key); setLayersOpen(false); }}
                      className={`block w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        activeTile === layer.key
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-text hover:bg-surface-hover"
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Banner marquee flutuando sobre o mapa na parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 z-[550] overflow-hidden pointer-events-none" style={{ marginBottom: '48px' }}>
          <div className="animate-marquee whitespace-nowrap text-sm font-semibold text-fuchsia-400/90 drop-shadow-[0_0_8px_rgba(232,121,249,0.5)] tracking-wide">
            {'Ajude outros pais e respons\u00e1veis, cadastrando valores de mensalidades e avaliando escolas. Esse projeto depende de voc\u00ea. \u00a0\u00a0\u00a0\u2022\u00a0\u00a0\u00a0'}
          </div>
        </div>
      </div>

      {/* Loading indicator sobre o mapa */}
      {carregandoCoordenadas && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[600] pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-bg/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm text-text-tertiary">Buscando escolas pr\u00f3ximas...</p>
          </div>
        </div>
      )}

      {/* Empty state: busca feita sem resultados */}
      {temBusca && !carregandoCoordenadas && sortedResultados && sortedResultados.length === 0 && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[600] pointer-events-none">
          <div className="flex flex-col items-center gap-3 bg-bg/80 backdrop-blur-sm rounded-2xl px-6 py-6 shadow-lg max-w-xs text-center">
            <p className="text-sm text-text-secondary font-medium">
              {"Nenhuma escola encontrada para esta etapa nesta regi\u00e3o"}
            </p>
          </div>
        </div>
      )}

      {/* Cards de resultados (desativado enquanto ranking não fica pronto) */}
      {false && exibirCards && (uf || cidade || resultadosCoordenadas) && (
        <div>
          <BuscaResults resultados={sortedResultados || []} hoveredId={hoveredId} onHover={handleHover} serieSlug={serieSlug} />
        </div>
      )}

      {/* SEO: invisível para humanos, visível para o Googlebot */}
      <SchemaEscolas escolas={dadosExibir || []} />

      <section aria-label="Diret\u00f3rio de Escolas para Motores de Busca" className="sr-only">
        <h1>{cidade && uf ? `Escolas e Pre\u00e7os em ${cidade} - ${uf}` : "Buscar Escolas e Comparar Mensalidades"}</h1>
        <ul>
          {(dadosExibir || []).map((escola) => (
            <li key={escola.id}>
              <article>
                <h2>{escola.nome}</h2>
                <p>
                  {escola.bairro
                    ? `Localizada no bairro ${escola.bairro}, na cidade de ${escola.municipio} - ${escola.uf}.`
                    : `Localizada na cidade de ${escola.municipio} - ${escola.uf}.`}
                </p>
                <p>Tipo de institui\u00e7\u00e3o: Escola {escola.dependencia_administrativa}.</p>
                {Array.isArray(escola.series_precos) && escola.series_precos.length > 0 && (
                  <ul>
                    {escola.series_precos.map((sp: any) => (
                      <li key={sp.serie_slug}>
                        S\u00e9rie: {sp.serie_nome}
                        {sp.valor_mensalidade != null
                          ? ` - Mensalidade: R$ ${sp.valor_mensalidade.toFixed(2).replace(".", ",")}`
                          : " - Mensalidade: n\u00e3o informada"}
                      </li>
                    ))}
                  </ul>
                )}
                <a href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}>Ver Mensalidade</a>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
