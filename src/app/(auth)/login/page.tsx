"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { School, LogIn, Loader2, UserPlus, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  function getRedirectTo(): string {
    if (typeof window === "undefined") return "/busca";
    const params = new URLSearchParams(window.location.search);
    return params.get("redirectTo") || "/busca";
  }
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<any[]>([]);
  const [carregandoCidades, setCarregandoCidades] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEstadoChange(value: string) {
    setUf(value || "");
    setCidades([]);
    setCidade("");
    if (!value) return;
    setCarregandoCidades(true);
    try {
      const { data, error: err } = await supabase.rpc("get_cidades", { p_uf: value.toUpperCase() });
      if (err) { console.error("Erro da RPC get_cidades:", err); setCidades([]); return; }
      setCidades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Exceção ao buscar cidades:", err);
      setCidades([]);
    } finally {
      setCarregandoCidades(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(getRedirectTo());
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome_usuario: nome || "", estado: uf || "", cidade: cidade || "" } },
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push(getRedirectTo());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <School className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Mensalidade Justa</h1>
          <p className="text-sm text-text-secondary">
            {isLogin ? "Faça login para colaborar com a comunidade" : "Crie sua conta e comece a contribuir"}
          </p>
        </div>

        <button type="button" onClick={() => {
            const next = getRedirectTo();
            const callbackUrl = window.location.origin + "/auth/callback?next=" + encodeURIComponent(next);
            supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl } });
          }}
            className="w-full flex items-center justify-center gap-3 bg-surface border-2 border-border rounded-xl py-3.5 text-base font-semibold text-text hover:bg-surface-hover hover:border-text/30 active:scale-[0.98] transition-all duration-200 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {isLogin ? "Entrar com Google" : "Criar conta com Google"}
          </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 border-t border-border"></div>
          <span className="text-xs text-text-tertiary shrink-0">ou com email</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleCadastro} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="nome">Nome</label>
              <input id="nome" name="nome" type="text" placeholder="Seu nome" value={nome || ""} onChange={(e) => setNome(e.target.value)} required autoComplete="name"
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" placeholder="seu@email.com" value={email || ""} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" placeholder={isLogin ? "Sua senha" : "Senha (mín. 6 caracteres)"} value={password || ""} onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? 0 : 6} autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="confirmPassword">Confirmar Senha</label>
                <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repita a senha" value={confirmPassword || ""} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password"
                  className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="uf">Estado (UF)</label>
                <div className="relative">
                  <select id="uf" name="uf" value={uf || ""} onChange={(e) => handleEstadoChange(e.target.value)} required
                    className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-text transition-colors pr-10">
                    <option value="">Selecione o estado</option>
                    {Array.isArray(UFS) && UFS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-1 block" htmlFor="cidade">Cidade</label>
                <div className="relative">
                  <select id="cidade" name="cidade" value={cidade || ""} onChange={(e) => setCidade(e.target.value)} required disabled={!uf || carregandoCidades}
                    className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-text transition-colors pr-10 disabled:opacity-50">
                    {carregandoCidades ? (
                      <option value="">Carregando cidades...</option>
                    ) : !uf || cidades.length === 0 ? (
                      <option value="">Selecione um estado primeiro</option>
                    ) : (
                      <option value="">Selecione uma cidade</option>
                    )}
                    {Array.isArray(cidades) && cidades.map((c, i) => {
                      const nomeCidade = typeof c === "string" ? c : (c.municipio || c.nome || "");
                      return <option key={i} value={nomeCidade}>{nomeCidade}</option>;
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:brightness-110 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLogin ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta"}
          </button>
        </form>

        <div className="text-center space-y-3 text-sm">
          {isLogin && <Link href="/recuperar-senha" className="text-primary hover:underline">Esqueceu a senha?</Link>}
          <p className="text-text-secondary">
            {isLogin ? (
              <>Ainda não tem conta?{" "}
                <button onClick={() => { setIsLogin(false); setError(""); }} className="text-primary font-medium hover:underline bg-transparent border-none p-0 cursor-pointer">Criar conta</button>
              </>
            ) : (
              <>Já tem conta?{" "}
                <button onClick={() => { setIsLogin(true); setError(""); }} className="text-primary font-medium hover:underline bg-transparent border-none p-0 cursor-pointer">Entrar</button>
              </>
            )}
          </p>
        </div>

        <div className="bg-surface-hover rounded-xl p-4 text-xs text-text-secondary leading-relaxed">
          <strong className="text-text">Sua privacidade é garantida.</strong> Usamos o login apenas para evitar fraudes. Nenhuma informação sua é exibida publicamente ou enviada para as escolas.
        </div>
      </div>
    </div>
  );
}
