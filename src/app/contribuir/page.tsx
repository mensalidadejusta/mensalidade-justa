"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import { SERIES, GRUPOS } from "@/lib/series";

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

  if (authLoading) return <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-[var(--color-text-tertiary)]">Carregando...</div></div>;

  if (!user) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Contribuir</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Ajude outros pais com informações reais.</p>
        </div>
        <div className="card space-y-5">
          <div className="flex items-start gap-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
            <span className="text-2xl">🛡️</span>
            <div><strong style={{ color: 'var(--color-text)' }}>Anonimato total.</strong><br />Pedimos login apenas para evitar fraudes. Escolas nunca recebem seus dados.</div>
          </div>
          <div className="space-y-3 pt-2">
            <Link href="/login" className="gradient-btn py-3 px-6 rounded-xl block text-center">Entrar para contribuir</Link>
            <Link href="/cadastro" className="btn-outline block text-center">Criar conta gratuita</Link>
          </div>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h1 className="text-xl font-semibold">Obrigado!</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Sua contribuição foi salva de forma anônima.</p>
          <button onClick={resetForm} className="gradient-btn py-3 px-6 rounded-xl">Contribuir novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold">Contribuir</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">Informe os valores de uma escola.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        {/* School search */}
        <div className="relative">
          <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Escola</label>
          <input className="input-field" placeholder="Digite o nome da escola..." value={escolaQuery}
            onChange={(e) => { setEscolaQuery(e.target.value); setEscolaSelected(null); }} />
          {escolasSugestoes.length > 0 && (
            <ul className="absolute z-10 top-full mt-1 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden">
              {escolasSugestoes.map((e) => (
                <li key={e.id} onClick={() => handleSelect(e)}
                  className="px-4 py-2.5 text-sm cursor-pointer hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] last:border-0">
                  <div className="font-medium truncate">{e.nome}</div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">{e.bairro && `${e.bairro}, `}{e.municipio} - {e.uf}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Series dropdown grouped */}
        <div>
          <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Série / Ano</label>
          <select className="select-field" value={serieSlug} onChange={(e) => setSerieSlug(e.target.value)} required>
            <option value="">Selecione a série</option>
            {GRUPOS.map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {SERIES.filter((s) => s.grupo === grupo).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Price fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Mensalidade (R$)</label>
            <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={mensalidade}
              onChange={(e) => setMensalidade(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Matrícula (R$)</label>
            <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={matricula}
              onChange={(e) => setMatricula(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-secondary)] block mb-1">Material (R$)</label>
            <input className="input-field" type="number" step="0.01" min="0" placeholder="0,00" value={material}
              onChange={(e) => setMaterial(e.target.value)} />
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-danger)] bg-red-50 dark:bg-red-900/20 rounded-lg p-3">{error}</p>}

        <button className="gradient-btn py-3 px-6 rounded-xl w-full" disabled={saving || !escolaSelected || !serieSlug}>
          {saving ? "Salvando..." : "Salvar contribuição"}
        </button>
      </form>
    </div>
  );
}
