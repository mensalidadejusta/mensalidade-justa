"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function RadioChecked() {
  return (
    <span className="w-4 h-4 rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center shrink-0 mr-3">
      <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
    </span>
  );
}

function RadioUnchecked() {
  return <span className="w-4 h-4 rounded-full border-2 border-neutral-700 bg-transparent shrink-0 mr-3" />;
}

export default function SearchableSelect({ label, value, options, series, grupos, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
  }

  function select(val: string) {
    onChange(val);
  }

  const handleDragEnd = useCallback((_: any, info: any) => {
    if (info.offset.y > 150) {
      closeSheet();
    }
  }, []);

  const showOptions = isSeries ? filteredSeries : filteredOptions;

  const sheetVariants = {
    hidden: { y: "100%" },
    visible: { y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 200 } },
    exit: { y: "100%", transition: { type: "spring" as const, damping: 20, stiffness: 200 } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <>
      <button
        onClick={openSheet}
        className="shrink-0 inline-flex items-center gap-1 px-2.5 md:gap-1.5 md:px-4 py-1.5 md:py-2 rounded-full text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {getDisplay()}
        <ChevronDown className="w-3 h-3 text-[var(--color-text-tertiary)]" />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/70"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeSheet}
            />

            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              className="relative w-full sm:max-w-lg sm:rounded-2xl rounded-t-[2rem] bg-[#131314] border border-neutral-800 flex flex-col shadow-2xl overflow-hidden sm:mx-4"
              style={{ maxHeight: "85dvh" }}
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={typeof window !== "undefined" && window.innerWidth < 640 ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing sm:hidden">
                <div className="w-12 h-1 rounded-full bg-neutral-700" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
                <button onClick={closeSheet} className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors">
                  Concluir
                </button>
              </div>

              {/* Search */}
              <div className="px-4 pb-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none z-10" />
                  <input
                    ref={inputRef}
                    className="w-full bg-neutral-900 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-tertiary)] outline-none border border-neutral-800 transition-all duration-300 focus:border-[var(--color-primary)]/50 focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    placeholder="Digite para buscar..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="flex-1 overflow-y-auto">
                {!showOptions || showOptions.length === 0 ? (
                  <p className="text-center text-xs text-[var(--color-text-tertiary)] py-8">
                    Nenhum resultado encontrado
                  </p>
                ) : (
                  <div className="w-full divide-y divide-neutral-800/80 border-t border-b border-neutral-800/80">
                    {/* "All" option */}
                    {value && (
                      <button
                        onClick={() => select("")}
                        className="flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors text-[var(--color-text-tertiary)] italic hover:bg-neutral-900"
                      >
                        <span className="flex items-center">
                          {!value ? <RadioChecked /> : <RadioUnchecked />}
                          {isSeries ? "Todas as etapas" : "Todos"}
                        </span>
                      </button>
                    )}

                    {isSeries ? (
                      grupos!.map((grupo) => {
                        const items = (filteredSeries as SerieItem[]).filter((s) => s.grupo === grupo);
                        if (!items.length) return null;
                        return (
                          <div key={grupo}>
                            <p className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider px-4 pt-3 pb-1">
                              {grupo}
                            </p>
                            {items.map((s) => {
                              const selected = s.slug === value;
                              return (
                                <button
                                  key={s.slug}
                                  onClick={() => select(s.slug)}
                                  className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors ${
                                    selected
                                      ? "bg-[var(--color-primary)]/5 text-neutral-100 font-medium"
                                      : "text-[var(--color-text-secondary)] hover:bg-neutral-900"
                                  }`}
                                >
                                  <span className="flex items-center min-w-0">
                                    {selected ? <RadioChecked /> : <RadioUnchecked />}
                                    <span className="truncate">{s.nome}</span>
                                  </span>
                                  {selected && <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-2" />}
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
                            className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              selected
                                ? "bg-[var(--color-primary)]/5 text-neutral-100 font-medium"
                                : "text-[var(--color-text-secondary)] hover:bg-neutral-900"
                            }`}
                          >
                            <span className="flex items-center min-w-0">
                              {selected ? <RadioChecked /> : <RadioUnchecked />}
                              <span className="truncate">{opt}</span>
                            </span>
                            {selected && <Check className="w-4 h-4 text-[var(--color-primary)] shrink-0 ml-2" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
