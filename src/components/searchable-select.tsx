"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, X } from "lucide-react";

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
  isMultiple?: boolean;
  position?: "sheet" | "sidebar";
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
    <span className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center shrink-0 mr-3">
      <span className="w-2 h-2 rounded-full bg-primary" />
    </span>
  );
}

function RadioUnchecked() {
  return <span className="w-4 h-4 rounded-full border-2 border-border bg-transparent shrink-0 mr-3" />;
}

function CheckboxChecked() {
  return (
    <span className="w-4 h-4 rounded bg-primary flex items-center justify-center shrink-0 mr-3">
      <Check className="w-3 h-3 text-white" />
    </span>
  );
}

function CheckboxUnchecked() {
  return <span className="w-4 h-4 rounded border-2 border-border bg-transparent shrink-0 mr-3" />;
}

export default function SearchableSelect({ label, value, options, series, grupos, onChange, disabled, isMultiple, position = "sheet" }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isSeries = !!series;
  const multi = !!isMultiple;
  const title = TITLES[label] || label;
  const sidebar = position === "sidebar";

  const selectedArray = multi ? (value ? value.split(",") : []) : [];

  function getDisplay(): string {
    if (!value) return label;
    if (multi) {
      const arr = value.split(",");
      if (arr.length === 0) return label;
      if (arr.length === 1 && isSeries) {
        const found = series!.find((s) => s.slug === arr[0]);
        return found ? found.nome : arr[0];
      }
      return `${arr.length} selecionados`;
    }
    if (isSeries) {
      const found = series!.find((s) => s.slug === value);
      return found ? found.nome : value;
    }
    return value;
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
    if (open && !sidebar) {
      document.body.style.overflow = "hidden";
      if (!('ontouchstart' in window)) setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, sidebar]);

  function openSheet() {
    if (disabled) return;
    setSearch("");
    setDraftValue(value);
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
  }

  function applyDraft() {
    onChange(draftValue);
    closeSheet();
  }

  function clearDraft() {
    setDraftValue("");
    onChange("");
    closeSheet();
  }

  function handleSelect(val: string) {
    if (sidebar) {
      if (multi) {
        const arr = draftValue ? draftValue.split(",").filter(Boolean) : [];
        if (!val) { setDraftValue(""); return; }
        if (arr.includes(val)) {
          const next = arr.filter((v) => v !== val);
          setDraftValue(next.length > 0 ? next.join(",") : "");
        } else {
          setDraftValue([...arr, val].join(","));
        }
      } else {
        setDraftValue(val);
      }
    } else {
      if (multi) {
        const arr = value ? value.split(",").filter(Boolean) : [];
        if (!val) { onChange(""); return; }
        if (arr.includes(val)) {
          const next = arr.filter((v) => v !== val);
          onChange(next.length > 0 ? next.join(",") : "");
        } else {
          onChange([...arr, val].join(","));
        }
      } else {
        onChange(val);
      }
    }
  }

  function isSelected(slug: string): boolean {
    if (sidebar) {
      if (multi) return draftValue.split(",").filter(Boolean).includes(slug);
      return slug === draftValue;
    }
    if (multi) return selectedArray.includes(slug);
    return slug === value;
  }

  const isAllSelected = sidebar ? !draftValue : !value;

  const handleDragEnd = useCallback((_: any, info: any) => {
    if (info.offset.y > 150) closeSheet();
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

  const sidebarVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0, transition: { type: "spring" as const, damping: 25, stiffness: 200 } },
    exit: { x: "-100%", transition: { type: "spring" as const, damping: 20, stiffness: 200 } },
  };

  const Indicator = ({ slug }: { slug: string }) => {
    if (multi) return isSelected(slug) ? <CheckboxChecked /> : <CheckboxUnchecked />;
    return isSelected(slug) ? <RadioChecked /> : <RadioUnchecked />;
  };

  const optionsList = (
    <div className="w-full divide-y divide-border/80 border-t border-b border-border/80">
      <button
        onClick={() => handleSelect("")}
        className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors italic hover:bg-surface text-text-tertiary`}
      >
        <span className="flex items-center">
          {multi ? (isAllSelected ? <CheckboxChecked /> : <CheckboxUnchecked />) : (isAllSelected ? <RadioChecked /> : <RadioUnchecked />)}
          {isSeries ? "Todas as etapas" : "Todos"}
        </span>
      </button>

      {isSeries ? (
        grupos!.map((grupo) => {
          const items = (filteredSeries as SerieItem[]).filter((s) => s.grupo === grupo);
          if (!items.length) return null;
          return (
            <div key={grupo}>
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider px-4 pt-3 pb-1">{grupo}</p>
              {items.map((s) => {
                const sel = isSelected(s.slug);
                return (
                  <button key={s.slug} onClick={() => handleSelect(s.slug)}
                    className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors ${sel ? "bg-primary/5 text-text font-medium" : "text-text-secondary hover:bg-surface"}`}
                  >
                    <span className="flex items-center min-w-0">
                      <Indicator slug={s.slug} />
                      <span className="truncate">{s.nome}</span>
                    </span>
                    {sel && !multi && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          );
        })
      ) : (
        (filteredOptions as string[]).map((opt) => {
          const sel = isSelected(opt);
          return (
            <button key={opt} onClick={() => handleSelect(opt)}
              className={`flex items-center justify-between w-full text-left px-4 py-2.5 text-sm transition-colors ${sel ? "bg-primary/5 text-text font-medium" : "text-text-secondary hover:bg-surface"}`}
            >
              <span className="flex items-center min-w-0">
                <Indicator slug={opt} />
                <span className="truncate">{opt}</span>
              </span>
              {sel && !multi && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <button onClick={openSheet}
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-surface-hover border-transparent text-text-secondary transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {getDisplay()}
        <ChevronDown className="w-3 h-3 text-text-tertiary" />
      </button>

      <AnimatePresence>
        {open && sidebar && (
          <div className="fixed inset-0 z-40 lg:block hidden">
            <motion.div className="absolute inset-0 bg-black/40" variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={closeSheet} />
            <motion.div className="fixed left-16 top-0 bottom-0 w-80 z-50 bg-bg border-r border-border shadow-2xl flex flex-col"
              variants={sidebarVariants} initial="hidden" animate="visible" exit="exit"
            >
              <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <button onClick={closeSheet} className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pb-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none z-10" />
                  <input ref={inputRef}
                    className="w-full bg-surface rounded-xl pl-10 pr-4 py-2 text-sm text-text placeholder:text-text-tertiary outline-none border border-border transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="Digite para buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {!showOptions || showOptions.length === 0 ? (
                  <p className="text-center text-xs text-text-tertiary py-8">Nenhum resultado encontrado</p>
                ) : optionsList}
              </div>

              <div className="shrink-0 border-t border-border px-4 py-3 flex gap-2">
                <button onClick={applyDraft}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all duration-200 active:scale-[0.98]"
                >
                  Aplicar Filtros
                </button>
                <button onClick={clearDraft}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-surface-hover text-text-secondary hover:bg-surface-hover hover:text-text transition-all duration-200"
                >
                  Limpar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {open && !sidebar && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            <motion.div className="absolute inset-0 bg-black/70" variants={overlayVariants} initial="hidden" animate="visible" exit="exit" onClick={closeSheet} />

            <motion.div ref={sheetRef}
              className="fixed bottom-0 inset-x-0 w-full sm:relative sm:max-w-lg sm:rounded-2xl rounded-t-[2rem] bg-bg border border-border flex flex-col shadow-2xl overflow-hidden sm:mx-4"
              style={{ height: "90dvh" }}
              variants={sheetVariants} initial="hidden" animate="visible" exit="exit"
              drag={typeof window !== "undefined" && window.innerWidth < 640 ? "y" : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
            >
              <div className="flex justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing sm:hidden">
                <div className="w-12 h-1 rounded-full bg-surface-hover" />
              </div>

              <div className="flex items-center justify-between px-5 pb-3 shrink-0">
                <h2 className="text-base font-semibold text-text">{title}</h2>
                <button onClick={closeSheet} className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">Concluir</button>
              </div>

              <div className="px-4 pb-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none z-10" />
                  <input ref={inputRef}
                    className="w-full bg-surface rounded-xl pl-10 pr-4 py-2.5 text-sm text-text placeholder:text-text-tertiary outline-none border border-border transition-all duration-300 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="Digite para buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pb-4">
                {!showOptions || showOptions.length === 0 ? (
                  <p className="text-center text-xs text-text-tertiary py-8">Nenhum resultado encontrado</p>
                ) : optionsList}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
