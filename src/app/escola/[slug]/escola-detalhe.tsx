"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, X } from "lucide-react";
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
}: {
  aberto: boolean;
  fechar: () => void;
  serieSlug: string;
  serieNome: string;
  valoresAtuais: Estatistica | null;
  escolaId: number;
  escolaNome: string;
}) {
  const [mensalidade, setMensalidade] = useState(
    valoresAtuais?.media_mensalidade ? String(Math.round(valoresAtuais.media_mensalidade)) : ""
  );
  const [matricula, setMatricula] = useState(
    valoresAtuais?.media_matricula ? String(Math.round(valoresAtuais.media_matricula)) : ""
  );
  const [material, setMaterial] = useState(
    valoresAtuais?.media_material ? String(Math.round(valoresAtuais.media_material)) : ""
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    const payload = {
      escola_id: escolaId,
      serie_slug: serieSlug,
      serie_nome: serieNome,
      valor_mensalidade: mensalidade ? parseFloat(mensalidade.replace(",", ".")) : null,
      valor_matricula: matricula ? parseFloat(matricula.replace(",", ".")) : null,
      valor_material: material ? parseFloat(material.replace(",", ".")) : null,
    };
    console.log("Salvando contribuição:", payload);
    // TODO: chamar a API real quando disponível
    // await supabase.from("mensalidades_series").insert(payload);
    await new Promise((r) => setTimeout(r, 600));
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => {
      setSalvo(false);
      fechar();
    }, 1200);
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
          <form
            onSubmit={(e) => { e.preventDefault(); handleSalvar(); }}
            className="px-5 pb-5 space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Mensalidade (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={mensalidade}
                onChange={(e) => setMensalidade(e.target.value)}
                placeholder="Ex: 1200"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">Taxa de Matrícula (R$)</label>
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
              <label className="text-xs font-medium text-text-secondary block mb-1">Custo do Material Didático (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="Ex: 300"
                className="w-full bg-bg border border-border/50 rounded-xl px-4 py-2.5 text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
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
                disabled={salvando}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
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

function CardSerie({ serie, p, onAbrirModal }: { serie: typeof SERIES[number]; p: Estatistica | undefined; onAbrirModal: (slug: string, nome: string, stats: Estatistica | null) => void }) {
  if (!p || !p.qtd_mensalidade) return null;

  const stats = p;

  return (
    <article className="bg-surface border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-base text-text">{serie.nome}</h4>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            stats.qtd_mensalidade <= 1
              ? "bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          }`}>
            {stats.qtd_mensalidade <= 1
              ? "⚠ Carece de mais confirmações"
              : "✅ Preço consolidado"}
          </span>
        </div>

        {stats.media_mensalidade != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{fmtBr(stats.media_mensalidade)}</span>
            <span className="text-xs text-text-tertiary">média</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <span className="text-text-tertiary">Mín: </span>
            <span className="text-text-secondary font-medium">{fmtBr(stats.min_mensalidade)}</span>
          </div>
          <div>
            <span className="text-text-tertiary">Máx: </span>
            <span className="text-text-secondary font-medium">{fmtBr(stats.max_mensalidade)}</span>
          </div>
          {(stats.media_matricula != null || stats.qtd_matricula > 0) && (
            <div>
              <span className="text-text-tertiary">Matrícula: </span>
              <span className="text-text-secondary font-medium">{fmtBr(stats.media_matricula)}</span>
            </div>
          )}
          {(stats.media_material != null || stats.qtd_material > 0) && (
            <div>
              <span className="text-text-tertiary">Material: </span>
              <span className="text-text-secondary font-medium">{fmtBr(stats.media_material)}</span>
            </div>
          )}
        </div>

        <p className="text-[10px] text-text-tertiary">
          Baseado em {stats.qtd_mensalidade} {stats.qtd_mensalidade === 1 ? "contribuição" : "contribuições"}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAbrirModal(serie.slug, serie.nome, stats)}
        className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200 active:scale-[0.97] min-h-[44px]"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Atualizar preço
      </button>
    </article>
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
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
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
                grupos.map((grupo) => {
                  const series = SERIES.filter((s) => s.grupo === grupo);
                  const hasData = series.some((s) => precos.find((p) => p.serie_slug === s.slug));
                  if (!hasData) return null;
                  return (
                    <section key={grupo} aria-label={grupo} className="mb-6">
                      <h3 className="text-xl font-bold text-text mb-4">{grupo}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {series.map((serie) => {
                          const p = precos.find((pr) => pr.serie_slug === serie.slug);
                          return (
                            <CardSerie
                              key={serie.slug}
                              serie={serie}
                              p={p}
                              onAbrirModal={abrirModal}
                            />
                          );
                        })}
                      </div>
                    </section>
                  );
                })
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
