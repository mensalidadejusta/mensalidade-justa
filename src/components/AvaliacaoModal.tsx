"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, X, LogIn, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SERIES } from "@/lib/series";

const CRITERIOS = [
  { key: "nota_infraestrutura", label: "Infraestrutura" },
  { key: "nota_seguranca", label: "Segurança" },
  { key: "nota_pedagogico", label: "Pedagógico" },
  { key: "nota_acolhimento", label: "Acolhimento" },
  { key: "nota_cursos_extras", label: "Cursos extras" },
  { key: "nota_diversidade", label: "Diversidade" },
  { key: "nota_inclusao", label: "Inclusão" },
];

const grupos = [...new Set(SERIES.map((s) => s.grupo))];

type Props = {
  aberto: boolean;
  fechar: () => void;
  escolaId: number;
  escolaNome: string;
  onSalvo: () => void;
};

export default function AvaliacaoModal({ aberto, fechar, escolaId, escolaNome, onSalvo }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");

  function setNota(key: string, valor: number) {
    setNotas((prev) => ({ ...prev, [key]: valor }));
  }

  function toggleNota(key: string, valor: number) {
    setNota(key, notas[key] === valor ? 0 : valor);
  }

  const podeSalvar = !salvando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const res = await fetch("/api/avaliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escola_id: escolaId,
          user_id: user?.id || null,
          ...notas,
          comentario: comentario.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao enviar avaliação."); setSalvando(false); return; }
      setSalvo(true);
      setTimeout(() => { setSalvo(false); fechar(); onSalvo(); router.refresh(); }, 1200);
    } catch { setErro("Erro de conexão."); setSalvando(false); }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={fechar} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full sm:max-w-2xl mx-4 max-h-[90dvh] overflow-y-auto animate-bottom-sheet-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-text">Avaliar escola</h3>
          <button onClick={fechar} className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="text-sm font-medium text-text">{escolaNome}</p>
        </div>

        {!user ? (
          <div className="px-5 pb-5 text-center space-y-4">
            <p className="text-sm text-text-secondary">Faça login para avaliar esta escola.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 transition-all">
              <LogIn className="w-4 h-4" />
              Entrar
            </Link>
          </div>
        ) : salvo ? (
          <div className="px-5 py-8 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-text">Obrigado pela sua avaliação!</p>
            <p className="text-xs text-text-tertiary">Sua opinião ajuda outros pais.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CRITERIOS.map((c) => (
                <div key={c.key}>
                  <p className="text-sm font-medium text-text mb-2">{c.label}</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((estrela) => (
                      <button
                        key={estrela}
                        type="button"
                        onClick={() => toggleNota(c.key, estrela)}
                        className="w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:bg-surface-hover"
                        aria-label={`${estrela} estrela${estrela > 1 ? "s" : ""}`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            estrela <= (notas[c.key] || 0)
                              ? "fill-amber-400 text-amber-400"
                              : "text-border"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm font-medium text-text block mb-2">Comentário (opcional)</label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 1000))}
                placeholder="Conte sua experiência com esta escola..."
                rows={4}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors resize-none"
              />
              <p className="text-xs text-text-tertiary text-right mt-1">{comentario.length}/1000</p>
            </div>

            {erro && <p className="text-xs text-red-500 bg-red-500/10 rounded-lg p-3">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={fechar}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-hover text-text-secondary hover:text-text transition-all duration-200">
                Cancelar
              </button>
              <button type="submit" disabled={!podeSalvar}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:brightness-110 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed">
                {salvando ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
