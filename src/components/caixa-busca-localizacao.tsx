"use client";

import { useState, useRef, useEffect } from "react";
import { Navigation, Loader2, MapPin, Building, Home, Hash } from "lucide-react";
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
  const supabase = useRef(createClient());
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
    onLocationChange({ buscaRaw: value });

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

    const cepMatch = query.match(CEP_REGEX);
    if (cepMatch) {
      const cepLimpo = `${cepMatch[1]}${cepMatch[2]}`;
      await buscarCep(cepLimpo, requestId);
    } else {
      await buscarTexto(query, requestId);
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

      const sugestao: SugestaoLocalizacao = {
        id: `cep-${cep}`,
        textoExibicao: [data.street, data.neighborhood, `${data.city} - ${data.state}`]
          .filter(Boolean).join(", "),
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

  async function buscarTexto(termo: string, requestId: number) {
    const results: SugestaoLocalizacao[] = [];
    const vistos = new Set<string>();

    const normalizado = termo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const likePattern = `%${normalizado}%`;

    try {
      const [{ data: cidades }, { data: bairros }] = await Promise.all([
        supabase.current
          .from("tb_cidades")
          .select("nome, estado:estado_id!inner(uf)")
          .ilike("nome", likePattern)
          .limit(5)
          .order("nome"),
        supabase.current
          .from("escolas")
          .select("bairro, municipio, uf")
          .not("bairro", "is", null)
          .or(`bairro.ilike.${likePattern},municipio.ilike.${likePattern}`)
          .limit(8)
          .order("bairro"),
      ]);

      if (requestId !== reqIdRef.current) return;

      if (cidades) {
        for (const c of cidades) {
          const uf = (c.estado as any)?.uf ?? "";
          if (!uf) continue;
          const chave = `${c.nome}-${uf}`;
          if (vistos.has(chave)) continue;
          vistos.add(chave);
          results.push({
            id: `cid-${results.length}`,
            textoExibicao: `${c.nome} - ${uf}`,
            tipo: "cidade",
            cidade: c.nome,
            uf,
          });
        }
      }

      if (bairros) {
        for (const b of bairros) {
          if (!b.bairro || !b.municipio || !b.uf) continue;
          const chave = `b-${b.bairro}-${b.municipio}-${b.uf}`;
          if (vistos.has(chave)) continue;
          vistos.add(chave);
          results.push({
            id: `bairro-${results.length}`,
            textoExibicao: `${b.bairro}, ${b.municipio} - ${b.uf}`,
            tipo: "bairro",
            bairro: b.bairro,
            cidade: b.municipio,
            uf: b.uf,
          });
        }
      }

      if (results.length > 0) {
        setSugestoes(results.slice(0, 10));
        setDropdownAberto(true);
        setBuscouSemResultados(false);
        setHighlightIndex(-1);
        return;
      }
    } catch {
      if (requestId !== reqIdRef.current) return;
    }

    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(termo)}&lang=pt&limit=5&bbox=-73.99,-33.75,-28.84,5.27`
      );
      if (requestId !== reqIdRef.current) return;

      if (!res.ok) {
        setSugestoes([]);
        setDropdownAberto(true);
        setBuscouSemResultados(true);
        setHighlightIndex(-1);
        return;
      }

      const geo = await res.json();
      if (requestId !== reqIdRef.current) return;

      const features: any[] = geo.features || [];

      for (const f of features) {
        const p = f.properties;
        if (!p) continue;

        const country = (p.country || "").toLowerCase();
        if (country && country !== "brazil" && country !== "brasil") continue;

        const lon = f.geometry?.coordinates?.[0];
        const lat = f.geometry?.coordinates?.[1];
        const cidade = p.city || p.town || p.name || "";
        const uf = p.state || "";
        const nome = p.name || "";
        const street = p.street || "";
        const osmValue = p.osm_value || "";

        let tipo: SugestaoLocalizacao["tipo"] = "cidade";
        let texto = "";
        let bairro: string | undefined;

        if (osmValue === "suburb" || osmValue === "neighbourhood" || osmValue === "quarter") {
          tipo = "bairro";
          bairro = nome;
          texto = `${bairro}, ${cidade}${uf ? ` - ${uf}` : ""}`;
        } else if (street || osmValue === "street" || osmValue === "road") {
          tipo = "logradouro";
          texto = `${street || nome}, ${cidade}${uf ? ` - ${uf}` : ""}`;
        } else if (cidade) {
          tipo = "cidade";
          texto = `${cidade}${uf ? ` - ${uf}` : ""}`;
        } else {
          continue;
        }

        const chave = `${tipo}|${texto}`;
        if (vistos.has(chave)) continue;
        vistos.add(chave);

        results.push({
          id: `ph-${results.length}`,
          textoExibicao: texto,
          tipo,
          bairro,
          cidade,
          uf,
          latitude: lat != null ? lat : undefined,
          longitude: lon != null ? lon : undefined,
        });
      }

      setSugestoes(results.slice(0, 10));
      setDropdownAberto(results.length > 0);
      setBuscouSemResultados(results.length === 0);
      setHighlightIndex(-1);
    } catch {
      if (requestId !== reqIdRef.current) return;
      setSugestoes([]);
      setDropdownAberto(true);
      setBuscouSemResultados(true);
      setHighlightIndex(-1);
    }
  }

  function selecionarSugestao(sugestao: SugestaoLocalizacao) {
    setBuscaRaw(sugestao.textoExibicao);
    setSugestoes([]);
    setDropdownAberto(false);
    setBuscouSemResultados(false);
    setHighlightIndex(-1);

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

      try {
        const res = await fetch(
          `https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&lang=pt`
        );
        if (res.ok) {
          const geo = await res.json();
          const props = geo.features?.[0]?.properties || {};
          const cidade = props.city || props.town || props.name || "";
          const uf = props.state || "";

          setBuscaRaw(`${cidade}${uf ? ` - ${uf}` : ""}`);
          onLocationChange({
            buscaRaw: `${cidade}${uf ? ` - ${uf}` : ""}`,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            cidade,
            uf,
          });
        }
      } catch {
        setGeoError("Erro ao obter localiza\u00e7\u00e3o.");
      }
    } catch {
      setGeoError("Erro ao obter localiza\u00e7\u00e3o.");
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
          {carregando && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-[var(--color-text-tertiary)] animate-spin" />
            </div>
          )}
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

      {exibirDropdown() && (
        <div className="absolute z-50 top-full mt-1 left-0 right-[calc(0%+48px)] sm:right-[calc(0%+104px)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
          {carregando && (
            <div className="p-4 space-y-3">
              <div className="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse" />
              <div className="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse w-3/4" />
              <div className="h-4 bg-[var(--color-surface-hover)] rounded animate-pulse w-1/2" />
            </div>
          )}

          {!carregando && buscouSemResultados && sugestoes.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-[var(--color-text-tertiary)]">
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
          )}
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
