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
    const normalizado = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const like = `%${normalizado}%`;

    const { data: cidades } = await supabase
      .from("tb_cidades")
      .select("nome, estado:estado_id!inner(uf)")
      .ilike("nome", like)
      .limit(5)
      .order("nome");

    if (cidades) {
      for (const c of cidades) {
        const uf = (c.estado as any)?.uf ?? "";
        if (!uf) continue;
        const chave = `cidade|${c.nome} - ${uf}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        results.push({
          id: `sc-${results.length}`,
          textoExibicao: `${c.nome} - ${uf}`,
          tipo: "cidade",
          cidade: c.nome,
          uf,
        });
      }
    }
  }

  function buscarEstadosLocal(termo: string): SugestaoLocalizacao[] {
    const normalizado = termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const resultados: SugestaoLocalizacao[] = [];
    for (const [nome, uf] of Object.entries(ESTADO_UF)) {
      if (nome.includes(normalizado) || uf.toLowerCase() === normalizado || uf.toLowerCase().startsWith(normalizado)) {
        resultados.push({
          id: `est-${uf}`,
          textoExibicao: `${nome.charAt(0).toUpperCase() + nome.slice(1)} - ${uf}`,
          tipo: "cidade",
          cidade: nome.charAt(0).toUpperCase() + nome.slice(1),
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

    const token = process.env.NEXT_PUBLIC_LOCATIONIQ_TOKEN;
    if (token) {
      try {
        const url = `https://api.locationiq.com/v1/autocomplete?key=${token}&q=${encodeURIComponent(termo)}&limit=6&countrycodes=br&accept-language=pt-br`;
        const res = await fetch(url);
        if (requestId !== reqIdRef.current) return;

        if (res.ok) {
          const data: LocationIqSuggestion[] = await res.json();
          if (requestId !== reqIdRef.current) return;

          if (Array.isArray(data)) {
            for (const item of data) {
              const addr = item.address || {};
              const displayName = item.display_name || "";
              const lat = item.lat ? Number(item.lat) : undefined;
              const lon = item.lon ? Number(item.lon) : undefined;

              const cidade = addr.city || addr.town || addr.village || addr.county || addr.name || "";
              const uf = normalizarUf(addr.state || "");
              const bairro = addr.neighbourhood || addr.suburb || "";
              const logradouro = addr.road || addr.name || "";
              const tipoRaw = item.type || "";
              const osmType = item.osm_type || "";

              let tipo: SugestaoLocalizacao["tipo"] = "cidade";
              let texto = "";
              let displayBairro: string | undefined;

              const cidadeUf = `${cidade}${uf ? ` - ${uf}` : ""}`;

              if (tipoRaw === "city" || tipoRaw === "town" || tipoRaw === "village" || tipoRaw === "administrative") {
                tipo = "cidade";
                texto = cidadeUf || displayName;
              } else if (tipoRaw === "suburb" || tipoRaw === "neighbourhood" || tipoRaw === "quarter" || (bairro && cidade)) {
                tipo = "bairro";
                displayBairro = bairro || logradouro;
                texto = `${displayBairro}, ${cidadeUf}`;
              } else if (tipoRaw === "road" || osmType === "way" || logradouro) {
                tipo = "logradouro";
                const logr = [logradouro, bairro, cidade].filter(Boolean).join(", ");
                texto = `${logr}${uf ? ` - ${uf}` : ""}`;
              } else if (cidade) {
                tipo = "cidade";
                texto = cidadeUf;
              } else {
                tipo = "logradouro";
                texto = displayName;
              }

              const chave = `${tipo}|${texto}`;
              if (vistos.has(chave)) continue;
              vistos.add(chave);

              results.push({
                id: `liq-${item.place_id || results.length}`,
                textoExibicao: texto,
                tipo,
                bairro: displayBairro,
                cidade: cidade || "",
                uf: uf || "",
                latitude: lat,
                longitude: lon,
              });
            }
          }
        }
      } catch {}
    }

    const temCidade = results.some((r) => r.tipo === "cidade");
    if (!temCidade) {
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
      if (err.code === 1) setGeoError("Permiss\u00e3o de localiza\u00e7\u00e3o negada.");
      else setGeoError("Erro ao obter localiza\u00e7\u00e3o.");
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
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5260] pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={buscaRaw}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={"Endere\u00e7o, bairro ou cidade..."}
            className="w-full bg-[#16161a] border border-[#26262b] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#eadfed] placeholder:text-[#5a5260] focus:outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/20 transition-all duration-300"
            autoComplete="off"
            spellCheck={false}
          />
          {carregando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-[#5a5260] animate-spin" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={buscarPertoDeMim}
          disabled={geoLoading}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#a855f7]/10 text-[#a855f7] hover:bg-[#a855f7]/20 border border-[#a855f7]/20 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
          title="Usar minha localiza\u00e7\u00e3o atual"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Perto de mim</span>
        </button>
      </div>

      {exibirDropdown() && (
        <div className="absolute z-50 top-full mt-1 left-0 right-[calc(0%+48px)] sm:right-[calc(0%+104px)] bg-[#16161a] border border-[#26262b] rounded-xl shadow-2xl overflow-hidden">
          {carregando && (
            <div className="p-4 space-y-3">
              <div className="h-4 bg-[#26262b] rounded animate-pulse" />
              <div className="h-4 bg-[#26262b] rounded animate-pulse w-3/4" />
              <div className="h-4 bg-[#26262b] rounded animate-pulse w-1/2" />
            </div>
          )}

          {!carregando && buscouSemResultados && sugestoes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[#5a5260]">
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
                    className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-150 ${
                      isHighlighted
                        ? "bg-[#a855f7]/10"
                        : "hover:bg-[#1f1f23]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                        isHighlighted
                          ? "bg-[#a855f7]/15 text-[#a855f7]"
                          : "bg-[#1f1f23] text-[#5a5260]"
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#eadfed] truncate font-medium">
                        {sugestao.textoExibicao}
                      </p>
                      <p className="text-[11px] text-[#5a5260] mt-0.5 font-medium uppercase tracking-wider">
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

      {geoError && (
        <p className="mt-2 text-xs text-[#ef4444] font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" />
          {geoError}
        </p>
      )}
    </div>
  );
}
