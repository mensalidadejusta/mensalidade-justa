"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const supabase = createClient();

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
    return <div className="flex-1 flex items-center justify-center"><div className="animate-pulse text-gray-300">Carregando...</div></div>;
  }

  if (!user) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="text-sm text-gray-500">Faça login para acessar seu perfil.</p>
        </div>
        <div className="space-y-3">
          <Link href="/login" className="btn-primary block text-center">Entrar</Link>
          <Link href="/cadastro" className="btn-outline block text-center">Criar conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
      <div className="text-center space-y-1">
        <div className="text-5xl mb-2">👤</div>
        <h1 className="text-2xl font-bold">Perfil</h1>
        <p className="text-sm text-gray-400 break-all">{user.email}</p>
      </div>

      <div className="card divide-y divide-gray-100">
        <Link href="/alterar-senha" className="flex items-center justify-between py-4 text-sm hover:text-primary transition-colors">
          <span>🔑 Alterar senha</span>
          <span className="text-gray-300">→</span>
        </Link>
        <button onClick={handleLogout} className="flex items-center justify-between w-full py-4 text-sm hover:text-primary transition-colors text-left">
          <span>🚪 Sair</span>
          <span className="text-gray-300">→</span>
        </button>
      </div>

      <div className="card border-danger/20">
        <h2 className="text-sm font-semibold text-danger mb-2">🗑️ Excluir conta</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">Seus dados de identificação serão removidos permanentemente. As médias das mensalidades que você enviou serão preservadas de forma anônima.</p>

        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">Excluir minha conta</button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-danger font-medium">Tem certeza? Esta ação é irreversível.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 btn-danger text-sm">{deleting ? "Excluindo..." : "Sim, excluir"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
