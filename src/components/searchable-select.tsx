"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

type SerieItem = { slug: string; nome: string; grupo: string };

type Props = {
  label: string;
  value: string;
  options?: string[];
  series?: SerieItem[];
  grupos?: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

const TITLES: Record<string, string> = {
  UF: "Selecionar Estado",
  Cidade: "Selecionar Cidade",
  Etapa: "Selecionar Etapa",
};

function normalize(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function SearchableSelect({ label, value, options, series, grupos, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isSeries = !!series;
  const title = TITLES[label] || label;

  function getDisplay(): string {
    if (value) {
      if (isSeries) {
        const found = series!.find((s) => s.slug === value);
        return found ? found.nome : value;
      }
      return value;
    }
    return label;
  }

  const filteredSeries = !isSeries
    ? null
    : search
      ? series!.filter((s) => normalize(s.nome).includes(normalize(search)))
      : series!;

  const filteredOptions = isSeries
    ? null
    : search
      ? options!.filter((o) => normalize(o).includes(normalize(search)))
      : options!;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (!('ontouchstart' in window)) {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function openSheet() {
    if (disabled) return;
    setSearch("");
    setClosing(false);
    setOpen(true);
  }

  function closeSheet() {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 200);
  }

  function select(val: string) {
    onChange(val);
    closeSheet();
  }

  const showOptions = isSeries ? filteredSeries : filteredOptions;

  return (
    <>
      <button onClick={openSheet} className="shrink-0 inline-flex items-center gap-1 px-2.5 md:gap-1.5 md:px-4 py-1.5 md:py-2 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled}>
        {getDisplay()}
        <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          {/* Overlay */}
          <div
            className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
            onClick={closeSheet}
          />

          {/* Panel */}
          <div
            className={`relative w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl bg-[#1e1e1e] flex flex-col shadow-2xl border border-[var(--color-border)] transition-all duration-200 ${
              closing
                ? "translate-y-full opacity-0"
                : "translate-y-0 opacity-100"
            }`}
            style={{ maxHeight: "85dvh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1 shrink-0 sm:hidden">
              <div className="w-8 h-1 rounded-full bg-[#3c4043]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
              <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
              <button onClick={closeSheet} className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                Concluir
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 shrink-0">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none z-10" />
                <input
                  ref={inputRef}
                  className="w-full bg-[#131314] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none border border-[var(--color-border)] transition-all duration-300 focus:border-transparent focus:ring-2 focus:ring-[#4285f4]/50 group-focus-within:border-transparent"
                  placeholder="Digite para buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Options list */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-2 pb-4">
              {/* "All" option */}
              {value && (
                <button
                  onClick={() => select("")}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm text-[var(--color-text-tertiary)] hover:bg-[#2a2a2a]/80 transition-colors italic"
                >
                  {isSeries ? "Todas as etapas" : "Todos"}
                  {!value && <Check className="w-4 h-4 text-[var(--color-primary)]" />}
                </button>
              )}

              {!showOptions || showOptions.length === 0 ? (
                <p className="text-center text-xs text-[var(--color-text-tertiary)] py-8">
                  Nenhum resultado encontrado
                </p>
              ) : isSeries ? (
                grupos!.map((grupo) => {
                  const items = (filteredSeries as SerieItem[]).filter((s) => s.grupo === grupo);
                  if (!items.length) return null;
                  const isSelectedGroup = items.some((s) => s.slug === value);
                  return (
                    <div key={grupo}>
                      <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-3 pt-4 pb-1">
                        {grupo}
                      </p>
                      {items.map((s) => {
                        const selected = s.slug === value;
                        return (
                          <button
                            key={s.slug}
                            onClick={() => select(s.slug)}
                            className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
                              selected
                                ? "bg-blue-500/10 text-blue-400 font-medium"
                                : "text-[var(--color-text-secondary)] hover:bg-[#2a2a2a]/80"
                            }`}
                          >
                            <span>{s.nome}</span>
                            {selected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              ) : (
                (filteredOptions as string[]).map((opt) => {
                  const selected = opt === value;
                  return (
                    <button
                      key={opt}
                      onClick={() => select(opt)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all duration-200 ${
                        selected
                          ? "bg-blue-500/10 text-blue-400 font-medium"
                          : "text-[var(--color-text-secondary)] hover:bg-[#2a2a2a]/80"
                      }`}
                    >
                      <span>{opt}</span>
                      {selected && <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
