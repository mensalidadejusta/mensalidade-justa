"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, LogIn, Loader2, ChevronDown, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";

type Props = {
  escolaId: number;
  escolaNome: string;
  escolaEndereco: string;
  slug: string;
  onSucesso?: () => void;
};

const CRITERIOS = [
  {
    id: "motivacao",
    titulo: "Motivação dos estudantes",
    perguntas: [
      "A escola engaja os alunos no aprendizado?",
      "Os alunos mantêm um bom ambiente na sala de aula?",
    ],
  },
  {
    id: "estrutura",
    titulo: "Estrutura física da escola",
    perguntas: [
      "Salas, laboratórios, quadras?",
      "Ambiente seguro e limpo?",
    ],
  },
  {
    id: "comunidade",
    titulo: "Participação da comunidade",
    perguntas: [
      "Ouve a opinião dos pais?",
      "Participam de eventos?",
    ],
  },
  {
    id: "socioemocional",
    titulo: "Desenvolvimento socioemocional",
    perguntas: [
      "Ajuda em competências como empatia?",
      "Mediação de conflitos?",
    ],
  },
  {
    id: "custo",
    titulo: "Custo-benefício da escola",
    perguntas: [
      "O valor da mensalidade é justo pelo que oferece?",
    ],
  },
  {
    id: "futuro",
    titulo: "Preparação para o futuro",
    perguntas: [
      "Prepara para mercado, vestibular, próximos passos?",
    ],
  },
];

const NOTA_MAP: Record<string, string[]> = {
  motivacao: ["nota_pedagogico", "nota_motivacao"],
  estrutura: ["nota_infraestrutura", "nota_seguranca", "nota_estrutura_fisica"],
  comunidade: ["nota_acolhimento", "nota_comunidade"],
  socioemocional: ["nota_diversidade", "nota_socioemocional"],
  custo: ["nota_cursos_extras", "nota_custo_beneficio"],
  futuro: ["nota_inclusao", "nota_preparacao_futuro"],
};

const SISTEMAS_ENSINO = [
  "Acrescer", "Adventista", "Plataforma Amplia (Somos)", "Anglo (Somos)", "Atitude", "Az", "Bernoulli",
  "COC Pearson", "Conquista (Arco)", "CPV", "Dinâmico", "Dom Bosco", "Plataforma Árvore", "Edebê", "Etapa",
  "Ético (Somos)", "Farias Brito", "Fibonacci (Somos)", "Formando Cidadãos", "FTD Educação", "Geekie",
  "Genium", "GEO", "GGE", "GPI", "International School", "Irium", "J. Piaget", "Lúdico",
  "Mackenzie (Somos)", "Maple Bear", "Master", "Mathema", "MAXI (Somos)", "Moderna", "Netbil",
  "O Líder em Mim", "Objetivo", "OPET", "PEC", "PH (Somos)", "Pintanguá", "Rede Pitágoras (Somos)",
  "Pluri", "Poliedro", "Positivo", "Pueri Bilíngue", "Pueri Domus", "Sistema Interativo de Ensino",
  "Rede Cristã de Ensino (Somos)", "RSB Escolas", "SAE Digital", "SAS", "SER", "SIB", "Simple",
  "Sistema Próprio com livros didáticos", "SM Educação", "Sucesso", "Uninter", "Universitário",
  "UNOi Educação", "Via Maker", "Viva", "XYZ", "Zouglee",
];

const METODOLOGIAS = [
  "Aberta", "Adventista", "Afetiva", "Agostiniana", "Assertiva", "Ativa", "Bilíngue", "Cambridge",
  "Célestin Freinet", "Clássica", "Cognitivista", "Comportamentalista", "Confessional", "Conservadora",
  "Construcionista (Jean Piaget)", "Construtivista (Jean Piaget)", "Contemporânea", "Conteudista",
  "Contextualizada", "Criativa", "Cristã", "Crítica (Henry Giroux)", "Democrática", "Dialética", "EAD",
  "Eclética", "Educação 4.0", "Educação por Princípios (AECEP)", "Educação por Vivências", "Emmi Pikler",
  "Escola da Inteligência", "Farias Brito", "Fônica", "Fonológica (Alfabetização)", "Formação com Valores",
  "Franciscana", "Globalizada", "Heurística", "Híbrida", "Histórico-crítica", "Humanista", "Humanizada",
  "Inclusiva", "Inovadora", "Integracionista", "Inteligências Múltiplas", "Interacionista (Lev Vygotsky)",
  "Interativa", "Japonesa", "Kantiana", "Liberal", "Lúdica", "Luterana", "Madalena Freire",
  "Maria Montessori", "Metacognitivista", "Método Intuitivo (Pestalozzi)", "Militar", "Moderna", "Mosaica",
  "Multicultural", "Neurociência", "Neurodidática", "OPEE Educação", "Participativa", "Paulo Freire",
  "Pedagogia do Sentido (Viktor Frankl)", "Positiva", "Positivista", "Presencial", "Progressista",
  "Projetos", "Própria", "Reflexiva", "Reggio Emilia", "Religiosa", "Renovada", "Robert Gagné",
  "Significativa", "Silábica", "Sistema Anglo", "Sistema Bernoulli", "Sistema COC", "Sistema Conquista",
  "Sistema Etapa", "Sistema FTD", "Sistema Mackenzie", "Sistema Objetivo", "Sistema Pitágoras",
  "Sistema Plural", "Sistema Poliedro", "Sistema Positivo", "Sistema SAE Digital", "Sistema SAS",
  "Sistêmica", "Sócio-Histórica", "Socioafetiva", "Socioambiental", "Socioconstrutivista",
  "Socioemocional", "Sociointeracionista (Lev Vygotsky)", "Socioracionalista", "Técnica", "Tecnológica",
  "Tradicional", "UNESCO", "Waldorf",
];

const ROTULOS = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"];

function notaParaRotulo(valor: number): string {
  if (valor <= 0.5) return ROTULOS[0];
  if (valor <= 1.5) return ROTULOS[1];
  if (valor <= 2.5) return ROTULOS[2];
  if (valor <= 3.5) return ROTULOS[3];
  return ROTULOS[4];
}

function InputEstrelas({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1 mt-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((estrela) => {
          const cheia = valor >= estrela;
          const meia = !cheia && valor >= estrela - 0.5;
          return (
            <div key={estrela} className="relative w-8 h-8">
              <button
                type="button"
                onClick={() => onChange(estrela - 0.5)}
                className="absolute top-0 left-0 w-1/2 h-full cursor-pointer z-20"
                aria-label={`${ROTULOS[estrela - 1]} (meia estrela)`}
              />
              <button
                type="button"
                onClick={() => onChange(estrela)}
                className="absolute top-0 right-0 w-1/2 h-full cursor-pointer z-10"
                aria-label={ROTULOS[estrela - 1]}
              />
              <Star
                className={`w-8 h-8 ${
                  cheia ? "text-amber-400 fill-amber-400" :
                  meia ? "text-amber-400" :
                  "text-border"
                }`}
                fill={cheia ? "#fbbf24" : meia ? "url(#halfGrad)" : "none"}
              />
            </div>
          );
        })}
      </div>
      {valor > 0 && (
        <span className="text-xs font-medium text-text-tertiary ml-2 min-w-[60px]">
          {notaParaRotulo(valor)}
        </span>
      )}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="halfGrad">
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function FormularioAvaliacaoPremium({
  escolaId,
  escolaNome,
  escolaEndereco,
  slug,
  onSucesso,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [passo, setPasso] = useState<"auth" | "form" | "sucesso">("auth");
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [relacao, setRelacao] = useState("");
  const [comentario, setComentario] = useState("");
  const [sistemaEnsino, setSistemaEnsino] = useState("");
  const [notaSistema, setNotaSistema] = useState(0);
  const [metodologia, setMetodologia] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (user) setPasso("form");
  }, [user]);

  useEffect(() => {
    setPasso(user ? "form" : "auth");
    setNotas({});
    setRelacao("");
    setComentario("");
    setSistemaEnsino("");
    setNotaSistema(0);
    setMetodologia("");
    setSalvando(false);
    setErro("");
  }, [user]);

  function setNota(id: string, valor: number) {
    setNotas((prev) => ({ ...prev, [id]: valor }));
    if (erro) setErro("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const temNota = CRITERIOS.some((c) => notas[c.id] != null && notas[c.id] > 0);
    if (!temNota) {
      setErro("Avalie pelo menos um critério com as estrelas.");
      return;
    }

    setSalvando(true);
    try {
      const insertData: Record<string, unknown> = {
        escola_id: escolaId,
        user_id: user?.id || null,
        relacao_escola: relacao || null,
        sistema_ensino: sistemaEnsino || null,
        nota_sistema_ensino: notaSistema > 0 ? notaSistema : null,
        metodologia_ensino: metodologia || null,
        comentario: comentario.trim() || null,
      };

      for (const criterio of CRITERIOS) {
        const valor = notas[criterio.id];
        if (valor != null && valor > 0) {
          const cols = NOTA_MAP[criterio.id];
          for (const col of cols) {
            insertData[col] = valor;
          }
        }
      }

      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("avaliacoes")
        .insert(insertData);

      if (insertError) {
        setErro(insertError.message || "Erro ao salvar avaliação.");
        setSalvando(false);
        return;
      }

      setPasso("sucesso");
      onSucesso?.();
      setTimeout(() => {
        router.push(`/escola/${slug}`);
        router.refresh();
      }, 2000);
    } catch {
      setErro("Erro de conexão. Verifique sua internet.");
      setSalvando(false);
    }
  }

  if (passo === "sucesso") {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text">Obrigado pela sua avaliação!</p>
          <p className="text-sm text-text-tertiary mt-2">
            Sua opinião ajuda outros pais a escolherem a melhor escola.
          </p>
        </div>
        <Link
          href={`/escola/${slug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-110 transition-all"
        >
          Voltar para a escola
        </Link>
      </div>
    );
  }

  if (passo === "auth") {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Star className="w-10 h-10 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text">Avalie esta escola</p>
          <p className="text-sm text-text-tertiary mt-2">
            Faça login para avaliar. Seus dados são privados e não são compartilhados com nenhuma instituição.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/login?redirectTo=/escola/${slug}/avaliar`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-110 transition-all"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </Link>
          <Link
            href={`/escola/${slug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-hover text-text-secondary font-medium text-sm hover:text-text transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/escola/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para a escola
      </Link>

      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
            {escolaNome.charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-text truncate">
              {escolaNome}
            </h1>
            <p className="text-sm text-text-secondary truncate">
              {escolaEndereco}
            </p>
          </div>
        </div>
        <div className="border-t border-dashed border-border/60" />
        <div className="max-w-xs">
          <label className="text-sm font-medium text-text-secondary mb-1.5 block">
            Relação com a escola (opcional)
          </label>
          <div className="relative">
            <select
              value={relacao}
              onChange={(e) => setRelacao(e.target.value)}
              className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-text transition-colors pr-10"
            >
              <option value="">Selecione</option>
              <option value="PAIMAE">Pai/Mãe</option>
              <option value="ALUNO">Aluno</option>
              <option value="EXALUNO">Ex-aluno</option>
              <option value="PROFESSOR">Professor</option>
            </select>
            <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-text mb-1">
          Avalie a escola pelos critérios abaixo
        </h2>
        <p className="text-sm text-text-secondary">
          Clique nas estrelas para dar sua nota (valores de 0.5 a 5.0)
        </p>

        <div className="border-t border-dashed border-border/60 my-4" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {CRITERIOS.map((c) => (
            <div key={c.id}>
              <p className="text-sm font-semibold text-text">{c.titulo}</p>
              <ul className="list-disc pl-5 space-y-0.5 mt-0.5">
                {c.perguntas.map((p, i) => (
                  <li key={i} className="text-xs text-text-tertiary">
                    {p}
                  </li>
                ))}
              </ul>
              <InputEstrelas
                valor={notas[c.id] || 0}
                onChange={(v) => setNota(c.id, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-base font-semibold text-text">Avalie o sistema de ensino da escola</h2>
        <p className="text-sm text-text-secondary -mt-3">Informe qual o sistema e a metodologia de ensino da escola.</p>
        <div className="border-t border-dashed border-border/60" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Qual é o sistema de ensino da escola? (opcional)
            </label>
            <div className="relative">
              <select
                value={sistemaEnsino}
                onChange={(e) => setSistemaEnsino(e.target.value)}
                className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-text transition-colors pr-10"
              >
                <option value="">Selecione uma opção</option>
                {SISTEMAS_ENSINO.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">
              Como você avalia este sistema de ensino? (opcional)
            </label>
            <InputEstrelas valor={notaSistema} onChange={setNotaSistema} />
            {notaSistema > 0 && (
              <span className="text-xs font-medium text-text-tertiary mt-1 block">{notaParaRotulo(notaSistema)}</span>
            )}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary mb-1.5 block">
            Qual é a metodologia de ensino da escola? (opcional)
          </label>
          <div className="relative">
            <select
              value={metodologia}
              onChange={(e) => setMetodologia(e.target.value)}
              className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-text transition-colors pr-10"
            >
              <option value="">Selecione uma opção</option>
              {METODOLOGIAS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-text">
          Deixe seu comentário (opcional)
        </h2>
        <p className="text-sm text-text-secondary -mt-1">
          Conte mais sobre sua experiência com a escola.
        </p>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value.slice(0, 1000))}
          rows={4}
          maxLength={1000}
          placeholder="Ex: A escola tem uma ótima infraestrutura, professores dedicados..."
          className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-text transition-colors resize-none min-h-[100px]"
        />
        <p className="text-xs text-text-tertiary text-right">
          {comentario.length}/1000
        </p>
      </div>

      {erro && (
        <p className="text-xs text-danger bg-danger/10 rounded-lg p-3 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {erro}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Link
          href={`/escola/${slug}`}
          className="px-6 py-3 rounded-xl text-sm font-medium bg-surface-hover text-text-secondary hover:text-text transition-all inline-flex items-center"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={salvando}
          onClick={handleSubmit}
          className="px-8 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[160px] cursor-pointer"
        >
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Avaliação"
          )}
        </button>
      </div>
    </div>
  );
}
