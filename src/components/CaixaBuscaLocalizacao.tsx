"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, MapPin, X, Search, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { makeEscolaSlug } from "@/lib/utils";

const CEP_REGEX = /^\d{5}-?\d{3}$/;
const FETCH_TIMEOUT_MS = 5000;
const NOMINATIM_UA = "MensalidadeJustaApp/1.0 (contato@mensalidadejusta.com.br)";

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

function extrairUf(state: string): string {
  if (!state) return "";
  const upper = state.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const normalizado = state.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ESTADO_UF[normalizado] || upper.slice(0, 2);
}

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
  Escola: "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Local: "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
};

function classificarTipo(item: any): string {
  if (item._tipo === "escola") return "Escola";
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
  onSchoolSelect?: (slug: string, nome: string, lat: number, lng: number) => void;
  initialValue?: string;
  className?: string;
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
  onSchoolSelect,
  initialValue = "",
  className = "",
}: CaixaBuscaLocalizacaoProps) {
  const [buscaRaw, setBuscaRaw] = useState(initialValue);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [buscouSemResultados, setBuscouSemResultados] = useState(false);
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

  function dispararBusca() {
    const trimmed = buscaRaw.trim();
    if (trimmed.length === 0) return;
    setCarregando(true);
    buscar(trimmed).finally(() => {
      setCarregando(false);
    });
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
      const [nominatimResults, escolasResults] = await Promise.all([
        buscarNominatim(trimmed, () => active),
        buscarEscolas(trimmed, () => active),
      ]);
      if (!active) return;
      const escolas = Array.isArray(escolasResults) ? escolasResults : [];
      const locais = Array.isArray(nominatimResults) ? nominatimResults : [];
      const combinadas = [...escolas, ...locais];
      const vistos = new Set<string>();
      const lista = combinadas.filter((item) => {
        const key = item.id || item.label;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
      });
      setSugestoes(lista);
      setDropdownAberto(lista.length > 0);
      setBuscouSemResultados(lista.length === 0);
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoStr)}&countrycodes=br&limit=1&accept-language=pt-BR`,
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

  async function buscarNominatim(query: string, isActive: () => boolean): Promise<any[]> {
    try {
      const res = await fetchComTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&addressdetails=1&limit=5&accept-language=pt-BR`,
        { headers: { "User-Agent": NOMINATIM_UA } }
      );
      if (!isActive()) return [];
      if (!res.ok) throw new Error("Nominatim error");
      const data = await res.json();
      if (!isActive()) return [];

      if (Array.isArray(data) && data.length > 0) {
        const mapeados = data.map((item: any, idx: number) => {
          const addr = item.address || {};
          const rawName = item.display_name || "";
          const nomeLimpo = rawName.split(",")[0].trim();
          const cidade = addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
          const uf = extrairUf(addr.state || "");
          const bairro = addr.neighbourhood || addr.suburb || "";
          const logradouro = addr.road || addr.name || "";
          const partes = [logradouro, bairro, cidade, uf].filter(Boolean);
          return {
            id: `nom-${idx}-${item.place_id}`,
            textoExibicao: partes.length > 0 ? partes.join(", ") : nomeLimpo,
            label: partes.length > 0 ? partes.join(", ") : nomeLimpo,
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
        const vistos = new Set<string>();
        return mapeados.filter((item) => {
          if (vistos.has(item.label)) return false;
          vistos.add(item.label);
          return true;
        });
      }
      return [];
    } catch {
      return [];
    }
  }

  async function buscarEscolas(query: string, isActive: () => boolean): Promise<any[]> {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("escolas")
        .select("id, nome, municipio, uf, codigo_inep, latitude, longitude")
        .ilike("nome", `%${query}%`)
        .order("nome")
        .limit(5);
      if (!isActive()) return [];
      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: `esc-${item.id}`,
          textoExibicao: `${item.nome} - ${item.municipio}, ${item.uf}`,
          label: item.nome,
          lat: item.latitude != null ? Number(item.latitude) : null,
          lng: item.longitude != null ? Number(item.longitude) : null,
          _tipo: "escola",
          _codigoInep: item.codigo_inep,
          _nome: item.nome,
        }));
      }
      return [];
    } catch { return []; }
  }

  function selecionarSugestao(sugestao: any) {
    if (sugestao._tipo === "escola") {
      setBuscaRaw(sugestao._nome);
      setSugestoes([]);
      setDropdownAberto(false);
      setBuscouSemResultados(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
      if (onSchoolSelect && sugestao._codigoInep) {
        onSchoolSelect(makeEscolaSlug(sugestao._codigoInep, sugestao._nome), sugestao._nome, sugestao.lat, sugestao.lng);
      }
      return;
    }

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
    if (!dropdownAberto || sugestoesArr.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        dispararBusca();
      }
      return;
    }

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
      } else {
        dispararBusca();
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

  const sugestoesArr = Array.isArray(sugestoes) ? sugestoes : [];
  const temTexto = buscaRaw.trim().length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
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
          placeholder="Buscar escola, cidade, endereço..."
          className="w-full bg-surface border border-border/50 rounded-full py-3 pl-11 pr-12 text-[15px] text-text placeholder:text-text-tertiary focus:outline-none focus:border-[#1f3b9b]/40 focus:ring-4 focus:ring-[#1f3b9b]/20 transition-all duration-300"
          autoComplete="off"
          spellCheck={false}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {carregando ? (
            <Loader2 className="w-4 h-4 text-text-tertiary animate-spin" />
          ) : temTexto ? (
            <button
              type="button"
              onClick={limparInput}
              className="p-1.5 rounded-full text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
              tabIndex={-1}
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={dispararBusca}
            className="p-1.5 rounded-full text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
            tabIndex={-1}
            aria-label="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

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
                        {sugestao._tipo === "escola" ? <GraduationCap className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
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
    </div>
  );
}
