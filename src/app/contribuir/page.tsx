"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { SERIES, GRUPOS } from "@/lib/series";
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowRight, Search, ChevronDown } from "lucide-react";

const A = (n: number) => String.fromCodePoint(n);

export default function ContribuirPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = useRef(createClient());

  const [escolaQuery, setEscolaQuery] = useState("");
  const [escolasSugestoes, setEscolasSugestoes] = useState<any[]>([]);
  const [escolaSelected, setEscolaSelected] = useState<any>(null);
  const [serieSlug, setSerieSlug] = useState("");
  const [mensalidade, setMensalidade] = useState("");
  const [matricula, setMatricula] = useState("");
  const [material, setMaterial] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (escolaQuery.length < 3 || escolaSelected) { setEscolasSugestoes([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.current
        .from("escolas")
        .select("id, nome, bairro, municipio, uf")
        .ilike("nome", `%${escolaQuery}%`)
        .order("nome")
        .limit(8);
      if (data) setEscolasSugestoes(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [escolaQuery, escolaSelected]);

  const handleSelect = (escola: any) => {
    setEscolaSelected(escola);
    setEscolaQuery(escola.nome);
    setEscolasSugestoes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolaSelected || !serieSlug) return;
    setSaving(true); setError("");
    const serie = SERIES.find((s) => s.slug === serieSlug);
    const { data: { user } } = await supabase.current.auth.getUser();

    const { error: err } = await supabase.current.from("mensalidades_series").insert({
      escola_id: escolaSelected.id,
      serie_slug: serieSlug,
      serie_nome: serie?.nome || serieSlug,
      user_id: user?.id || null,
      valor_mensalidade: mensalidade ? parseFloat(mensalidade) : null,
      valor_matricula: matricula ? parseFloat(matricula) : null,
      valor_material: material ? parseFloat(material) : null,
      ano_vigencia: new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0),
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(true);
  };

  function resetForm() {
    setEscolaSelected(null);
    setEscolaQuery("");
    setSerieSlug("");
    setMensalidade("");
    setMatricula("");
    setMaterial("");
    setSaved(false);
    setError("");
  }

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-tertiary">Carregando...</div></div>;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto mt-6 md:mt-12 px-4">
        <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
          <div className="text-center space-y-2 mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight">Contribuir</h1>
            <p className="text-sm text-text-secondary">Ajude outros pais com informa{A(0x00E7)}{A(0x00F5)}es reais.</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-bg rounded-lg border border-border/50 text-sm text-text-secondary leading-relaxed mb-6">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div><strong className="text-text">Anonimato total.</strong><br />Pedimos login apenas para evitar fraudes. Escolas nunca recebem seus dados.</div>
          </div>
          <div className="space-y-3">
            <Link href="/login" className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-primary text-white font-medium text-sm hover:brightness-110 transition-all">
              Entrar para contribuir
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/cadastro" className="block text-center py-3 px-6 rounded-xl border border-border/50 text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors">
              Criar conta gratuita
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-semibold text-text">Obrigado!</h1>
          <p className="text-sm text-text-secondary">Sua contribui{A(0x00E7)}{A(0x00E3)}o foi salva de forma an{A(0x00F4)}nima.</p>
          <button onClick={resetForm} className="py-3 px-6 rounded-xl bg-primary text-white font-medium text-sm hover:brightness-110 transition-all">
            Contribuir novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-6 md:mt-12 px-4">
      <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border/50 shadow-sm">
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight">Contribuir com valores</h1>
          <p className="text-sm text-text-secondary">Informe os valores de uma escola de forma an{A(0x00F4)}nima.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* School search */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium text-text-secondary block">Escola</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-bg border border-border/50 rounded-xl text-text placeholder:text-text-tertiary text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors"
                placeholder="Digite o nome da escola..."
                value={escolaQuery}
                onChange={(e) => { setEscolaQuery(e.target.value); setEscolaSelected(null); }}
              />
              {escolasSugestoes.length > 0 && (
                <ul className="absolute z-10 top-full mt-1 w-full bg-surface border border-border/50 rounded-xl shadow-lg overflow-hidden">
                  {escolasSugestoes.map((e) => (
                    <li key={e.id} onClick={() => handleSelect(e)}
                      className="px-4 py-2.5 text-sm cursor-pointer hover:bg-surface-hover border-b border-border/50 last:border-0">
                      <div className="font-medium text-text truncate">{e.nome}</div>
                      <div className="text-xs text-text-tertiary">{e.bairro && `${e.bairro}, `}{e.municipio} - {e.uf}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Series dropdown */}
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium text-text-secondary block">S{A(0x00E9)}rie / Ano</label>
            <div className="relative">
              <select
                className="w-full appearance-none px-4 py-2.5 pr-10 bg-bg border border-border/50 rounded-xl text-text text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors"
                value={serieSlug}
                onChange={(e) => setSerieSlug(e.target.value)}
                required
              >
                <option value="">Selecione a s{A(0x00E9)}rie</option>
                {GRUPOS.map((grupo) => (
                  <optgroup key={grupo} label={grupo}>
                    {SERIES.filter((s) => s.grupo === grupo).map((s) => (
                      <option key={s.slug} value={s.slug}>{s.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
            </div>
          </div>

          {/* Price fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-text-secondary block">Mensalidade (R$)</label>
              <input
                className="w-full px-4 py-2.5 bg-bg border border-border/50 rounded-xl text-text placeholder:text-text-tertiary text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors"
                type="number" step="0.01" min="0" placeholder="0,00" value={mensalidade}
                onChange={(e) => setMensalidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-text-secondary block">Matr{A(0x00ED)}cula (R$)</label>
              <input
                className="w-full px-4 py-2.5 bg-bg border border-border/50 rounded-xl text-text placeholder:text-text-tertiary text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors"
                type="number" step="0.01" min="0" placeholder="0,00" value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-text-secondary block">Material (R$)</label>
              <input
                className="w-full px-4 py-2.5 bg-bg border border-border/50 rounded-xl text-text placeholder:text-text-tertiary text-sm focus:outline-none focus:border-border focus:ring-1 focus:ring-border transition-colors"
                type="number" step="0.01" min="0" placeholder="0,00" value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
            </div>
          </div>

          {/* Privacy notice */}
          <div className="flex items-start gap-2 p-3 bg-bg rounded-lg border border-border/50">
            <ShieldCheck className="w-4 h-4 text-text-tertiary shrink-0 mt-0.5" />
            <p className="text-xs text-text-tertiary leading-relaxed">
              Seus dados s{A(0x00E3)}o an{A(0x00F4)}nimos. Nenhuma informa{A(0x00E7)}{A(0x00E3)}o pessoal {A(0x00E9)} vinculada aos valores informados.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger/10 rounded-lg border border-danger/20">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <button
            className="w-full md:w-auto md:px-8 py-3 bg-text text-bg font-medium rounded-xl text-sm hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={saving || !escolaSelected || !serieSlug}
          >
            {saving ? "Salvando..." : "Salvar contribui{A(0x00E7)}{A(0x00E3)}o"}
          </button>
        </form>
      </div>
    </div>
  );
}
