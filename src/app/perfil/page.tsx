"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DollarSign, LogOut, Key, Trash2, Award, Plus, School, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

type Contribuicao = {
  id: string;
  serie_nome: string;
  valor_mensalidade: number | null;
  valor_matricula: number | null;
  valor_material: number | null;
  ano_vigencia: number;
  escola_nome: string;
};

function fmtBr(valor: number | null): string {
  if (valor == null) return "—";
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [contribuicoes, setContribuicoes] = useState<Contribuicao[]>([]);
  const [loadingContrib, setLoadingContrib] = useState(true);
  const [contribuicaoEditando, setContribuicaoEditando] = useState<Contribuicao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const supabase = createClient();

  async function carregarContribuicoes() {
    if (!user) return;
    setLoadingContrib(true);
    const { data } = await supabase
      .from("mensalidades_series")
      .select("id, serie_nome, valor_mensalidade, valor_matricula, valor_material, ano_vigencia, escola_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      const escolaIds = [...new Set(data.map((r) => r.escola_id))];
      const { data: escolas } = await supabase
        .from("escolas")
        .select("id, nome")
        .in("id", escolaIds);
      const escolaMap = new Map((escolas || []).map((e) => [e.id, e.nome]));
      setContribuicoes(
        data.map((r) => ({
          id: r.id,
          serie_nome: r.serie_nome,
          valor_mensalidade: r.valor_mensalidade,
          valor_matricula: r.valor_matricula,
          valor_material: r.valor_material,
          ano_vigencia: r.ano_vigencia,
          escola_nome: escolaMap.get(r.escola_id) || "Escola não encontrada",
        }))
      );
    }
    setLoadingContrib(false);
  }

  useEffect(() => { carregarContribuicoes(); }, [user]);

  async function handleSalvarEdicao(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!contribuicaoEditando) return;
    setSalvando(true);
    const form = e.currentTarget;
    const ano = Number((form.elements.namedItem("ano") as HTMLInputElement).value);
    const mensalidade = (form.elements.namedItem("mensalidade") as HTMLInputElement).value;
    const matricula = (form.elements.namedItem("matricula") as HTMLInputElement).value;
    const material = (form.elements.namedItem("material") as HTMLInputElement).value;
    const { error } = await supabase
      .from("mensalidades_series")
      .update({
        ano_vigencia: ano,
        valor_mensalidade: mensalidade ? parseFloat(mensalidade) : null,
        valor_matricula: matricula ? parseFloat(matricula) : null,
        valor_material: material ? parseFloat(material) : null,
      })
      .eq("id", contribuicaoEditando.id);
    setSalvando(false);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }
    setContribuicaoEditando(null);
    carregarContribuicoes();
  }

  async function handleExcluirContribuicao() {
    if (!contribuicaoEditando) return;
    const { error } = await supabase
      .from("mensalidades_series")
      .delete()
      .eq("id", contribuicaoEditando.id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
      return;
    }
    setConfirmandoExclusao(false);
    setContribuicaoEditando(null);
    carregarContribuicoes();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/busca");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("excluir_minha_conta");
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/busca");
    } catch (err: any) {
      alert(err.message || "Erro ao excluir conta. Tente novamente.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (authLoading) {
    return <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-text-tertiary">Carregando...</div></div>;
  }

  if (!user) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-text">Perfil</h1>
          <p className="text-sm text-text-secondary">Faça login para acessar seu perfil.</p>
        </div>
        <div className="space-y-3">
          <Link href="/login" className="block w-full py-3 px-6 rounded-xl bg-primary text-white text-center text-sm font-medium hover:brightness-110 transition-all">Entrar</Link>
          <Link href="/cadastro" className="block w-full py-3 px-6 rounded-xl border border-border text-text-secondary text-center text-sm font-medium hover:bg-surface-hover transition-colors">Criar conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Coluna principal (2/3) */}
        <div className="md:col-span-2 space-y-6">

          {/* Card do Perfil */}
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <School className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-text truncate">{user.email}</h1>
                <p className="text-sm text-text-secondary">Seu perfil</p>
              </div>
            </div>
          </div>

          {/* Minhas Contribuições */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <h2 className="text-base font-semibold text-text">Minhas Contribuições</h2>
              </div>
              <Link href="/contribuir" className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
                <Plus className="w-3.5 h-3.5" />
                Nova
              </Link>
            </div>

            {loadingContrib ? (
              <div className="text-sm text-text-tertiary animate-pulse">Carregando contribuições...</div>
            ) : contribuicoes.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <Plus className="w-10 h-10 text-text-tertiary/40 mx-auto" />
                <p className="text-sm text-text-secondary">Você ainda não fez nenhuma contribuição.</p>
                <Link href="/contribuir" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                  <DollarSign className="w-3.5 h-3.5" />
                  Adicionar mensalidades
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {contribuicoes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-surface-hover/50 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text truncate">{c.escola_nome}</p>
                      <p className="text-xs text-text-tertiary">{c.serie_nome} &middot; {c.ano_vigencia}</p>
                    </div>
                    <span className="font-semibold text-text whitespace-nowrap">{fmtBr(c.valor_mensalidade)}</span>
                    <button onClick={() => setContribuicaoEditando(c)}
                      className="text-text-tertiary hover:text-text p-1 rounded-md transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Coluna lateral (1/3) */}
        <div className="space-y-6">

          {/* Ações da conta */}
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border">
            <Link href="/alterar-senha" className="flex items-center gap-3 px-5 py-4 text-sm text-text hover:bg-surface-hover transition-colors">
              <Key className="w-4 h-4 text-text-tertiary" />
              <span className="flex-1">Alterar senha</span>
              <span className="text-text-tertiary">&rarr;</span>
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-5 py-4 text-sm text-text hover:bg-surface-hover transition-colors text-left">
              <LogOut className="w-4 h-4 text-text-tertiary" />
              <span className="flex-1">Sair</span>
              <span className="text-text-tertiary">&rarr;</span>
            </button>
          </div>

          {/* Ranking Placeholder */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-text-tertiary" />
              <h2 className="text-base font-semibold text-text">Ranking de Contribuintes</h2>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              <em>Em breve</em> &mdash; Adicione mais mensalidades para subir no ranking e ajudar a comunidade!
            </p>
          </div>

          {/* Excluir conta */}
          <div className="bg-surface border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-base font-semibold text-red-500">Excluir conta</h2>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed mb-4">
              Seus dados de identificação serão removidos permanentemente. As médias das mensalidades que você enviou serão preservadas de forma anônima.
            </p>

            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4" />
                Excluir minha conta
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-red-500 font-medium">Tem certeza? Esta ação é irreversível.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 px-4 rounded-xl border border-border text-sm font-medium text-text hover:bg-surface-hover transition-colors">Cancelar</button>
                  <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">{deleting ? "Excluindo..." : "Sim, excluir"}</button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal de edição */}
      {contribuicaoEditando && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[600] p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-text">Editar contribuição</h3>
              <button onClick={() => setContribuicaoEditando(null)} className="text-text-tertiary hover:text-text p-1 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSalvarEdicao}>
              <p className="text-sm font-medium text-text mb-1">{contribuicaoEditando.escola_nome}</p>
              <p className="text-xs text-text-tertiary mb-4">{contribuicaoEditando.serie_nome}</p>

              <label className="block text-xs text-text-secondary mb-1">Ano de Vigência</label>
              <input type="number" name="ano" defaultValue={contribuicaoEditando.ano_vigencia}
                className="w-full mb-3 px-3 py-2 rounded-xl bg-surface-hover border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

              <label className="block text-xs text-text-secondary mb-1">Valor da Mensalidade (R$)</label>
              <input type="number" name="mensalidade" step="0.01" defaultValue={contribuicaoEditando.valor_mensalidade ?? ""}
                className="w-full mb-3 px-3 py-2 rounded-xl bg-surface-hover border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

              <label className="block text-xs text-text-secondary mb-1">Valor da Matrícula (R$)</label>
              <input type="number" name="matricula" step="0.01" defaultValue={contribuicaoEditando.valor_matricula ?? ""}
                className="w-full mb-3 px-3 py-2 rounded-xl bg-surface-hover border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

              <label className="block text-xs text-text-secondary mb-1">Valor do Material (R$)</label>
              <input type="number" name="material" step="0.01" defaultValue={contribuicaoEditando.valor_material ?? ""}
                className="w-full mb-5 px-3 py-2 rounded-xl bg-surface-hover border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

              <div className="flex items-center gap-3">
                {!confirmandoExclusao ? (
                  <button type="button" onClick={() => setConfirmandoExclusao(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors mr-auto">
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                ) : (
                  <button type="button" onClick={handleExcluirContribuicao}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white bg-red-500 hover:brightness-110 transition-colors mr-auto">
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão?
                  </button>
                )}
                <button type="button" onClick={() => { setConfirmandoExclusao(false); setContribuicaoEditando(null); }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-border text-sm font-medium text-text hover:bg-surface-hover transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
