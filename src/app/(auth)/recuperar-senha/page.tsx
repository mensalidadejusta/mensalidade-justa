"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/atualizar-senha`;
    console.log("Enviando resetPasswordForEmail com redirectTo:", redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-text">Verifique seu e-mail</h1>
            <p className="text-sm text-text-secondary">
              Enviamos um link de redefinição para <strong className="text-text">{email}</strong>.
            </p>
          </div>
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
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
          <h1 className="text-2xl font-bold text-text tracking-tight">Recuperar senha</h1>
          <p className="text-sm text-text-secondary">
            Digite seu e-mail para receber um link de redefinição de senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" placeholder="seu@email.com" value={email || ""} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:brightness-110 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
