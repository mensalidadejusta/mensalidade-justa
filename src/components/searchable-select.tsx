"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function SearchableSelect({ label, value, options, onChange, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? options.filter((o) => o.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(
        search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      ))
    : options;

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
      <button
        onClick={() => { if (!disabled) setOpen(true); }}
        className="badge flex-1 text-left"
        disabled={disabled}
      >
        {value || label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => { setOpen(false); setSearch(""); }} />

          {/* Panel */}
          <div className="relative bg-white dark:bg-[#1e1e1f] w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[70vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{label}</h3>
              <button
                onClick={() => { setOpen(false); setSearch(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                Fechar
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-2">
              <input
                ref={inputRef}
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30"
                placeholder="Digite para buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Options list */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6">Nenhum resultado</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => select(opt)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      opt === value
                        ? "bg-[#3b82f6]/10 text-[#3b82f6] font-medium"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
