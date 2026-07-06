"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, MapPin, X, Navigation } from "lucide-react";

const CEP_REGEX = /^\d{5}-?\d{3}$/;
const FETCH_TIMEOUT_MS = 5000;
const NOMINATIM_UA = "MensalidadeJustaApp/1.0 (contato@mensalidadejusta.com.br)";

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIA_CORES: Record<string, string> = {
  Cidade: "bg-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  Bairro: "bg-teal-200 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Rua/Logradouro": "bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  CEP: "bg-purple-200 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Estabelecimento: "bg-pink-200 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  Local: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

function classificarTipo(item: any): string {
  if (item._tipo === "cep") return "CEP";
  const cls = item._cls || "";
  const typ = item._type || "";
  if (cls === "boundary" || typ === "administrative" || typ === "city" || typ === "town" || typ === "village" || typ === "municipality") return "Cidade";
  if (cls === "highway" || typ === "road" || typ === "street" || typ === "pedestrian") return "Rua/Logradouro";
  if (typ === "suburb" || typ === "neighbourhood" || typ === "borough") return "Bairro";
  if (cls === "amenity" || cls === "shop" || cls === "tourism" || cls === "leisure") return "Estabelecimento";
  return "Local";
}

export interface LocalizacaoResult {
  label: string;
  slug: string;
  lat: number;
  lng: number;
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

interface CaixaBuscaLocalizacaoProps {
  onLocationChange: (filtro: FiltroLocalizacao) => void;
  onLocationSelect?: (loc: LocalizacaoResult) => void;
  initialValue?: string;
  className?: string;
  iconOnlyGeo?: boolean;
}

function fetchComTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

export default function CaixaBuscaLocalizacao({
  onLocationChange,
  onLocationSelect,
  initialValue = "",
  className = "",
  iconOnlyGeo,
}: CaixaBuscaLocalizacaoProps) {
  const [buscaRaw, setBuscaRaw] = useState(initialValue);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [buscouSemResultados, setBuscouSemResultados] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setBuscaRaw(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSugestoes([]);
      setDropdownAberto(false);
      setBuscouSemResultados(false);
      setHighlightIndex(-1);
      return;
    }

    setCarregando(true);
    debounceRef.current = setTimeout(() => buscar(trimmed), 300);
  }

  function limparInput() {
    setBuscaRaw("");
    setSugestoes([]);
    setDropdownAberto(false);
    setBuscouSemResultados(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  async function buscar(query: string) {
    let active = true;
    const trimmed = query.trim();
    const isCep = CEP_REGEX.test(trimmed);

    if (isCep) {
      await buscarCep(trimmed, () => active);
    } else {
      await buscarNominatim(trimmed, () => active);
    }

    if (active) {
      setCarregando(false);
    }
  }

  async function buscarCep(cep: string, isActive: () => boolean) {
    const cepClean = cep.replace(/\D/g, "");
    try {
      const res = await fetchComTimeout(`https://viacep.com.br/ws/${cepClean}/json/`);
      if (!isActive()) return;
      if (!res.ok) throw new Error("CEP invalido");
      const data = await res.json();
      if (!isActive()) return;
      if (data.erro) throw new Error("CEP nao encontrado");

      const enderecoStr = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(", ");

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const geoRes = await fetchComTimeout(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoStr)}&countrycodes=br&limit=1&accept-language=pt`,
          { headers: { "User-Agent": NOMINATIM_UA } }
        );
        if (isActive() && geoRes.ok) {
          const geoData = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            lat = Number(geoData[0].lat);
            lng = Number(geoData[0].lon);
          }
        }
      } catch {}

      if (!isActive()) return;

      const sugestao = {
        id: `cep-${cepClean}`,
        textoExibicao: enderecoStr,
        _tipo: "cep",
        label: enderecoStr,
        lat,
        lng,
        cidade: data.localidade,
        uf: data.uf,
        bairro: data.bairro || undefined,
        cep: data.cep,
      };

      setSugestoes([sugestao]);
      setDropdownAberto(true);
      setBuscouSemResultados(false);
      setHighlightIndex(-1);
    } catch {
      if (!isActive()) return;
      setSugestoes([]);
      setDropdownAberto(true);
      setBuscouSemResultados(true);
      setHighlightIndex(-1);
    }
  }

  async function buscarNominatim(query: string, isActive: () => boolean) {
    try {
      const res = await fetchComTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&addressdetails=1&limit=5&accept-language=pt`,
        { headers: { "User-Agent": NOMINATIM_UA } }
      );
      if (!isActive()) return;
      if (!res.ok) throw new Error("Nominatim error");
      const data = await res.json();
      if (!isActive()) return;

      if (Array.isArray(data) && data.length > 0) {
        const lista = data.map((item: any, idx: number) => {
          const addr = item.address || {};
          const rawName = item.display_name || "";
          const nomeLimpo = rawName.split(",")[0].trim();
          const cidade = addr.city || addr.town || addr.village || addr.county || "";
          const uf = (addr.state || "").toUpperCase().slice(0, 2);
          const bairro = addr.neighbourhood || addr.suburb || "";
          const logradouro = addr.road || addr.name || "";
          const partes = [logradouro, bairro, cidade, uf].filter(Boolean);
          return {
            id: `nom-${idx}-${item.place_id}`,
            textoExibicao: partes.length > 0 ? partes.join(", ") : nomeLimpo,
            label: rawName,
            _tipo: "local",
            _cls: item.class || "",
            _type: item.type || "",
            lat: Number(item.lat),
            lng: Number(item.lon),
            cidade,
            uf,
            bairro: bairro || undefined,
          };
        });
        setSugestoes(lista);
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
      if (!isActive()) return;
      setSugestoes([]);
      setDropdownAberto(true);
      setBuscouSemResultados(true);
      setHighlightIndex(-1);
    }
  }

  function selecionarSugestao(sugestao: any) {
    setBuscaRaw(sugestao.textoExibicao);
    setSugestoes([]);
    setDropdownAberto(false);
    setBuscouSemResultados(false);
    setHighlightIndex(-1);
    inputRef.current?.blur();

    const lat = sugestao.lat != null ? Number(sugestao.lat) : null;
    const lng = sugestao.lng != null ? Number(sugestao.lng) : null;

    onLocationChange({
      buscaRaw: sugestao.textoExibicao,
      cep: sugestao.cep,
      bairro: sugestao.bairro,
      cidade: sugestao.cidade,
      uf: sugestao.uf,
      latitude: lat ?? undefined,
      longitude: lng ?? undefined,
    });

    if (lat != null && lng != null && onLocationSelect) {
      const label = sugestao.label || sugestao.textoExibicao;
      const slug = slugify(sugestao.cidade && sugestao.uf ? `${sugestao.cidade}-${sugestao.uf}` : label);
      onLocationSelect({ label, slug, lat, lng });
    }
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
      setGeoError("Geolocalização não suportada.");
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
      let cidade = "", uf = "", logradouro = "";

      try {
        const res = await fetchComTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`,
          { headers: { "User-Agent": NOMINATIM_UA } }
        );
        if (res.ok) {
          const geo = await res.json();
          const addr = geo.address || {};
          cidade = addr.city || addr.town || addr.village || addr.county || "";
          uf = (addr.state || "").toUpperCase().slice(0, 2);
          logradouro = addr.road || addr.name || "";
        }
      } catch {}

      const texto = [logradouro, cidade, uf].filter(Boolean).join(", ") || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      setBuscaRaw(texto);
      setSugestoes([]);
      setDropdownAberto(false);

      onLocationChange({
        buscaRaw: texto,
        latitude: lat,
        longitude: lon,
        cidade: cidade || undefined,
        uf: uf || undefined,
      });
    } catch (err: any) {
      if (err.code === 1) setGeoError("Permissão de localização negada.");
      else setGeoError("Erro ao obter localização.");
    }
    setGeoLoading(false);
  }

  const sugestoesArr = Array.isArray(sugestoes) ? sugestoes : [];
  const temTexto = buscaRaw.trim().length > 0;

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
            onFocus={() => {
              if (sugestoesArr.length > 0 || buscouSemResultados) setDropdownAberto(true);
            }}
            placeholder="Buscar cidade, endereço ou CEP..."
            className="w-full bg-surface border border-border/50 rounded-full py-3 pl-11 pr-10 text-[15px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-[#1f3b9b]/40 focus:ring-4 focus:ring-[#1f3b9b]/20 transition-all duration-300"
            autoComplete="off"
            spellCheck={false}
          />
          {carregando ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
            </div>
          ) : temTexto ? (
            <button
              type="button"
              onClick={limparInput}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
              tabIndex={-1}
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

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
                  {sugestoesArr.map((sugestao: any, index: number) => {
                    const isHighlighted = index === highlightIndex;
                    const categoria = classificarTipo(sugestao);
                    return (
                      <li
                        key={sugestao.id || index}
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
                          <MapPin className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                          <p className="text-sm text-text truncate font-medium">
                            {sugestao.textoExibicao}
                          </p>
                          <span className={`shrink-0 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            CATEGORIA_CORES[categoria] || CATEGORIA_CORES["Local"]
                          }`}>
                            {categoria}
                          </span>
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
