"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Loader2, MapPin, Building, Home, Hash } from "lucide-react";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

export interface SugestaoLocalizacao {
  id: string;
  textoExibicao: string;
  tipo: "bairro" | "cidade" | "logradouro" | "cep";
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

export interface FiltroLocalizacao {
  buscaRaw: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
}

interface CaixaBuscaLocalizacaoProps {
  onLocationChange: (filtro: FiltroLocalizacao) => void;
  onSelectSugestao?: (sugestao: SugestaoLocalizacao) => void;
  initialValue?: string;
  className?: string;
  showMap?: boolean;
  onToggleMap?: () => void;
}

const TIPO_LABEL: Record<SugestaoLocalizacao["tipo"], string> = {
  bairro: "Bairro",
  cidade: "Cidade",
  logradouro: "Logradouro",
  cep: "CEP",
};

const TIPO_ICON: Record<SugestaoLocalizacao["tipo"], typeof MapPin> = {
  bairro: Building,
  cidade: MapPin,
  logradouro: Home,
  cep: Hash,
};

const CEP_REGEX = /^(\d{5})-?(\d{3})$/;

const ESTADO_UF: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM",
  "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
  "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
  "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE",
  "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN",
  "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
  "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO",
};

function normalizarUf(valor: string): string {
  if (!valor) return "";
  const upper = valor.toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) return upper;
  return ESTADO_UF[valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()] || valor.toUpperCase().slice(0, 2);
}

type LocationIqSuggestion = {
  place_id: string;
  osm_id?: string;
  osm_type?: string;
  display_name: string;
  display_place?: string;
  display_address?: string;
  address?: {
    name?: string;
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  lat: string;
  lon: string;
  type?: string;
};

export default function CaixaBuscaLocalizacao({
  onLocationChange,
  onSelectSugestao,
  initialValue = "",
  className = "",
  showMap,
  onToggleMap,
}: CaixaBuscaLocalizacaoProps) {
  const router = useRouter();
  const [buscaRaw, setBuscaRaw] = useState(initialValue);
  const [sugestoes, setSugestoes] = useState<SugestaoLocalizacao[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [buscouSemResultados, setBuscouSemResultados] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  function handleChange(value: string) {
    setBuscaRaw(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSugestoes([]);
      setDropdownAberto(false);
      setBuscouSemResultados(false);
      setHighlightIndex(-1);
      return;
    }

    setCarregando(true);

    debounceRef.current = setTimeout(() => {
      buscar(trimmed);
    }, 300);
  }

  async function buscar(query: string) {
    const requestId = ++reqIdRef.current;
    const trimmed = query.trim();

    const cepMatch = trimmed.match(CEP_REGEX);
    if (cepMatch) {
      const cepLimpo = `${cepMatch[1]}${cepMatch[2]}`;
      await buscarCep(cepLimpo, requestId);
    } else if (trimmed.length >= 3) {
      await buscarLocationIQ(trimmed, requestId);
    } else {
      if (requestId === reqIdRef.current) {
        setSugestoes([]);
        setDropdownAberto(false);
        setCarregando(false);
      }
      return;
    }

    if (requestId === reqIdRef.current) {
      setCarregando(false);
    }
  }

  async function buscarCep(cep: string, requestId: number) {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (requestId !== reqIdRef.current) return;

      if (!res.ok) {
        setSugestoes([]);
        setDropdownAberto(true);
        setBuscouSemResultados(true);
        setHighlightIndex(-1);
        return;
      }

      const data = await res.json();
      if (requestId !== reqIdRef.current) return;

      const latitude = data.location?.coordinates?.latitude
        ? Number(data.location.coordinates.latitude)
        : undefined;
      const longitude = data.location?.coordinates?.longitude
        ? Number(data.location.coordinates.longitude)
        : undefined;

      const partes = [data.street, data.neighborhood, `${data.city} - ${data.state}`]
        .filter(Boolean);

      const sugestao: SugestaoLocalizacao = {
        id: `cep-${cep}`,
        textoExibicao: partes.join(", "),
        tipo: "cep",
        cep: data.cep,
        bairro: data.neighborhood || undefined,
        cidade: data.city,
        uf: data.state,
        latitude,
        longitude,
      };

      setSugestoes([sugestao]);
      setDropdownAberto(true);
      setBuscouSemResultados(false);
      setHighlightIndex(-1);
    } catch {
      if (requestId !== reqIdRef.current) return;
      setSugestoes([]);
      setDropdownAberto(true);
      setBuscouSemResultados(true);
      setHighlightIndex(-1);
    }
  }

  async function buscarCidadesFallback(termo: string, results: SugestaoLocalizacao[], vistos: Set<string>) {
    const supabase = createClient();
    const { data: cidades } = await supabase.rpc("buscar_cidades", { p_termo: termo });

    if (cidades) {
      for (const c of cidades) {
        const chave = `cidade|${c.cidade} - ${c.uf}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        results.push({
          id: `sc-${results.length}`,
          textoExibicao: `${c.cidade} - ${c.uf}`,
          tipo: "cidade",
          cidade: c.cidade,
          uf: c.uf,
        });
      }
    }
  }

  const ESTADO_NOME: Record<string, string> = {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas",
    BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo",
    GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul",
    MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
    PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
    SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
  };

  function buscarEstadosLocal(termo: string): SugestaoLocalizacao[] {
    const normalizado = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const resultados: SugestaoLocalizacao[] = [];
    for (const [uf, nomeCompleto] of Object.entries(ESTADO_NOME)) {
      const nomeNorm = nomeCompleto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (nomeNorm.includes(normalizado) || uf.toLowerCase() === normalizado || uf.toLowerCase().startsWith(normalizado)) {
        resultados.push({
          id: `est-${uf}`,
          textoExibicao: `${nomeCompleto} - ${uf}`,
          tipo: "cidade",
          cidade: nomeCompleto,
          uf,
        });
      }
    }
    return resultados;
  }

  async function buscarLocationIQ(termo: string, requestId: number) {
    const results: SugestaoLocalizacao[] = [];
    const vistos = new Set<string>();

    const estados = buscarEstadosLocal(termo);
    for (const e of estados) {
      const chave = `${e.tipo}|${e.textoExibicao}`;
      vistos.add(chave);
      results.push(e);
    }

    const normalizado = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const pareceEndereco = /\b(rua|av|avenida|travessa|praça|alameda|rodovia|estrada|beco|viela)\b/.test(normalizado) || /\d{3,}/.test(termo);

    if (pareceEndereco) {
      const token = process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN;
      if (token) {
        try {
          const url = `https://api.locationiq.com/v1/autocomplete?key=${token}&q=${encodeURIComponent(termo)}&limit=5&countrycodes=br&accept-language=pt-br`;
          const res = await fetch(url);
          if (requestId !== reqIdRef.current) return;

          if (res.ok) {
            const data: LocationIqSuggestion[] = await res.json();
            if (requestId !== reqIdRef.current) return;

            if (Array.isArray(data)) {
              for (const item of data) {
                const addr = item.address || {};
                const lat = item.lat ? Number(item.lat) : undefined;
                const lon = item.lon ? Number(item.lon) : undefined;
                const logradouro = addr.road || addr.name || "";
                const bairro = addr.neighbourhood || addr.suburb || "";
                const cidade = addr.city || addr.town || addr.village || addr.county || "";
                const uf = normalizarUf(addr.state || "");

                if (!logradouro) continue;

                const texto = [logradouro, bairro, cidade, uf].filter(Boolean).join(", ");
                const chave = `logradouro|${texto}`;
                if (vistos.has(chave)) continue;
                vistos.add(chave);

                results.push({
                  id: `liq-${results.length}`,
                  textoExibicao: texto,
                  tipo: "logradouro",
                  bairro: bairro || undefined,
                  cidade,
                  uf,
                  latitude: lat,
                  longitude: lon,
                });
              }
            }
          }
        } catch {}
      }
    } else {
      await buscarCidadesFallback(termo, results, vistos);
    }

    results.sort((a, b) => {
      const prioridade: Record<string, number> = { cidade: 0, bairro: 1, logradouro: 2, cep: 3 };
      return (prioridade[a.tipo] ?? 9) - (prioridade[b.tipo] ?? 9);
    });

    setSugestoes(results.slice(0, 10));
    setDropdownAberto(results.length > 0);
    setBuscouSemResultados(results.length === 0);
    setHighlightIndex(-1);
  }

  function selecionarSugestao(sugestao: SugestaoLocalizacao) {
    setBuscaRaw(sugestao.textoExibicao);
    setSugestoes([]);
    setDropdownAberto(false);
    setBuscouSemResultados(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();

    if (sugestao.tipo === "cidade" && sugestao.cidade && sugestao.uf) {
      const params = new URLSearchParams({ uf: sugestao.uf, cidade: sugestao.cidade });
      router.push(`/busca?${params.toString()}`);
      onLocationChange({
        buscaRaw: sugestao.textoExibicao,
        cidade: sugestao.cidade,
        uf: sugestao.uf,
      });
      onSelectSugestao?.(sugestao);
      return;
    }

    if (sugestao.tipo === "bairro" && sugestao.bairro && sugestao.cidade && sugestao.uf) {
      const params = new URLSearchParams({ uf: sugestao.uf, cidade: sugestao.cidade, bairro: sugestao.bairro });
      router.push(`/busca?${params.toString()}`);
      onLocationChange({
        buscaRaw: sugestao.textoExibicao,
        bairro: sugestao.bairro,
        cidade: sugestao.cidade,
        uf: sugestao.uf,
      });
      onSelectSugestao?.(sugestao);
      return;
    }

    onLocationChange({
      buscaRaw: sugestao.textoExibicao,
      cep: sugestao.cep,
      bairro: sugestao.bairro,
      cidade: sugestao.cidade,
      uf: sugestao.uf,
      latitude: sugestao.latitude,
      longitude: sugestao.longitude,
    });
    onSelectSugestao?.(sugestao);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownAberto || sugestoes.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < sugestoes.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : sugestoes.length - 1));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selecionarSugestao(sugestoes[highlightIndex]);
    } else if (e.key === "Escape") {
      setDropdownAberto(false);
      setHighlightIndex(-1);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function buscarPertoDeMim() {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada.");
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

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let cidade = "";
      let uf = "";
      let bairro = "";
      let logradouro = "";

      const token = process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN;
      if (token) {
        try {
          const res = await fetch(
            `https://api.locationiq.com/v1/reverse?key=${token}&lat=${lat}&lon=${lon}&format=json&accept-language=pt-br`
          );
          if (res.ok) {
            const geo = await res.json();
            const addr = geo.address || {};
            cidade = addr.city || addr.town || addr.village || addr.county || "";
            uf = normalizarUf(addr.state || "");
            bairro = addr.neighbourhood || addr.suburb || "";
            logradouro = addr.road || addr.name || "";
          }
        } catch {}
      }

      const partes = [logradouro, bairro, cidade, uf].filter(Boolean);
      const texto = partes.length > 0 ? partes.join(", ") : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setBuscaRaw(texto);
      setSugestoes([]);
      setDropdownAberto(false);
      onLocationChange({
        buscaRaw: texto,
        latitude: lat,
        longitude: lon,
        cidade: cidade || undefined,
        uf: uf || undefined,
        bairro: bairro || undefined,
        logradouro: logradouro || undefined,
      });
    } catch (err: any) {
      if (err.code === 1) setGeoError("Permissão de localização negada.");
      else setGeoError("Erro ao obter localização.");
    }
    setGeoLoading(false);
  }

  function handleFocus() {
    if (sugestoes.length > 0 || buscouSemResultados) setDropdownAberto(true);
  }

  function exibirDropdown(): boolean {
    if (!dropdownAberto) return false;
    if (carregando) return true;
    if (sugestoes.length > 0) return true;
    if (buscouSemResultados) return true;
    return false;
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={buscaRaw}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={"Endereço, bairro ou cidade..."}
            className="w-full bg-surface border border-border/50 rounded-full py-3 pl-11 pr-4 text-[15px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-[#1f3b9b]/40 focus:ring-4 focus:ring-[#1f3b9b]/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_-5px_rgba(66,133,244,0.2),0_-4px_20px_-8px_rgba(139,92,246,0.15),0_4px_20px_-8px_rgba(236,72,153,0.1)]"
            autoComplete="off"
            spellCheck={false}
          />
          {carregando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
            </div>
          )}

          {exibirDropdown() && (
            <div className="absolute w-full top-full mt-2 z-50 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
              {carregando && (
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-surface-hover rounded animate-pulse" />
                  <div className="h-4 bg-surface-hover rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-surface-hover rounded animate-pulse w-1/2" />
                </div>
              )}

              {!carregando && buscouSemResultados && sugestoes.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-text-tertiary">
                    Nenhum local encontrado com este termo.
                  </p>
                </div>
              )}

              {!carregando && sugestoes.length > 0 && (
                <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
                  {sugestoes.map((sugestao, index) => {
                    const IconComponent = TIPO_ICON[sugestao.tipo];
                    const isHighlighted = index === highlightIndex;
                    return (
                      <li
                        key={sugestao.id}
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => selecionarSugestao(sugestao)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-200 ${
                          isHighlighted
                            ? "bg-accent-purple/10"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        <span
                          className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                            isHighlighted
                              ? "bg-accent-purple/15 text-accent-purple"
                              : "bg-surface-hover text-text-tertiary"
                          }`}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text truncate font-medium">
                            {sugestao.textoExibicao}
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-0.5 font-medium uppercase tracking-wider">
                            {TIPO_LABEL[sugestao.tipo]}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={buscarPertoDeMim}
          disabled={geoLoading}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full text-sm font-medium bg-[#1f3b9b] text-white hover:bg-[#1f3b9b]/90 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          title="Usar minha localização atual"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Perto de mim</span>
        </button>
        <button
          type="button"
          onClick={onToggleMap}
          className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 ${
            showMap
              ? "bg-[#1f3b9b] text-white"
              : "bg-surface border border-border/50 text-text-tertiary hover:text-text"
          }`}
          title={showMap ? "Fechar mapa" : "Abrir mapa"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
          <span className="hidden sm:inline">Mapa</span>
        </button>
      </div>

      {geoError && (
        <p className="mt-2 text-xs text-danger font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
          {geoError}
        </p>
      )}
    </div>
  );
}
