"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AtualizarSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push("/login");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setSuccess(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">Senha atualizada com sucesso!</h1>
            <p className="text-sm text-text-secondary">Redirecionando para o login...</p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Nova senha</h1>
          <p className="text-sm text-text-secondary">Digite e confirme sua nova senha de acesso.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="password">Nova Senha</label>
            <input id="password" name="password" type="password" placeholder="Nova senha (mín. 6 caracteres)" value={password || ""} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="confirm">Confirmar Nova Senha</label>
            <input id="confirm" name="confirm" type="password" placeholder="Repita a nova senha" value={confirm || ""} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:brightness-110 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
