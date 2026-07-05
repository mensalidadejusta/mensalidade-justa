"use client";

import { useState } from "react";
import Link from "next/link";
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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/alterar-senha`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">📧</div>
          <h1 className="text-xl font-bold">Verifique seu email</h1>
          <p className="text-sm text-gray-500">Enviamos um link de redefinição para <strong>{email}</strong>.</p>
          <Link href="/login" className="text-primary text-sm hover:underline">Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Recuperar Senha</h1>
          <p className="text-sm text-gray-500">Digite seu email para receber o link de redefinição.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          {error && <p className="text-sm text-danger bg-red-50 rounded-lg p-3">{error}</p>}
          <button className="btn-primary" disabled={loading}>{loading ? "Enviando..." : "Enviar link"}</button>
        </form>
        <p className="text-center text-sm text-gray-500"><Link href="/login" className="text-primary hover:underline">Voltar ao login</Link></p>
      </div>
    </div>
  );
}
