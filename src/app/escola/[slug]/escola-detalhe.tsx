"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit3, PenLine, AlertTriangle, X, LogIn,
  ChevronDown, ChevronRight, Star, School,
  MapPin, Phone, Building2, Expand, Info, GraduationCap,
  Baby, BookOpen, Dumbbell, Monitor, Accessibility,
  Wifi, Users, Heart, Shield, Check,
  FlaskConical, MessageSquare, TrendingUp,
} from "lucide-react";
import { SERIES } from "@/lib/series";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase";
import GraficoIdeb from "@/components/GraficoIdeb";

type Estatistica = {
  serie_slug: string; serie_nome: string;
  media_mensalidade: number | null; min_mensalidade: number | null; max_mensalidade: number | null; qtd_mensalidade: number;
  media_matricula: number | null; min_matricula: number | null; max_matricula: number | null; qtd_matricula: number;
  media_material: number | null; min_material: number | null; max_material: number | null; qtd_material: number;
};

type Escola = {
  id: number; nome: string; uf: string; municipio: string; bairro: string | null;
  endereco: string | null; telefone: string | null; dependencia_administrativa: string;
  categoria_administrativa: string | null; categoria_escola_privada: string | null;
  localizacao: string | null; localidade_diferenciada: string | null;
  porte_escola: string | null; etapas_modalidades: string | null; outras_ofertas: string | null;
  conveniada_poder_publico: string | null; regulamentacao_conselho: string | null;
  latitude: number | null; longitude: number | null;
  restricao_atendimento: string | null; codigo_inep: string;
};

function capitalizarNome(nome: string): string {
  const excecoes = new Set([
    "do", "dos", "da", "das", "de", "e", "em", "no", "na", "nos", "nas",
    "a", "o", "as", "os", "ao", "aos",
  ]);
  return nome
    .toLowerCase()
    .split(" ")
    .map((palavra, i) => {
      if (i > 0 && excecoes.has(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(" ");
}

const MACRO_GRUPOS = ["Educação Infantil", "Ensino Fundamental I", "Ensino Fundamental II", "Ensino Médio"];

const ICONE_GRUPO: Record<string, typeof Baby> = {
  "Educação Infantil": Baby,
  "Ensino Fundamental I": BookOpen,
  "Ensino Fundamental II": Dumbbell,
  "Ensino Médio": GraduationCap,
};

const COR_GRUPO: Record<string, string> = {
  "Educação Infantil": "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "Ensino Fundamental I": "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "Ensino Fundamental II": "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  "Ensino Médio": "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

function extrairInfraestrutura(etapas: string | null): string[] {
  const items: string[] = [];
  const texto = (etapas || "").toLowerCase();
  if (texto.includes("laboratório") || texto.includes("laboratorio") || texto.includes("lab.")) items.push("Laboratório de ciências");
  if (texto.includes("informática") || texto.includes("informatica") || texto.includes("computação") || texto.includes("computacao")) items.push("Laboratório de informática");
  if (texto.includes("biblioteca")) items.push("Biblioteca");
  if (texto.includes("quadra")) items.push("Quadra esportiva");
  if (texto.includes("acessibilidade")) items.push("Acessibilidade");
  if (texto.includes("internet") || texto.includes("wifi")) items.push("Wi-Fi");
  if (texto.includes("auditório") || texto.includes("auditorio")) items.push("Auditório");
  if (texto.includes("refeitório") || texto.includes("refeitorio")) items.push("Refeitório");
  if (texto.includes("pátio") || texto.includes("patio")) items.push("Pátio coberto");
  if (texto.includes("sala") && texto.includes("professor")) items.push("Sala de professores");
  if (items.length === 0) {
    items.push("Ensino presencial");
  }
  return items;
}

function fmtBr(valor: number | null): string {
  if (valor == null) return "—";
  return "R$ " + Number(valor)
    .toFixed(2)
    .replace(".", ",")
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function renderStarRating(media: number, tamanho: string = "w-4 h-4") {
  const cheias = Math.floor(media);
  const fracao = media - cheias;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((e) => (
        <Star key={e} className={`${tamanho} ${
          e <= cheias ? "fill-yellow-400 text-yellow-400" :
          e === cheias + 1 && fracao >= 0.25 ? "fill-yellow-400/50 text-yellow-400" :
          "text-neutral-300 dark:text-border"
        }`} />
      ))}
    </div>
  );
}

const grupos = [...new Set(SERIES.map((s) => s.grupo))];

function ModalContribuicao({
  aberto,
  fechar,
  serieSlug: initialSlug,
  serieNome: initialNome,
  valoresAtuais,
  escolaId,
  escolaNome,
  onSalvo,
}: {
  aberto: boolean;
  fechar: () => void;
  serieSlug: string;
  serieNome: string;
  valoresAtuais: Estatistica | null;
  escolaId: number;
  escolaNome: string;
  onSalvo: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [selectedNome, setSelectedNome] = useState(initialNome);
  const [mensalidade, setMensalidade] = useState(
    valoresAtuais?.media_mensalidade ? String(Math.round(valoresAtuais.media_mensalidade)) : ""
  );
  const [matricula, setMatricula] = useState(
    valoresAtuais?.media_matricula ? String(Math.round(valoresAtuais.media_matricula)) : ""
  );
  const [material, setMaterial] = useState(
    valoresAtuais?.media_material ? String(Math.round(valoresAtuais.media_material)) : ""
  );
  const [honeypot, setHoneypot] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState("");
  const [discrepanciaConfirmada, setDiscrepanciaConfirmada] = useState(false);

  const valorNum = mensalidade ? parseFloat(mensalidade.replace(",", ".").replace(/[^0-9.]/g, "")) : null;
  const erroFaixa = valorNum != null && (valorNum < 100 || valorNum > 15000);
  const mediaAtual = valoresAtuais?.media_mensalidade != null ? Number(valoresAtuais.media_mensalidade) : null;
  const temDiscrepancia = !erroFaixa && valorNum != null && mediaAtual != null && mediaAtual > 0 &&
    (valorNum < mediaAtual * 0.5 || valorNum > mediaAtual * 1.5);
  const podeSalvar = !salvando && !erroFaixa && (!temDiscrepancia || discrepanciaConfirmada);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (erroFaixa) { setErro("O valor da mensalidade deve estar entre R$ 100 e R$ 15.000."); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/contribuir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escola_id: escolaId, serie_slug: selectedSlug, serie_nome: selectedNome,
          user_id: user?.id || null, valor_mensalidade: valorNum,
          valor_matricula: matricula ? parseFloat(matricula.replace(",", ".").replace(/[^0-9.]/g, "")) : null,
          valor_material: material ? parseFloat(material.replace(",", ".").replace(/[^0-9.]/g, "")) : null,
          honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || "Erro ao salvar."); setSalvando(false); return; }
      setSalvo(true);
      setTimeout(() => { setSalvo(false); fechar(); onSalvo(); router.refresh(); }, 1200);
    } catch { setErro("Erro de conexão."); setSalvando(false); }
  }

  useEffect(() => {
    if (!aberto) return;
    setSelectedSlug(initialSlug); setSelectedNome(initialNome);
    setMensalidade(valoresAtuais?.media_mensalidade ? String(Math.round(valoresAtuais.media_mensalidade)) : "");
    setMatricula(valoresAtuais?.media_matricula ? String(Math.round(valoresAtuais.media_matricula)) : "");
    setMaterial(valoresAtuais?.media_material ? String(Math.round(valoresAtuais.media_material)) : "");
    setSalvando(false); setSalvo(false); setErro(""); setDiscrepanciaConfirmada(false); setHoneypot("");
  }, [aberto, initialSlug, initialNome]);

  function handleSerieChange(slug: string) {
    const serie = SERIES.find((s) => s.slug === slug);
    if (serie) { setSelectedSlug(serie.slug); setSelectedNome(serie.nome); }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={fechar} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full sm:max-w-md mx-4 overflow-hidden animate-bottom-sheet-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-text">Contribuir com preços</h3>
          <button type="button" onClick={fechar} className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-2 space-y-2">
          <div className="relative">
            <select value={selectedSlug} onChange={(e) => handleSerieChange(e.target.value)}
              className="w-full appearance-none bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-text transition-colors pr-10">
              {grupos.map((grupo) => (
                <optgroup key={grupo} label={grupo}>
                  {SERIES.filter((s) => s.grupo === grupo).map((s) => (
                    <option key={s.slug} value={s.slug}>{s.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <p className="text-xs text-text-tertiary">{escolaNome}</p>
        </div>
        {!user ? (
          <div className="px-5 pb-5 text-center space-y-4">
            <p className="text-sm text-text-secondary">Faça login para contribuir com preços.</p>
            <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 transition-all">
              <LogIn className="w-4 h-4" /> Entrar
            </Link>
          </div>
        ) : salvo ? (
          <div className="px-5 py-8 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-text">Obrigado!</p>
            <p className="text-xs text-text-tertiary">Sua contribuição foi registrada.</p>
          </div>
        ) : (
          <form onSubmit={handleSalvar} className="px-5 pb-5 space-y-4">
            <div aria-hidden="true" className="sr-only">
              <label>Não preencher</label>
              <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Mensalidade (R$)</label>
              <input type="text" inputMode="decimal" value={mensalidade} onChange={(e) => setMensalidade(e.target.value)}
                placeholder="Ex: 1200"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" />
              {erroFaixa && <p className="text-xs text-danger mt-1">Mensalidade deve estar entre R$ 100 e R$ 15.000.</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Taxa de Matrícula (R$)</label>
              <input type="text" inputMode="decimal" value={matricula} onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 500"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Material Didático (R$)</label>
              <input type="text" inputMode="decimal" value={material} onChange={(e) => setMaterial(e.target.value)}
                placeholder="Ex: 300"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            {temDiscrepancia && !erroFaixa && (
              <div className="bg-amber-200/20 border border-amber-400/40 rounded-xl p-3 space-y-2">
                <p className="text-xs text-amber-300 font-medium">⚠ O valor está muito acima ou abaixo da média ({fmtBr(mediaAtual)}).</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={discrepanciaConfirmada} onChange={(e) => setDiscrepanciaConfirmada(e.target.checked)} className="mt-0.5 accent-amber-500" />
                  <span className="text-xs text-text-secondary">Confirmo que este valor está correto.</span>
                </label>
              </div>
            )}
            {erro && <p className="text-xs text-danger bg-danger/10 rounded-lg p-3">{erro}</p>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={fechar}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-hover text-text-secondary hover:text-text transition-all duration-200">Cancelar</button>
              <button type="submit" disabled={!podeSalvar}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed">
                {salvando ? "Salvando..." : "Salvar Valores"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function WhatsAppShare({ nome, slug }: { nome: string; slug: string }) {
  const isBrowser = typeof window !== "undefined";
  const origin = isBrowser ? window.location.origin : "https://mensalidadejusta.com.br";
  const url = origin + "/escola/" + slug;
  const texto =
    "Olá! 👋\n\nTudo bem? " +
    "Eu encontrei a página do *" + nome + "* no Mensalidade Justa e vi que ainda não tem nenhum valor de mensalidade cadastrado lá. " +
    "Se você conhece alguém que estuda ou já estudou nessa escola, poderia compartilhar esse link com essa pessoa?\n\n" +
    "É super rápido e anônimo — leva menos de 1 minuto. " +
    "Os dados ajudam outros pais e alunos a terem uma ideia mais justa dos preços praticados.\n\n" +
    "🔗 " + url + "\n\nMuito obrigado! 💙";

  return (
    <a href={"https://wa.me/?text=" + encodeURIComponent(texto)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 rounded-xl text-sm font-medium bg-[#25d366] text-white hover:bg-[#20bd5a] transition-all duration-200 active:scale-[0.97] min-h-[44px]">
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Conhece alguém? Compartilhar
    </a>
  );
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const { user } = useAuth();
  const isPrivada = escola.categoria_administrativa === "Privada";

  const [modalAberto, setModalAberto] = useState(false);
  const [modalSerieSlug, setModalSerieSlug] = useState("");
  const [modalSerieNome, setModalSerieNome] = useState("");
  const [modalStats, setModalStats] = useState<Estatistica | null>(null);
  const [mediasAvaliacoes, setMediasAvaliacoes] = useState<any>(null);
  const [comentariosAvaliacoes, setComentariosAvaliacoes] = useState<any[]>([]);
  const [idebDados, setIdebDados] = useState<Record<string, any[]>>({});

  const supabaseAval = createClient();

  function carregarAvaliacoes() {
    supabaseAval.rpc("get_medias_avaliacoes", { p_escola_id: escola.id }).then(({ data }) => {
      if (data?.[0]) setMediasAvaliacoes(data[0]);
    });
    supabaseAval.from("avaliacoes")
      .select("nota_infraestrutura, nota_seguranca, nota_pedagogico, nota_acolhimento, nota_cursos_extras, nota_diversidade, nota_inclusao, comentario, relacao_escola, created_at")
      .eq("escola_id", escola.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => {
        if (data) setComentariosAvaliacoes(data.filter((r) => r.comentario));
      });
    // Fetch IDEB data
    supabaseAval.from("ideb_escolas")
      .select("*")
      .eq("escola_id", escola.id)
      .order("ano", { ascending: true })
      .then(({ data }) => {
        if (data) {
          const grouped: Record<string, any[]> = {};
          for (const row of data) {
            if (!grouped[row.etapa]) grouped[row.etapa] = [];
            grouped[row.etapa].push(row);
          }
          setIdebDados(grouped);
        }
      });
  }

  useEffect(() => { carregarAvaliacoes(); }, []);

  function abrirModal(serieSlug: string, serieNome: string, stats: Estatistica | null) {
    setModalSerieSlug(serieSlug); setModalSerieNome(serieNome); setModalStats(stats); setModalAberto(true);
  }

  function fecharModal() { setModalAberto(false); }

  const nomeFormatado = capitalizarNome(escola.nome);
  const infraestrutura = extrairInfraestrutura(escola.etapas_modalidades);

  const subCriterios: [string, number][] = mediasAvaliacoes?.total_avaliacoes > 0
    ? ([
        ["Participação da comunidade", Number(mediasAvaliacoes.media_acolhimento)],
        ["Estrutura física", Number(mediasAvaliacoes.media_infraestrutura)],
        ["Desenvolvimento socioemocional", Number(mediasAvaliacoes.media_diversidade)],
        ["Motivação dos estudantes", Number(mediasAvaliacoes.media_pedagogico)],
        ["Segurança", Number(mediasAvaliacoes.media_seguranca)],
        ["Custo-benefício", Number(mediasAvaliacoes.media_cursos_extras)],
        ["Inclusão", Number(mediasAvaliacoes.media_inclusao)],
      ] as [string, number][]).filter(([, v]) => v > 0)
    : [];

  function getPrecoGrupo(grupo: string): { min: number | null; max: number | null; temDados: boolean } {
    const series = SERIES.filter((s) => s.grupo === grupo);
    let min: number | null = null;
    let max: number | null = null;
    let temDados = false;
    for (const s of series) {
      const stat = precos.find((p) => p.serie_slug === s.slug);
      if (stat && stat.qtd_mensalidade > 0 && stat.media_mensalidade != null) {
        temDados = true;
        if (min == null || stat.media_mensalidade < min) min = stat.media_mensalidade;
        if (max == null || stat.media_mensalidade > max) max = stat.media_mensalidade;
      }
    }
    return { min, max, temDados };
  }

  function gruposDaEscola(): string[] {
    const texto = (escola.etapas_modalidades || "").toLowerCase();
    if (!texto) return MACRO_GRUPOS;
    return MACRO_GRUPOS.filter((g) => {
      const chave = g.toLowerCase();
      return (
        texto.includes(chave) ||
        (chave === "educação infantil" && texto.includes("infantil")) ||
        (chave === "ensino fundamental i" && (texto.includes("fundamental i") || texto.includes("fundamental 1") || texto.includes("fundamental - 1"))) ||
        (chave === "ensino fundamental ii" && (texto.includes("fundamental ii") || texto.includes("fundamental 2") || texto.includes("fundamental - 2"))) ||
        (chave === "ensino médio" && (texto.includes("médio") || texto.includes("medio")))
      );
    });
  }

  const gruposDisponiveis = gruposDaEscola();
  const gruposComPreco = MACRO_GRUPOS.filter((g) => {
    const { temDados } = getPrecoGrupo(g);
    return temDados;
  });

  return (
    <main className="min-h-dvh bg-bg text-text">

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <nav className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Link href="/busca" className="hover:text-primary transition-colors">Busca</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/busca?uf=${escola.uf}`} className="hover:text-primary transition-colors">{escola.uf}</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/escolas/${escola.uf.toLowerCase()}/${escola.municipio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} className="hover:text-primary transition-colors">{escola.municipio}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-text-secondary truncate max-w-[200px]">{nomeFormatado}</span>
        </nav>
      </div>

      {/* Two-column grid: Hero + Sidebar */}
      <article className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-x-6 xl:gap-x-8 gap-y-0">
        {/* Left column */}
        <div className="space-y-8">

          {/* Hero */}
          <header>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-surface border border-border/60 flex items-center justify-center text-primary text-2xl md:text-3xl font-bold shrink-0 shadow-sm">
                {nomeFormatado.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    isPrivada
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  }`}>
                    {isPrivada ? "Rede privada" : "Rede pública"}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-text leading-tight">
                  {nomeFormatado}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <div className="flex items-center gap-1">
                    {mediasAvaliacoes?.total_avaliacoes > 0 ? (
                      <>
                        {renderStarRating(Number(mediasAvaliacoes.media_geral), "w-4 h-4")}
                        <span className="text-sm font-semibold text-text">{Number(mediasAvaliacoes.media_geral).toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-xs text-text-tertiary">Sem avaliações</span>
                    )}
                  </div>
                  {mediasAvaliacoes?.total_avaliacoes > 0 && (
                    <a href="#avaliacoes" className="text-xs text-primary hover:underline">
                      {mediasAvaliacoes.total_avaliacoes} {mediasAvaliacoes.total_avaliacoes === 1 ? "avaliação" : "avaliações"}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-text-tertiary" />
                {escola.bairro ? `${escola.bairro} - ` : ""}{escola.municipio} - {escola.uf}
              </span>
              {escola.telefone && (
                <a href={`tel:${escola.telefone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                  {escola.telefone}
                </a>
              )}
            </div>
            {escola.endereco && (
              <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {escola.endereco}
              </p>
            )}
          </header>

          {/* Sobre */}
          <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-text mb-3">Sobre {nomeFormatado}</h2>
            <div className="text-sm text-text-secondary leading-relaxed space-y-2">
              <p>{nomeFormatado} é uma instituição de ensino {isPrivada ? "privada" : "pública"} localizada em {escola.bairro ? `${escola.bairro}, ` : ""}{escola.municipio} - {escola.uf}.</p>
              {escola.categoria_escola_privada && <p>Enquadra-se na categoria {escola.categoria_escola_privada.toLowerCase()}.</p>}
              {escola.etapas_modalidades && (
                <p>Oferece as seguintes etapas de ensino: {escola.etapas_modalidades.toLowerCase()}.</p>
              )}
              {escola.outras_ofertas && <p>Além disso, oferece: {escola.outras_ofertas.toLowerCase()}.</p>}
              {escola.porte_escola && <p>Classificada como escola de porte {escola.porte_escola.toLowerCase()}, localizada em área {escola.localizacao?.toLowerCase() || "urbana"}.</p>}
              {mediasAvaliacoes?.total_avaliacoes > 0 && (
                <p>Com base no feedback da comunidade do Mensalidade Justa, a escola possui nota média geral de <strong>{Number(mediasAvaliacoes.media_geral).toFixed(1)}</strong> de 5 estrelas, baseada em {mediasAvaliacoes.total_avaliacoes} {mediasAvaliacoes.total_avaliacoes === 1 ? "avaliação" : "avaliações"}.</p>
              )}
            </div>
          </section>

          {/* Informações */}
          <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-5 space-y-2.5">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">Informações</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Tipo</span>
                <span className={`font-semibold ${isPrivada ? "text-purple-400" : "text-emerald-400"}`}>
                  {isPrivada ? "Privada" : "Pública"}
                </span>
              </div>
              {escola.categoria_escola_privada && (
                <div className="flex justify-between"><span className="text-text-tertiary">Categoria</span><span className="text-text text-right text-xs">{escola.categoria_escola_privada}</span></div>
              )}
              {escola.porte_escola && (
                <div className="flex justify-between"><span className="text-text-tertiary">Porte</span><span className="text-text">{escola.porte_escola}</span></div>
              )}
              <div className="flex justify-between"><span className="text-text-tertiary">INEP</span><span className="text-text font-mono text-xs">{escola.codigo_inep}</span></div>
            </div>
          </section>

          {/* IDEB */}
          {Object.keys(idebDados).length > 0 && (
            <section>
              <GraficoIdeb
                linhas={Object.entries(idebDados).map(([etapa, dados]) => ({
                  id: etapa,
                  label:
                    etapa === "Anos Iniciais EF" ? "Anos Iniciais" :
                    etapa === "Anos Finais EF" ? "Anos Finais" :
                    etapa === "Ensino Medio" ? "Ensino Médio" : etapa,
                  data: dados.map((d: any) => ({
                    ano: d.ano,
                    ideb: d.ideb,
                    meta_ideb: d.meta_ideb,
                    aprovacao: d.aprovacao,
                    nota_saeb: d.nota_saeb,
                  })),
                }))}
              />
            </section>
          )}

          {/* Estrutura escolar */}
          {infraestrutura.length > 0 && (
            <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6">
              <h2 className="text-base font-bold text-text mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-text-tertiary" />
                Estrutura escolar
              </h2>
              <p className="text-sm text-text-secondary mb-3">{nomeFormatado} oferece toda a estrutura necessária para o desenvolvimento dos alunos.</p>
              <div className="flex flex-wrap gap-2">
                {infraestrutura.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5 bg-bg border border-border/50 rounded-full py-1 px-3 text-xs text-text-secondary">
                    <Check className="w-3 h-3 text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Programa de ensino */}
          {escola.etapas_modalidades && (
          <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-text-tertiary" />
              Programa de ensino
            </h2>
            <div className="space-y-4">
                  {gruposDisponiveis.map((grupo) => {
                    const series = SERIES.filter((s) => s.grupo === grupo);
                    const { min, max, temDados } = getPrecoGrupo(grupo);
                    const Icone = ICONE_GRUPO[grupo] || GraduationCap;
                    const cor = COR_GRUPO[grupo] || "";
                    return (
                      <div key={grupo} className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cor}`}>
                          <Icone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-text">{grupo}</h3>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {series.map((s) => s.nome).join(", ")}
                          </p>
                          {temDados && isPrivada && (
                            <p className="text-xs font-medium text-text mt-0.5">
                              Mensalidade: {fmtBr(min)}{min !== max ? ` - ${fmtBr(max)}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
          </section>
          )}

          {/* Localização */}
          <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-text-tertiary" />
              Localização
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="bg-bg border border-border/40 rounded-xl p-3 text-sm flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Cidade</span>
                <span className="text-text">{escola.municipio} - {escola.uf}</span>
              </div>
              {escola.bairro && (
                <div className="bg-bg border border-border/40 rounded-xl p-3 text-sm flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Bairro</span>
                  <span className="text-text">{escola.bairro}</span>
                </div>
              )}
              {escola.endereco && (
                <div className="bg-bg border border-border/40 rounded-xl p-3 text-sm flex flex-col gap-0.5 sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Endereço</span>
                  <span className="text-text">{escola.endereco}</span>
                </div>
              )}
            </div>
            {escola.latitude && escola.longitude && (
              <div className="h-48 md:h-56 rounded-xl overflow-hidden group relative">
                <iframe
                  title={"Mapa - " + escola.nome}
                  src={"https://www.openstreetmap.org/export/embed.html?bbox="
                    + (escola.longitude - 0.01) + "%2C" + (escola.latitude - 0.01) + "%2C"
                    + (escola.longitude + 0.01) + "%2C" + (escola.latitude + 0.01)
                    + "&layer=mapnik&marker=" + escola.latitude + "%2C" + escola.longitude}
                  className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer" />
                <a href={`https://www.openstreetmap.org/?mlat=${escola.latitude}&mlon=${escola.longitude}&zoom=15`}
                  target="_blank" rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                  <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface text-sm font-medium text-text shadow-lg transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                    <Expand className="w-4 h-4" />
                    Expandir Mapa
                  </span>
                </a>
              </div>
            )}
          </section>
          {/* Contato */}
          <section className="bg-surface border border-border/60 rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-text mb-4 flex items-center gap-2">
              <Phone className="w-4 h-4 text-text-tertiary" />
              Contato
            </h2>
            <div className="space-y-3">
              {escola.telefone && (
                <a href={`tel:${escola.telefone}`} className="flex items-center gap-3 bg-bg border border-border/40 rounded-xl p-3 text-sm hover:border-text transition-colors">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Telefone</span>
                    <span className="text-text">{escola.telefone}</span>
                  </div>
                </a>
              )}
              <div className="bg-bg border border-border/40 rounded-xl p-3 text-sm flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Endereço</span>
                  <span className="text-text">{escola.endereco || `${escola.municipio} - ${escola.uf}`}</span>
                </div>
              </div>
              <div className="bg-bg border border-border/40 rounded-xl p-3 text-sm flex items-center gap-3">
                <School className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Código INEP</span>
                  <span className="text-text font-mono text-xs">{escola.codigo_inep}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-20 lg:self-start space-y-5 mt-8 lg:mt-0">
          {/* 1. Mensalidades — sempre visível */}
          <div className="bg-surface border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <School className="w-3.5 h-3.5" />
                Mensalidades
              </h3>
            </div>
            {isPrivada ? (
              <>
                {precos.length > 0 && gruposComPreco.length > 0 ? (
                  <div className="divide-y divide-border/10">
                    {gruposComPreco.slice(0, 4).map((grupo) => {
                      const series = SERIES.filter((s) => s.grupo === grupo);
                      const seriesComDados = series.filter((s) => precos.find((p) => p.serie_slug === s.slug && p.qtd_mensalidade > 0));
                      const Icone = ICONE_GRUPO[grupo] || GraduationCap;
                      const corBg = COR_GRUPO[grupo]?.split(" ")[0] || "bg-primary/10";
                      const label = grupo === "Educação Infantil" ? "Infantil" : grupo === "Ensino Fundamental I" ? "Fund. I" : grupo === "Ensino Fundamental II" ? "Fund. II" : "Médio";
                      if (seriesComDados.length === 0) return null;
                      return (
                        <div key={grupo} className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${corBg}`}>
                              <Icone className="w-3 h-3" />
                            </div>
                            <span className="text-[11px] font-semibold text-text uppercase tracking-wider">{label}</span>
                          </div>
                          <div className="space-y-1.5 pl-7">
                            {seriesComDados.map((s) => {
                              const stat = precos.find((p) => p.serie_slug === s.slug);
                              if (!stat) return null;
                              return (
                                <div key={s.slug} className="flex items-center justify-between">
                                  <span className="text-xs text-text-secondary">{s.nome}</span>
                                  <span className="text-xs font-semibold text-text">{fmtBr(stat.media_mensalidade)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-4 text-center">
                    <p className="text-xs text-text-tertiary">Nenhum valor cadastrado ainda.</p>
                  </div>
                )}
                <div className="px-5 pb-5 space-y-2">
                  <button
                    onClick={() => { const s = SERIES[0]; abrirModal(s.slug, s.nome, null); }}
                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:brightness-110 transition-all active:scale-[0.97] cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 inline mr-1.5" />
                    Contribuir com preços
                  </button>
                  <WhatsAppShare nome={escola.nome} slug={slug} />
                </div>
              </>
            ) : (
              <div className="px-5 pb-5">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <Shield className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Escola pública gratuita</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Instituições públicas não cobram mensalidade.</p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Avaliações — sempre visível */}
          <div className="bg-surface border border-border/60 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Avaliações
            </h3>
            {mediasAvaliacoes?.total_avaliacoes > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-text">{Number(mediasAvaliacoes.media_geral).toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5">
                      {renderStarRating(Number(mediasAvaliacoes.media_geral), "w-4 h-4")}
                    </div>
                    <span className="text-xs text-text-tertiary">{mediasAvaliacoes.total_avaliacoes} {mediasAvaliacoes.total_avaliacoes === 1 ? "avaliação" : "avaliações"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {subCriterios.slice(0, 4).map(([label, media]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary truncate mr-2">{label}</span>
                      <div className="flex items-center gap-2 shrink-0 min-w-0">
                        <div className="w-16 md:w-20 h-2 bg-border rounded-full overflow-hidden shrink-0">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${(media / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-text w-5 text-right">{media.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href={`/escola/${slug}/avaliar`}
                  className="block text-center text-xs font-medium text-primary hover:underline pt-1 w-full">
                  Ver todas as avaliações
                </Link>
              </>
            ) : (
              <p className="text-xs text-text-tertiary text-center py-2">Nenhuma avaliação ainda. Seja o primeiro!</p>
            )}
            <Link href={`/escola/${slug}/avaliar`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.97]">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Avaliar escola
            </Link>
          </div>

        </aside>
      </article>

      {/* Reviews section — full width ribbon */}
      {mediasAvaliacoes?.total_avaliacoes > 0 && (
        <section id="avaliacoes" className="w-full bg-gradient-to-br from-primary/5 via-purple-500/5 to-coral/5 border-y border-border/40 py-12 md:py-16 mt-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
              {/* Left: Summary */}
              <div className="lg:max-w-md space-y-5">
                <h2 className="text-2xl font-bold text-text">Avaliações de alunos, pais e responsáveis.</h2>
                <p className="text-sm text-text-secondary">Confira avaliações reais sobre a experiência com {nomeFormatado}.</p>

                <div className="space-y-2">
                  <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold">Avaliação média</p>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-text">{Number(mediasAvaliacoes.media_geral).toFixed(1)}</span>
                    <span className="text-base font-medium text-text-secondary mb-1">Excelente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStarRating(Number(mediasAvaliacoes.media_geral), "w-5 h-5")}
                    <span className="text-xs text-text-tertiary">({mediasAvaliacoes.total_avaliacoes} {mediasAvaliacoes.total_avaliacoes === 1 ? "avaliação" : "avaliações"})</span>
                  </div>
                </div>

                <hr className="border-border/40" />

                <div className="space-y-2.5">
                  {subCriterios.map(([label, media]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{label}</span>
                      <div className="flex items-center gap-1.5">
                        {renderStarRating(media, "w-3 h-3")}
                        <span className="text-xs font-semibold text-text">{media.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href={`/escola/${slug}/avaliar`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:brightness-110 transition-all">
                  <MessageSquare className="w-4 h-4" />
                  Avaliar escola
                </Link>
              </div>

              {/* Right: Review cards */}
              <div className="flex-1 min-w-0 space-y-4">
                {comentariosAvaliacoes.slice(0, 4).map((c, i) => {
                  const notas = [c.nota_infraestrutura, c.nota_seguranca, c.nota_pedagogico, c.nota_acolhimento, c.nota_cursos_extras, c.nota_diversidade, c.nota_inclusao].filter((n) => n != null);
                  const mediaNota = notas.length > 0 ? notas.reduce((a: number, b: number) => a + b, 0) / notas.length : 0;
                  return (
                    <div key={i} className="bg-surface border border-border/60 rounded-xl p-5 space-y-2.5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {c.relacao_escola?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-text truncate">
                              {c.relacao_escola === "PAIMAE" ? "Pai/Mãe" :
                               c.relacao_escola === "ALUNO" ? "Aluno" :
                               c.relacao_escola === "EXALUNO" ? "Ex-aluno" :
                               c.relacao_escola === "PROFESSOR" ? "Professor" : "Usuário"}
                            </p>
                            <p className="text-[10px] text-text-tertiary">{new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {renderStarRating(mediaNota, "w-3 h-3")}
                          <span className="text-xs font-semibold text-text">{mediaNota.toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                        &ldquo;{c.comentario}&rdquo;
                      </p>
                    </div>
                  );
                })}
                {comentariosAvaliacoes.length > 4 && (
                  <a href="#avaliacoes" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                    Ver mais avaliações <ChevronRight className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tuition section — full width */}
      {isPrivada && (
        <section className="w-full bg-surface border-b border-border/40 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text">Mensalidades e valores</h2>
              <p className="text-sm text-text-tertiary mt-1">Valores colaborativos compartilhados por outros pais e responsáveis.</p>
            </div>

            {precos.length === 0 ? (
              <div className="text-center space-y-4 py-8">
                <p className="text-sm text-text-tertiary">Nenhum valor cadastrado ainda para esta escola.</p>
                <button onClick={() => { const s = SERIES[0]; abrirModal(s.slug, s.nome, null); }}
                  className="inline-flex items-center gap-2 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:brightness-110 transition-all active:scale-[0.97]">
                  <Edit3 className="w-4 h-4" /> Seja o primeiro a contribuir
                </button>
                <WhatsAppShare nome={escola.nome} slug={slug} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {MACRO_GRUPOS.map((grupo) => {
                  const series = SERIES.filter((s) => s.grupo === grupo);
                  const { min, max, temDados } = getPrecoGrupo(grupo);
                  const Icone = ICONE_GRUPO[grupo] || GraduationCap;
                  const cor = COR_GRUPO[grupo] || "";
                  const seriesComPreco = series.filter((s) => precos.find((p) => p.serie_slug === s.slug && p.qtd_mensalidade > 0));
                  return (
                    <section key={grupo} aria-label={grupo} className="bg-bg border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col">
                      <header className="flex items-center gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center ${cor}`}>
                          <Icone className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-text">{grupo}</h3>
                      </header>

                      {temDados ? (
                        <div className="flex-1 space-y-2">
                          <div className="text-center py-3">
                            <p className="text-xs text-text-tertiary">Mensalidade</p>
                            <p className="text-xl font-black text-text">{fmtBr(min)}</p>
                            {min !== max && (
                              <p className="text-xs text-text-tertiary">a {fmtBr(max)}</p>
                            )}
                          </div>
                          <div className="border-t border-border/20 pt-2 space-y-1">
                            {seriesComPreco.slice(0, 3).map((s) => {
                              const stat = precos.find((p) => p.serie_slug === s.slug);
                              return stat ? (
                                <div key={s.slug} className="flex items-center justify-between text-xs">
                                  <span className="text-text-secondary">{s.nome}</span>
                                  <span className="font-medium text-text">{fmtBr(stat.media_mensalidade)}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 space-y-2">
                          <p className="text-xs text-text-tertiary">Nenhum valor cadastrado</p>
                          <button onClick={() => abrirModal(series[0].slug, series[0].nome, null)}
                            className="text-xs font-medium text-primary hover:underline cursor-pointer">
                            + Adicionar preço
                          </button>
                        </div>
                      )}

                      <footer className="mt-4 pt-3 border-t border-border/20">
                        <button
                          onClick={() => abrirModal(seriesComPreco[0]?.slug || series[0].slug, seriesComPreco[0]?.nome || series[0].nome, null)}
                          className="w-full py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <PenLine className="w-3 h-3 inline mr-1" />
                          {temDados ? "Atualizar valores" : "Adicionar preço"}
                        </button>
                      </footer>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal de contribuição */}
      <ModalContribuicao
        aberto={modalAberto}
        fechar={fecharModal}
        serieSlug={modalSerieSlug}
        serieNome={modalSerieNome}
        valoresAtuais={modalStats}
        escolaId={escola.id}
        escolaNome={escola.nome}
        onSalvo={() => {}}
      />
    </main>
  );
}
