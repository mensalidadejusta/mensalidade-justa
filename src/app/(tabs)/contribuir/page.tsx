"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function ContribuirPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-300">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Contribuir</h1>
          <p className="text-sm text-gray-500">
            Ajude outros pais e alunos com informações reais de mensalidades.
          </p>
        </div>

        <div className="card space-y-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🛡️</span>
            <div className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Seu anonimato é total.</strong>
              <br />
              Pedimos o login apenas para evitar que uma mesma pessoa envie preços
              falsos repetidas vezes. As escolas <strong>nunca</strong> recebem
              seus dados — apenas o valor e as informações da mensalidade.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Dados precisos.</strong>
              <br />
              Quanto mais pessoas contribuem, mais justa fica a comparação
              para todos.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🗑️</span>
            <div className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Controle total.</strong>
              <br />
              Você pode excluir sua conta e todos os seus dados a qualquer
              momento. As médias das escolas são preservadas de forma anônima.
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link href="/auth/login" className="btn-primary block text-center">
              Entrar para contribuir
            </Link>
            <Link href="/auth/cadastro" className="btn-outline block text-center">
              Criar conta gratuita
            </Link>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Ao criar uma conta, você concorda com nossos Termos de Uso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6 pt-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Contribuir</h1>
        <p className="text-sm text-gray-500">
          Envie os valores de mensalidade de uma escola.
        </p>
      </div>

      <div className="card space-y-4">
        <p className="text-sm text-gray-500 text-center">
          🎯 Selecione uma escola na busca para começar.
        </p>
      </div>
    </div>
  );
}
