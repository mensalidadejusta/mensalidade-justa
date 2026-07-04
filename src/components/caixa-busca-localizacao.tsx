"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Navigation, Loader2, MapPin, Building, Home, Hash } from "lucide-react";

export interface SugestaoLocalizacao {
  id: string;
  textoExibicao: string;
  tipo: "bairro" | "cidade" | "logradouro" | "cep";
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
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

const MOCK_SUGESTOES: SugestaoLocalizacao[] = [
  { id: "1", textoExibicao: "Putim, São José dos Campos - SP", tipo: "bairro", bairro: "Putim", cidade: "São José dos Campos", uf: "SP" },
  { id: "2", textoExibicao: "Putim, Taubaté - SP", tipo: "bairro", bairro: "Putim", cidade: "Taubaté", uf: "SP" },
  { id: "3", textoExibicao: "Jardim Aquarius, São José dos Campos - SP", tipo: "bairro", bairro: "Jardim Aquarius", cidade: "São José dos Campos", uf: "SP" },
  { id: "4", textoExibicao: "Vila Adyana, São José dos Campos - SP", tipo: "bairro", bairro: "Vila Adyana", cidade: "São José dos Campos", uf: "SP" },
  { id: "5", textoExibicao: "Centro, São José dos Campos - SP", tipo: "bairro", bairro: "Centro", cidade: "São José dos Campos", uf: "SP" },
  { id: "6", textoExibicao: "São José dos Campos - SP", tipo: "cidade", cidade: "São José dos Campos", uf: "SP" },
  { id: "7", textoExibicao: "São Paulo - SP", tipo: "cidade", cidade: "São Paulo", uf: "SP" },
  { id: "8", textoExibicao: "Taubaté - SP", tipo: "cidade", cidade: "Taubaté", uf: "SP" },
  { id: "9", textoExibicao: "Av. São João, 1500 - São José dos Campos - SP", tipo: "logradouro", bairro: "Centro", cidade: "São José dos Campos", uf: "SP" },
  { id: "10", textoExibicao: "Rua XV de Novembro, 200 - Taubaté - SP", tipo: "logradouro", bairro: "Centro", cidade: "Taubaté", uf: "SP" },
  { id: "11", textoExibicao: "12242-000 - Putim, São José dos Campos - SP", tipo: "cep", bairro: "Putim", cidade: "São José dos Campos", uf: "SP", cep: "12242-000" },
  { id: "12", textoExibicao: "12245-000 - Jardim Aquarius, São José dos Campos - SP", tipo: "cep", bairro: "Jardim Aquarius", cidade: "São José dos Campos", uf: "SP", cep: "12245-000" },
  { id: "13", textoExibicao: "12215-000 - Centro, São José dos Campos - SP", tipo: "cep", bairro: "Centro", cidade: "São José dos Campos", uf: "SP", cep: "12215-000" },
  { id: "14", textoExibicao: "Rio de Janeiro - RJ", tipo: "cidade", cidade: "Rio de Janeiro", uf: "RJ" },
  { id: "15", textoExibicao: "Copacabana, Rio de Janeiro - RJ", tipo: "bairro", bairro: "Copacabana", cidade: "Rio de Janeiro", uf: "RJ" },
  { id: "16", textoExibicao: "Belo Horizonte - MG", tipo: "cidade", cidade: "Belo Horizonte", uf: "MG" },
  { id: "17", textoExibicao: "Savassi, Belo Horizonte - MG", tipo: "bairro", bairro: "Savassi", cidade: "Belo Horizonte", uf: "MG" },
  { id: "18", textoExibicao: "Curitiba - PR", tipo: "cidade", cidade: "Curitiba", uf: "PR" },
  { id: "19", textoExibicao: "Batel, Curitiba - PR", tipo: "bairro", bairro: "Batel", cidade: "Curitiba", uf: "PR" },
  { id: "20", textoExibicao: "Porto Alegre - RS", tipo: "cidade", cidade: "Porto Alegre", uf: "RS" },
];

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

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function buscarSugestoes(query: string): SugestaoLocalizacao[] {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const q = normalizar(trimmed);
  const termos = q.split(/\s+/).filter(Boolean);

  return MOCK_SUGESTOES.filter((s) => {
    const texto = normalizar(s.textoExibicao);
    return termos.every((t) => texto.includes(t));
  }).slice(0, 8);
}

type Props = {
  onLocationChange: (filtro: FiltroLocalizacao) => void;
  onSelectSugestao?: (sugestao: SugestaoLocalizacao) => void;
  initialValue?: string;
  className?: string;
};

export default function CaixaBuscaLocalizacao({
  onLocationChange,
  onSelectSugestao,
  initialValue = "",
  className = "",
}: Props) {
  const [buscaRaw, setBuscaRaw] = useState(initialValue);
  const [sugestoes, setSugestoes] = useState<SugestaoLocalizacao[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtroAtivo = useMemo(() => {
    const trimmed = buscaRaw.trim();
    if (!trimmed) return null;
    const s = sugestoes.length > 0 ? sugestoes[0] : null;
    if (s) return s;
    return null;
  }, [buscaRaw, sugestoes]);

  function buscar(query: string) {
    const results = buscarSugestoes(query);
    setSugestoes(results);
    setDropdownAberto(results.length > 0);
    setHighlightIndex(-1);
  }

  function handleChange(value: string) {
    setBuscaRaw(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSugestoes([]);
      setDropdownAberto(false);
      setHighlightIndex(-1);
      onLocationChange({ buscaRaw: value });
      return;
    }

    debounceRef.current = setTimeout(() => {
      buscar(value);
    }, 300);
  }

  function selecionarSugestao(sugestao: SugestaoLocalizacao) {
    setBuscaRaw(sugestao.textoExibicao);
    setSugestoes([]);
    setDropdownAberto(false);
    setHighlightIndex(-1);

    const filtro: FiltroLocalizacao = {
      buscaRaw: sugestao.textoExibicao,
      cep: sugestao.cep,
      bairro: sugestao.bairro,
      cidade: sugestao.cidade,
      uf: sugestao.uf,
    };
    onLocationChange(filtro);
    onSelectSugestao?.(sugestao);
    inputRef.current?.blur();
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
      setGeoError("Geolocaliza\u00e7\u00e3o n\u00e3o suportada neste navegador.");
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

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10&accept-language=pt`,
        { headers: { "User-Agent": "MensalidadeJusta/1.0" } }
      );
      const geo = await response.json();
      const address = geo.address || {};

      const cidade =
        address.city || address.town || address.village || address.municipality || address.county || "";
      const uf = address["ISO3166-2-lvl4"]?.replace("BR-", "") || address.state?.slice(0, 2) || "";
      const bairro = address.suburb || address.neighbourhood || address.neighborhood || address.district || "";
      const logradouro = address.road || address.pedestrian || "";

      const parts: string[] = [];
      if (logradouro) parts.push(logradouro);
      if (bairro) parts.push(bairro);
      if (cidade) parts.push(cidade);
      if (uf) parts.push(uf);

      const displayStr = parts.join(", ");
      setBuscaRaw(displayStr);
      setSugestoes([]);
      setDropdownAberto(false);

      const filtro: FiltroLocalizacao = {
        buscaRaw: displayStr,
        latitude,
        longitude,
        cidade,
        uf,
        bairro,
        logradouro,
      };
      onLocationChange(filtro);
    } catch (err: any) {
      if (err.code === 1) setGeoError("Permiss\u00e3o de localiza\u00e7\u00e3o negada.");
      else if (err.code === 2) setGeoError("N\u00e3o foi poss\u00edvel obter a localiza\u00e7\u00e3o. Tente novamente.");
      else if (err.code === 3) setGeoError("Tempo de espera excedido. Verifique o sinal de GPS.");
      else setGeoError("Erro ao obter localiza\u00e7\u00e3o.");
    }
    setGeoLoading(false);
  }

  function handleFocus() {
    if (sugestoes.length > 0) setDropdownAberto(true);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-1.5">
        Endere{'\u00e7'}o/Regi{'\u00e3'}o
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            value={buscaRaw}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder="Digite endere\u00e7o, bairro ou cidade..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all duration-300"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          onClick={buscarPertoDeMim}
          disabled={geoLoading}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/20 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
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

      {dropdownAberto && sugestoes.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-[calc(0%+48px)] sm:right-[calc(0%+104px)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
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
                      ? "bg-[var(--color-primary)]/10"
                      : "hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                      isHighlighted
                        ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        : "bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--color-text)] truncate font-medium">
                      {sugestao.textoExibicao}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 font-medium uppercase tracking-wider">
                      {TIPO_LABEL[sugestao.tipo]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {geoError && (
        <p className="mt-2 text-xs text-[var(--color-danger)] font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] shrink-0" />
          {geoError}
        </p>
      )}
    </div>
  );
}
