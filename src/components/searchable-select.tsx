"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

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

function normalize(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function SearchableSelect({ label, value, options, series, grupos, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isSeries = !!series;

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
    if (open && !('ontouchstart' in window)) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <button onClick={() => { if (!disabled) setOpen(true); }} className="shrink-0 inline-flex items-center gap-1 px-2.5 md:gap-1.5 md:px-4 py-1.5 md:py-2 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled}>
        {getDisplay()}
        <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] animate-slide-up">
          <div className="absolute inset-0 bg-black/60 hidden sm:block" onClick={() => { setOpen(false); setSearch(""); }} />

          <div className="relative flex flex-col h-full sm:h-auto sm:max-w-sm sm:mx-auto sm:mt-16 sm:rounded-2xl sm:max-h-[80vh] sm:shadow-2xl sm:border sm:border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-[var(--color-border)] shrink-0 sm:pt-4 sm:pb-2">
              <h3 className="text-base font-semibold text-[var(--color-text)]">{label}</h3>
              <button onClick={() => { setOpen(false); setSearch(""); }} className="text-sm font-medium text-[var(--color-primary)] transition-colors">Concluir</button>
            </div>

            <div className="px-4 py-3 shrink-0 sm:py-2">
              <input ref={inputRef} className="w-full bg-[var(--color-bg)] rounded-xl px-4 py-3 sm:py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
                placeholder="Digite para buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-2 sm:pb-4">
              {isSeries ? (
                <>
                  {value && (
                    <button onClick={() => select("")}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] transition-colors italic">
                      Todas as etapas
                    </button>
                  )}
                  {filteredSeries!.length === 0 ? (
                    <p className="text-center text-xs text-[var(--color-text-tertiary)] py-6">Nenhuma s{'\u00e9'}rie encontrada</p>
                  ) : (
                    grupos!.map((grupo) => {
                      const items = filteredSeries!.filter((s) => s.grupo === grupo);
                      if (!items.length) return null;
                      return (
                        <div key={grupo}>
                          <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-3 pt-3 pb-1">{grupo}</p>
                          {items.map((s) => (
                            <button key={s.slug} onClick={() => select(s.slug)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                s.slug === value
                                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                              }`}>{s.nome}</button>
                          ))}
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <>
                  {value && (
                    <button onClick={() => select("")}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] transition-colors italic">
                      {isSeries ? "Todas as etapas" : "Todos"}
                    </button>
                  )}
                  {filteredOptions!.length === 0 ? (
                    <p className="text-center text-xs text-[var(--color-text-tertiary)] py-6">Nenhum resultado</p>
                  ) : (
                    filteredOptions!.map((opt) => (
                      <button key={opt} onClick={() => select(opt)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          opt === value
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                        }`}>{opt}</button>
                    ))
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
