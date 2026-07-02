"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function CadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"credenciais" | "endereco">("credenciais");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  function handleCepBlur() {
    const cepClean = cep.replace(/\D/g, "");
    if (cepClean.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cepClean}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.erro) {
          setLogradouro(d.logradouro || "");
          setBairro(d.bairro || "");
          setCidade(d.localidade || "");
          setUf(d.uf || "");
        }
      })
      .catch(() => {});
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não conferem.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("endereco");
  }

  async function geocodeEndereco(): Promise<{ lat: number; lon: number } | null> {
    const enderecoCompleto = `${logradouro}, ${numero}, ${bairro}, ${cidade}, ${uf}, Brasil`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoCompleto)}&format=json&limit=1`;
    try {
      const r = await fetch(url, { headers: { "User-Agent": "MensalidadeJusta/1.0" } });
      const data = await r.json();
      if (data?.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch {}
    return null;
  }

  async function handleAddress(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setError("Usuário não autenticado. Faça login novamente.");

    const geo = await geocodeEndereco();
    const { error: err } = await supabase.from("profiles").upsert({
      id: user.id,
      logradouro,
      numero,
      bairro,
      cidade,
      uf,
      cep,
      latitude: geo?.lat ?? null,
      longitude: geo?.lon ?? null,
      geom: geo ? { type: "Point", coordinates: [geo.lon, geo.lat] } : null,
    });

    setLoading(false);
    if (err) return setError(err.message);

    router.push("/busca");
  }

  function skip() {
    router.push("/busca");
  }

  if (step === "credenciais") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Criar Conta</h1>
            <p className="text-sm text-gray-500">Seu email nunca será compartilhado. Avaliações são sempre <strong>anônimas</strong>.</p>
          </div>

          <form onSubmit={handleCredentials} className="space-y-4">
            <input className="input-field" type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input className="input-field" type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <input className="input-field" type="password" placeholder="Confirmar senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            {error && <p className="text-sm text-danger bg-red-50 rounded-lg p-3">{error}</p>}
            <button className="gradient-btn py-3 px-6 rounded-xl w-full" disabled={loading}>{loading ? "Criando..." : "Criar Conta"}</button>
          </form>

          <p className="text-center text-sm text-gray-500">Já tem conta? <Link href="/login" className="text-primary font-medium hover:underline">Entrar</Link></p>

          <div className="bg-primary-light rounded-xl p-4 text-xs text-gray-600 leading-relaxed space-y-2">
            <p><strong>🔒 Por que criar conta?</strong></p>
            <p>Usamos o email apenas para evitar fraudes. Sua identidade nunca é revelada — as escolas veem apenas os valores enviados.</p>
            <p>Você pode excluir sua conta a qualquer momento com todos os seus dados.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">📍 Seu endereço</h1>
          <p className="text-sm text-gray-500">Opcional — usado para encontrar escolas próximas a você.</p>
        </div>

        <form onSubmit={handleAddress} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value)} onBlur={handleCepBlur} />
          </div>
          <input className="input-field" placeholder="Logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <input className="input-field" placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <input className="input-field col-span-2" placeholder="Bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input-field" placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <input className="input-field" placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value)} maxLength={2} />
          </div>

          {error && <p className="text-sm text-danger bg-red-50 rounded-lg p-3">{error}</p>}

          <button className="gradient-btn py-3 px-6 rounded-xl w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>

        <p className="text-center">
          <button onClick={skip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Pular esta etapa
          </button>
        </p>
      </div>
    </div>
  );
}
