"use client";

import { useState, useRef, useEffect } from "react";
import { Navigation, Loader2, MapPin, Building, Hash } from "lucide-react";

export interface SugestaoLocalizacao {
  id: string;
  textoExibicao: string;
  tipo: "cidade" | "cep";
  cidade?: string;
  uf?: string;
  bairro?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

export interface FiltroLocalizacao {
  buscaRaw: string;
  cep?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
}

export interface LocalizacaoSelecionada {
  label: string;
  lat: number;
  lng: number;
}

interface CaixaBuscaLocalizacaoProps {
  onLocationChange: (filtro: FiltroLocalizacao) => void;
  onLocationSelect?: (loc: LocalizacaoSelecionada) => void;
  initialValue?: string;
  className?: string;
  iconOnlyGeo?: boolean;
}

const CEP_REGEX = /^(\d{5})-?(\d{3})$/;
const FETCH_TIMEOUT_MS = 5000;

type MunicipioIBGE = {
  id: number;
  nome: string;
  microrregiao: { mesorregiao: { UF: { sigla: string; nome: string } } };
};

function fetchComTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function geocodeNominatim(cidade: string, uf: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${cidade}, ${uf}, Brasil`);
    const res = await fetchComTimeout(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=pt`,
      { headers: { "User-Agent": "MensalidadeJusta/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function CaixaBuscaLocalizacao({
  onLocationChange,
  onLocationSelect,
  initialValue = "",
  className = "",
  iconOnlyGeo,
}: CaixaBuscaLocalizacaoProps) {
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
    debounceRef.current = setTimeout(() => buscar(trimmed), 350);
  }

  async function buscar(query: string) {
    const requestId = ++reqIdRef.current;
    const trimmed = query.trim();

    const cepMatch = trimmed.match(CEP_REGEX);
    if (cepMatch) {
      await buscarCep(trimmed, requestId);
    } else if (/^\d+$/.test(trimmed)) {
      // Só numeros mas não é CEP válido → tenta como CEP mesmo
      await buscarCep(trimmed, requestId);
    } else {
      // Busca cidades pelo IBGE
      await buscarCidadesIBGE(trimmed, requestId);
    }

    if (requestId === reqIdRef.current) {
      setCarregando(false);
    }
  }

  async function buscarCep(cep: string, requestId: number) {
    const cepClean = cep.replace(/\D/g, "");
    try {
      const res = await fetchComTimeout(`https://viacep.com.br/ws/${cepClean}/json/`);
      if (requestId !== reqIdRef.current) return;
      if (!res.ok) throw new Error("CEP invalido");
      const data = await res.json();
      if (requestId !== reqIdRef.current) return;
      if (data.erro) throw new Error("CEP nao encontrado");

      const sugestao: SugestaoLocalizacao = {
        id: `cep-${cepClean}`,
        textoExibicao: [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean).join(", "),
        tipo: "cep",
        cep: data.cep,
        bairro: data.bairro || undefined,
        cidade: data.localidade,
        uf: data.uf,
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

  async function buscarCidadesIBGE(termo: string, requestId: number) {
    try {
      const res = await fetchComTimeout(
        `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(termo)}`
      );
      if (requestId !== reqIdRef.current) return;
      if (!res.ok) throw new Error("IBGE error");
      const data: MunicipioIBGE[] = await res.json();
      if (requestId !== reqIdRef.current) return;

      if (Array.isArray(data) && data.length > 0) {
        const lista: SugestaoLocalizacao[] = data.map((m) => ({
          id: `ibge-${m.id}`,
          textoExibicao: `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`,
          tipo: "cidade" as const,
          cidade: m.nome,
          uf: m.microrregiao.mesorregiao.UF.sigla,
        }));
        setSugestoes(lista.slice(0, 10));
        setDropdownAberto(true);
        setBuscouSemResultados(false);
        setHighlightIndex(-1);
      } else {
        setSugestoes([]);
        setDropdownAberto(true);
        setBuscouSemResultados(true);
        setHighlightIndex(-1);
      }
    } catch {
      if (requestId !== reqIdRef.current) return;
      setSugestoes([]);
      setDropdownAberto(true);
      setBuscouSemResultados(true);
      setHighlightIndex(-1);
    }
  }

  async function selecionarSugestao(sugestao: SugestaoLocalizacao) {
    setBuscaRaw(sugestao.textoExibicao);
    setSugestoes([]);
    setDropdownAberto(false);
    setBuscouSemResultados(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();

    if (sugestao.tipo === "cidade" && sugestao.cidade && sugestao.uf) {
      // Geocode a cidade para obter lat/lng
      const geo = await geocodeNominatim(sugestao.cidade, sugestao.uf);

      onLocationChange({
        buscaRaw: sugestao.textoExibicao,
        cidade: sugestao.cidade,
        uf: sugestao.uf,
        latitude: geo?.lat,
        longitude: geo?.lng,
      });

      if (geo && onLocationSelect) {
        onLocationSelect({
          label: `${sugestao.cidade} - ${sugestao.uf}`,
          lat: geo.lat,
          lng: geo.lng,
        });
      }
      return;
    }

    if (sugestao.tipo === "cep" && sugestao.cidade && sugestao.uf) {
      // Se o CEP tem lat/lng, usa; se não, geocode a cidade
      let lat = sugestao.latitude;
      let lng = sugestao.longitude;

      if (lat == null && sugestao.cidade) {
        const geo = await geocodeNominatim(sugestao.cidade, sugestao.uf);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      onLocationChange({
        buscaRaw: sugestao.textoExibicao,
        cep: sugestao.cep,
        bairro: sugestao.bairro,
        cidade: sugestao.cidade,
        uf: sugestao.uf,
        latitude: lat,
        longitude: lng,
      });

      if (lat != null && lng != null && onLocationSelect) {
        onLocationSelect({ label: sugestao.textoExibicao, lat, lng });
      }
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
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const sugestoesArr = Array.isArray(sugestoes) ? sugestoes : [];
    if (!dropdownAberto || sugestoesArr.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < sugestoesArr.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : sugestoesArr.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && sugestoesArr[highlightIndex]) {
        selecionarSugestao(sugestoesArr[highlightIndex]);
      } else if (sugestoesArr.length > 0) {
        selecionarSugestao(sugestoesArr[0]);
      } else if (buscaRaw.trim().length >= 3) {
        onLocationChange({ buscaRaw: buscaRaw.trim() });
      }
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
          enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
        });
      });

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // Reverse geocode via Nominatim
      let cidade = "", uf = "", bairro = "", logradouro = "";
      try {
        const res = await fetchComTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`,
          { headers: { "User-Agent": "MensalidadeJusta/1.0" } }
        );
        if (res.ok) {
          const geo = await res.json();
          const addr = geo.address || {};
          cidade = addr.city || addr.town || addr.village || addr.county || "";
          uf = (addr.state || "").toUpperCase().slice(0, 2);
          bairro = addr.neighbourhood || addr.suburb || "";
          logradouro = addr.road || addr.name || "";
        }
      } catch {}

      const texto = [logradouro, bairro, cidade, uf].filter(Boolean).join(", ") || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
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
      });
    } catch (err: any) {
      if (err.code === 1) setGeoError("Permiss\u00e3o de localiza\u00e7\u00e3o negada.");
      else setGeoError("Erro ao obter localiza\u00e7\u00e3o.");
    }
    setGeoLoading(false);
  }

  const sugestoesArr = Array.isArray(sugestoes) ? sugestoes : [];

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
            placeholder="Cidade, bairro ou CEP..."
            className="w-full bg-surface border border-border/50 rounded-full py-3 pl-11 pr-4 text-[15px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-[#1f3b9b]/40 focus:ring-4 focus:ring-[#1f3b9b]/20 transition-all duration-300"
            autoComplete="off"
            spellCheck={false}
          />
          {carregando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
            </div>
          )}

          {(dropdownAberto || carregando) && (
            <div className="absolute w-full top-full mt-2 z-50 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
              {carregando && (
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-surface-hover rounded animate-pulse" />
                  <div className="h-4 bg-surface-hover rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-surface-hover rounded animate-pulse w-1/2" />
                </div>
              )}

              {!carregando && buscouSemResultados && sugestoesArr.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-text-tertiary">
                    Nenhum local encontrado com este termo.
                  </p>
                </div>
              )}

              {!carregando && sugestoesArr.length > 0 && (
                <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
                  {sugestoesArr.map((sugestao, index) => {
                    const isHighlighted = index === highlightIndex;
                    const isCidade = sugestao.tipo === "cidade";
                    return (
                      <li
                        key={sugestao.id}
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => selecionarSugestao(sugestao)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-200 ${
                          isHighlighted ? "bg-accent-purple/10" : "hover:bg-surface-hover"
                        }`}
                      >
                        <span className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                          isHighlighted ? "bg-accent-purple/15 text-accent-purple" : "bg-surface-hover text-text-tertiary"
                        }`}>
                          {isCidade ? <MapPin className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text truncate font-medium">
                            {sugestao.textoExibicao}
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-0.5 font-medium uppercase tracking-wider">
                            {isCidade ? "Cidade" : "CEP"}
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
          title="Usar minha localiza\u00e7\u00e3o atual"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          <span className={`${iconOnlyGeo ? "hidden" : "hidden sm:inline"}`}>Perto de mim</span>
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
