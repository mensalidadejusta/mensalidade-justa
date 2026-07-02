"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function CadastroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não conferem.");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) return setError(error.message);

    router.push("/auth/login?confirmacao=enviada");
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Criar Conta</h1>
          <p className="text-sm text-gray-500">
            Seu email nunca será compartilhado. Avaliações são sempre <strong>anônimas</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input-field"
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="input-field"
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <input
            className="input-field"
            type="password"
            placeholder="Confirmar senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-danger bg-red-50 rounded-lg p-3">{error}</p>
          )}

          <button className="btn-primary" disabled={loading}>
            {loading ? "Criando..." : "Criar Conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Entrar
          </Link>
        </p>

        <div className="bg-primary-light rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2">
          <p><strong>🔒 Por que criar conta?</strong></p>
          <p>Usamos o email apenas para evitar que uma mesma pessoa envie preços
          falsos repetidamente. Sua identidade nunca é revelada — as escolas veem
          apenas os valores enviados, sem nenhum dado seu.</p>
          <p>Você pode excluir sua conta a qualquer momento com todos os seus dados.</p>
        </div>
      </div>
    </div>
  );
}
