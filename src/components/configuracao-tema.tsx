"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";

const OPCOES = [
  { key: "system", label: "Usar tema do sistema", icone: Monitor },
  { key: "light", label: "Claro", icone: Sun },
  { key: "dark", label: "Escuro", icone: Moon },
] as const;

export default function ConfiguracaoTema() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Tema</h3>
        <div className="flex gap-2">
          {OPCOES.map((opcao) => (
            <div
              key={opcao.key}
              className="flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-surface border border-border opacity-50"
            >
              <opcao.icone className="w-5 h-5 text-text-tertiary" />
              <span className="text-[11px] font-medium text-text-tertiary text-center leading-tight">
                {opcao.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text">Tema</h3>
      <div className="flex gap-2">
        {OPCOES.map((opcao) => {
          const ativo = theme === opcao.key;
          const Icon = opcao.icone;
          return (
            <button
              key={opcao.key}
              onClick={() => setTheme(opcao.key)}
              className={`flex-1 flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all duration-200 active:scale-95 ${
                ativo
                  ? "bg-purple-500/10 border-2 border-purple-500/40 text-purple-400"
                  : "bg-surface border border-border text-text-tertiary hover:text-text hover:border-border-hover"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium text-center leading-tight">
                {opcao.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
