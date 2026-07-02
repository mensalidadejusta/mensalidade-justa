"use client";

import { useState, useRef, useEffect } from "react";

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

  // Filter logic
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
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  function select(val: string) {
    onChange(val);
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <button onClick={() => { if (!disabled) setOpen(true); }} className="badge text-left" disabled={disabled}>
        {getDisplay()}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false); setSearch(""); }} />

          <div className="relative bg-white dark:bg-[#1e1e1f] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{label}</h3>
              <button onClick={() => { setOpen(false); setSearch(""); }} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">Fechar</button>
            </div>

            <div className="px-4 py-2 shrink-0">
              <input ref={inputRef} className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
                placeholder="Digite para buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {isSeries ? (
                filteredSeries!.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Nenhuma série encontrada</p>
                ) : (
                  grupos!.map((grupo) => {
                    const items = filteredSeries!.filter((s) => s.grupo === grupo);
                    if (!items.length) return null;
                    return (
                      <div key={grupo}>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">{grupo}</p>
                        {items.map((s) => (
                          <button key={s.slug} onClick={() => select(s.slug)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                              s.slug === value
                                ? "bg-[#3b82f6]/10 text-[#3b82f6] font-medium"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            }`}>{s.nome}</button>
                        ))}
                      </div>
                    );
                  })
                )
              ) : (
                filteredOptions!.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Nenhum resultado</p>
                ) : (
                  filteredOptions!.map((opt) => (
                    <button key={opt} onClick={() => select(opt)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        opt === value
                          ? "bg-[#3b82f6]/10 text-[#3b82f6] font-medium"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}>{opt}</button>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
