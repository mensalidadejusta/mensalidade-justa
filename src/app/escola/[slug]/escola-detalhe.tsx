"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, PenLine, AlertTriangle, X } from "lucide-react";
import { SERIES } from "@/lib/series";

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

function fmtBr(valor: number | null): string {
  if (valor == null) return "—";
  return "R$ " + Number(valor)
    .toFixed(2)
    .replace(".", ",")
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

function parseBr(valor: string): number | null {
  const limpo = valor.replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
}

const grupos = [...new Set(SERIES.map((s) => s.grupo))];

function ModalContribuicao({
  aberto,
  fechar,
  serieSlug,
  serieNome,
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
  const valorMatNum = matricula ? parseFloat(matricula.replace(",", ".").replace(/[^0-9.]/g, "")) : null;

  // Validação de faixa
  const erroFaixa =
    valorNum != null && (valorNum < 100 || valorNum > 15000);

  // Cálculo da média atual para discrepância
  const mediaAtual =
    valoresAtuais?.media_mensalidade != null
      ? Number(valoresAtuais.media_mensalidade)
      : null;
  const temDiscrepancia =
    !erroFaixa &&
    valorNum != null &&
    mediaAtual != null &&
    mediaAtual > 0 &&
    (valorNum < mediaAtual * 0.5 || valorNum > mediaAtual * 1.5);

  const podeSalvar =
    !salvando &&
    !erroFaixa &&
    (!temDiscrepancia || discrepanciaConfirmada);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (erroFaixa) {
      setErro("O valor da mensalidade deve estar entre R$ 100 e R$ 15.000.");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/contribuir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escola_id: escolaId,
          serie_slug: serieSlug,
          serie_nome: serieNome,
          valor_mensalidade: valorNum,
          valor_matricula: valorMatNum,
          valor_material: material
            ? parseFloat(material.replace(",", ".").replace(/[^0-9.]/g, ""))
            : null,
          honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao salvar. Tente novamente.");
        setSalvando(false);
        return;
      }

      setSalvo(true);
      setTimeout(() => {
        setSalvo(false);
        fechar();
        onSalvo();
        router.refresh();
      }, 1200);
    } catch {
      setErro("Erro de conexão. Verifique sua internet.");
      setSalvando(false);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center sm:justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={fechar} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full sm:max-w-md mx-4 overflow-hidden animate-bottom-sheet-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-text">Contribuir com preços</h3>
          <button
            type="button"
            onClick={fechar}
            className="p-1 rounded-lg text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text">{serieNome}</span>
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">{escolaNome}</p>
        </div>

        {salvo ? (
          <div className="px-5 py-8 text-center space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-text">Obrigado!</p>
            <p className="text-xs text-text-tertiary">Sua contribuição foi registrada.</p>
          </div>
        ) : (
          <form onSubmit={handleSalvar} className="px-5 pb-5 space-y-4">
            {/* Honeypot: invisível para humanos, visível para robôs */}
            <div aria-hidden="true" className="sr-only">
              <label>Não preencher</label>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Mensalidade (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={mensalidade}
                onChange={(e) => setMensalidade(e.target.value)}
                placeholder="Ex: 1200"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {erroFaixa && (
                <p className="text-xs text-danger mt-1">
                  A mensalidade deve estar entre R$ 100 e R$ 15.000.
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Taxa de Matrícula (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: 500"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Custo do Material Didático (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Ex: 300"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Aviso de discrepância */}
            {temDiscrepancia && !erroFaixa && (
              <div className="bg-amber-200/20 border border-amber-400/40 rounded-xl p-3 space-y-2">
                <p className="text-xs text-amber-300 font-medium">
                  ⚠ O valor informado está muito acima ou abaixo da média
                  atual ({fmtBr(mediaAtual)}). Pode ser um erro de digitação?
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discrepanciaConfirmada}
                    onChange={(e) => setDiscrepanciaConfirmada(e.target.checked)}
                    className="mt-0.5 accent-amber-500"
                  />
                  <span className="text-xs text-text-secondary">
                    Confirmo que este valor está correto e confere com a
                    tabela atual da escola.
                  </span>
                </label>
              </div>
            )}

            {/* Erro geral */}
            {erro && (
              <p className="text-xs text-danger bg-danger/10 rounded-lg p-3">
                {erro}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={fechar}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-surface-hover text-text-secondary hover:text-text transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!podeSalvar}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {salvando ? "Salvando..." : "Salvar Valores"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function LinhaSerie({ serie, stats, onAbrirModal }: { serie: typeof SERIES[number]; stats: Estatistica | null | undefined; onAbrirModal: (slug: string, nome: string, stats: Estatistica | null) => void }) {
  const temDados = stats != null && stats.qtd_mensalidade > 0;
  const precisaAviso = temDados && stats!.qtd_mensalidade <= 1;
  const temMatricula = temDados && (stats!.media_matricula != null || stats!.qtd_matricula > 0);
  const temMaterial = temDados && (stats!.media_material != null || stats!.qtd_material > 0);

  const anoVigencia = new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0);

  return (
    <div className="flex items-center justify-between py-3 hover:bg-white/[0.02] px-2 -mx-2 rounded-lg transition-colors border-b border-white/[0.03] last:border-0">
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-text">{serie.nome}</h4>
          {precisaAviso && (
            <div className="relative group/tooltip shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/tooltip:block bg-gray-900 text-white text-[10px] rounded-md py-1 px-2 whitespace-nowrap z-20 shadow-lg pointer-events-none">
                Este valor foi sugerido por usuários e carece de mais confirmações
              </span>
            </div>
          )}
        </div>
        {temDados && (
          <span className="text-[10px] text-text-tertiary/70 mt-0.5 leading-none">
            Ref: {anoVigencia} &bull; {stats!.qtd_mensalidade} {stats!.qtd_mensalidade === 1 ? "contribuição" : "contribuições"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-right shrink-0 ml-4">
        {temDados ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col justify-center">
              {stats!.media_mensalidade != null && (
                <span className="text-sm font-semibold text-text leading-tight">{fmtBr(stats!.media_mensalidade)}</span>
              )}
              <span className="text-[10px] text-text-tertiary mt-1 leading-none">
                {temMatricula ? `Mat: ${fmtBr(stats!.media_matricula)}` : ""}
                {temMatricula && temMaterial ? " | " : ""}
                {temMaterial ? `Mat.: ${fmtBr(stats!.media_material)}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onAbrirModal(serie.slug, serie.nome, stats!)}
              className="p-1.5 text-text-tertiary hover:text-text transition-colors cursor-pointer self-center"
              aria-label="Atualizar"
            >
              <PenLine className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAbrirModal(serie.slug, serie.nome, null)}
            className="text-xs font-medium text-primary hover:text-primary-hover transition-colors flex items-center gap-1 py-1 px-2 rounded-md hover:bg-primary/10 cursor-pointer"
          >
            <span>+ Adicionar preço</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const router = useRouter();
  const isPrivada = escola.categoria_administrativa === "Privada";

  const [modalAberto, setModalAberto] = useState(false);
  const [modalSerieSlug, setModalSerieSlug] = useState("");
  const [modalSerieNome, setModalSerieNome] = useState("");
  const [modalStats, setModalStats] = useState<Estatistica | null>(null);

  function abrirModal(serieSlug: string, serieNome: string, stats: Estatistica | null) {
    setModalSerieSlug(serieSlug);
    setModalSerieNome(serieNome);
    setModalStats(stats);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  const nomeFormatado = capitalizarNome(escola.nome);

  const infoBasica = [
    { rotulo: "Bairro", valor: escola.bairro },
    { rotulo: "Dependência", valor: escola.dependencia_administrativa === "Privada" ? "Privada" : "Pública" },
    { rotulo: "Categoria", valor: escola.categoria_administrativa },
    { rotulo: "Subcategoria", valor: escola.categoria_escola_privada },
    { rotulo: "Localização", valor: escola.localizacao },
    { rotulo: "Porte", valor: escola.porte_escola },
    { rotulo: "Regulamentação", valor: escola.regulamentacao_conselho },
    { rotulo: "Convênio", valor: escola.conveniada_poder_publico },
  ];

  const infoExtra = [
    { rotulo: "Código INEP", valor: escola.codigo_inep },
    { rotulo: "Telefone", valor: escola.telefone },
    { rotulo: "Restrição", valor: escola.restricao_atendimento },
    { rotulo: "Etapas", valor: escola.etapas_modalidades },
    { rotulo: "Outras Ofertas", valor: escola.outras_ofertas },
    { rotulo: "Localidade", valor: escola.localidade_diferenciada !== "A escola não está em área de localização diferenciada" ? escola.localidade_diferenciada : null },
  ];

  return (
    <main className="min-h-dvh bg-bg text-text transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8">

        {/* Colunas 1-2: conteúdo principal */}
        <div className="lg:col-span-2 space-y-8">
          <header className="space-y-4">
            <button
              type="button"
              onClick={() => {
                const lat = escola.latitude;
                const lon = escola.longitude;
                const params = new URLSearchParams();
                if (escola.municipio && escola.uf) params.set("cidade", `${escola.municipio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}-${escola.uf.toLowerCase()}`);
                if (lat && lon) { params.set("lat", lat.toString()); params.set("lon", lon.toString()); }
                params.set("map", "1");
                router.push(`/busca?${params.toString()}`);
              }}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Mapa
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-text">
                {nomeFormatado}
              </h1>
              <p className="text-sm md:text-base text-text-secondary mt-1">
                {escola.bairro ? `${escola.bairro} - ` : ""}{escola.municipio} - {escola.uf}
              </p>
            </div>
          </header>

          {/* Mensalidades */}
          {isPrivada ? (
            <section aria-label="Mensalidades">
              <h2 className="text-xl font-bold text-text mb-1">Mensalidades</h2>
              <p className="text-sm text-text-tertiary mb-6">
                Valores colaborativos compartilhados por outros pais e responsáveis.
              </p>

              {precos.length === 0 ? (
                <div className="bg-surface border border-border/60 rounded-xl p-6 text-center space-y-4">
                  <p className="text-sm text-text-tertiary">
                    Nenhum valor cadastrado ainda para esta escola.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const primeiraSerie = SERIES[0];
                      abrirModal(primeiraSerie.slug, primeiraSerie.nome, null);
                    }}
                    className="inline-flex items-center gap-2 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] min-h-[48px]"
                  >
                    <Edit3 className="w-4 h-4" />
                    Seja o primeiro a contribuir
                  </button>
                  <div>
                    <WhatsAppShare nome={escola.nome} slug={slug} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {grupos.map((grupo) => {
                    const series = SERIES.filter((s) => s.grupo === grupo);
                    const hasAnyData = series.some((s) => {
                      const p = precos.find((pr) => pr.serie_slug === s.slug);
                      return p && p.qtd_mensalidade > 0;
                    });
                    return (
                      <section key={grupo} aria-label={grupo} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">{grupo}</h3>
                        <div className="divide-y divide-white/5 mt-2">
                          {series.map((serie) => {
                            const p = precos.find((pr) => pr.serie_slug === serie.slug);
                            return (
                              <LinhaSerie
                                key={serie.slug}
                                serie={serie}
                                stats={p}
                                onAbrirModal={abrirModal}
                              />
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <section aria-label="Mensalidades" className="bg-surface border border-border/60 rounded-xl p-6">
              <h2 className="text-xl font-bold text-text mb-2">Mensalidades</h2>
              <p className="text-sm text-emerald-600 dark:text-success font-medium">
                ✅ Escola pública gratuita
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Instituições públicas não cobram mensalidade.
              </p>
            </section>
          )}

          {/* Especificações */}
          <section aria-label="Informações sobre a escola">
            <h2 className="text-xl font-bold text-text mb-4">Especificações</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {infoBasica.map((item) =>
                item.valor ? (
                  <div key={item.rotulo} className="bg-surface border border-border/60 rounded-lg p-3 text-sm flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{item.rotulo}</span>
                    <span className="text-text">{item.valor}</span>
                  </div>
                ) : null
              )}
            </div>

            {escola.endereco && (
              <div className="mt-3 bg-surface border border-border/60 rounded-lg p-3 text-sm">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-0.5">Endereço</span>
                <span className="text-text">{escola.endereco}</span>
              </div>
            )}

            <details className="mt-3 group">
              <summary className="text-sm text-text-tertiary hover:text-text cursor-pointer transition-colors list-none flex items-center gap-1.5">
                <span className="text-xs">▶</span>
                Mais informações
              </summary>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {infoExtra.map((item) =>
                  item.valor ? (
                    <div key={item.rotulo} className="bg-surface border border-border/60 rounded-lg p-3 text-sm flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">{item.rotulo}</span>
                      <span className="text-text break-all">{item.valor}</span>
                    </div>
                  ) : null
                )}
              </div>
            </details>
          </section>
        </div>

        {/* Coluna 3: Sidebar */}
        <aside className="lg:col-span-1 space-y-6 mt-8 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
          {escola.latitude && escola.longitude && (
            <div className="rounded-xl overflow-hidden shadow-lg border border-border/60 h-48 md:h-64">
              <iframe
                title={"Mapa - " + escola.nome}
                src={"https://www.openstreetmap.org/export/embed.html?bbox="
                  + (escola.longitude - 0.01) + "%2C" + (escola.latitude - 0.01) + "%2C"
                  + (escola.longitude + 0.01) + "%2C" + (escola.latitude + 0.01)
                  + "&layer=mapnik&marker=" + escola.latitude + "%2C" + escola.longitude}
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="bg-surface border border-border/60 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Tipo</span>
                <span className={`font-semibold ${isPrivada ? "text-purple-400" : "text-emerald-400"}`}>
                  {isPrivada ? "Privada" : "Pública"}
                </span>
              </div>
              {escola.categoria_escola_privada && (
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Categoria</span>
                  <span className="text-text text-right">{escola.categoria_escola_privada}</span>
                </div>
              )}
              {escola.porte_escola && (
                <div className="flex justify-between">
                  <span className="text-text-tertiary">Porte</span>
                  <span className="text-text">{escola.porte_escola}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-tertiary">INEP</span>
                <span className="text-text font-mono text-xs">{escola.codigo_inep}</span>
              </div>
            </div>
          </div>

          {isPrivada && (
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-coral/10 border border-primary/20 rounded-xl p-5 space-y-3 text-center">
              <p className="text-sm font-semibold text-text">
                Ajude outros pais!
              </p>
              <p className="text-xs text-text-tertiary">
                Seu feedback anônimo torna os preços mais justos para todos.
              </p>
              <button
                type="button"
                onClick={() => {
                  const primeiraSerie = SERIES[0];
                  abrirModal(primeiraSerie.slug, primeiraSerie.nome, null);
                }}
                className="block w-full bg-primary text-white font-semibold py-3 px-5 rounded-xl hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] min-h-[48px]"
              >
                ✏ Contribuir com preços
              </button>
              <WhatsAppShare nome={escola.nome} slug={slug} />
            </div>
          )}
        </aside>
      </div>

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

function WhatsAppShare({ nome, slug }: { nome: string; slug: string }) {
  const isBrowser = typeof window !== "undefined";
  const origin = isBrowser ? window.location.origin : "https://mensalidadejusta.com.br";
  const url = origin + "/escola/" + slug;
  const texto =
    "Olá! 👋\n\n"
    + "Tudo bem? "
    + "Eu encontrei a página do *" + nome + "* no Mensalidade Justa e vi que ainda não tem nenhum valor de mensalidade cadastrado lá. "
    + "Se você conhece alguém que estuda ou já estudou nessa escola, poderia compartilhar esse link com essa pessoa?\n\n"
    + "É super rápido e anônimo — leva menos de 1 minuto. "
    + "Os dados ajudam outros pais e alunos a terem uma ideia mais justa dos preços praticados.\n\n"
    + "🔗 " + url + "\n\n"
    + "Muito obrigado! 💙";

  return (
    <a
      href={"https://wa.me/?text=" + encodeURIComponent(texto)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-5 rounded-lg text-sm font-medium bg-[#25d366] text-white hover:bg-[#20bd5a] transition-all duration-200 active:scale-[0.97] min-h-[44px]"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
      Conhece alguém? Compartilhar
    </a>
  );
}
