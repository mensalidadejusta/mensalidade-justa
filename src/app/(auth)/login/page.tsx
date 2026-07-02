"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/busca");
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Entrar</h1>
          <p className="text-sm text-gray-500">
            Seus dados são <strong>100% anônimos</strong> — escolas nunca veem quem avaliou.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input className="input-field" type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input className="input-field" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {error && <p className="text-sm text-danger bg-red-50 rounded-lg p-3">{error}</p>}
          <button className="btn-primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>

        <div className="text-center space-y-2 text-sm">
          <Link href="/recuperar-senha" className="text-primary hover:underline">Esqueceu a senha?</Link>
          <p className="text-gray-500">Ainda não tem conta? <Link href="/cadastro" className="text-primary font-medium hover:underline">Criar conta</Link></p>
        </div>

        <div className="bg-primary-light rounded-xl p-4 text-xs text-gray-600 leading-relaxed">
          <strong>🔒 Seu anonimato é garantido.</strong> Usamos o login apenas para evitar fraudes. Nenhuma informação sua é exibida publicamente ou enviada para as escolas.
        </div>
      </div>
    </div>
  );
}
