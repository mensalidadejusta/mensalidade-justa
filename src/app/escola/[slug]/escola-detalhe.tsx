"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3 } from "lucide-react";
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

function fmt(valor: number | null): string {
  if (valor == null) return "\u2014";
  return "R$ " + Number(valor).toFixed(2);
}

function fmtCurto(valor: number | null): string {
  if (valor == null) return "\u2014";
  return "R$ " + Math.round(Number(valor)).toLocaleString("pt-BR");
}

const grupos = [...new Set(SERIES.map((s) => s.grupo))];

function CardSerie({ serie, p, escolaCodigoInep }: { serie: typeof SERIES[number]; p: Estatistica | undefined; escolaCodigoInep: string }) {
  if (!p || !p.qtd_mensalidade) return null;

  const preco = p.media_mensalidade != null ? Number(p.media_mensalidade) : null;

  return (
    <article className="bg-surface border border-border/60 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-primary/30 transition-all duration-200">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base text-text">{serie.nome}</h3>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
            p.qtd_mensalidade <= 1
              ? "bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          }`}>
            {p.qtd_mensalidade <= 1
              ? "\u26a0\ufe0f Carece de mais confirma\u00e7\u00f5es"
              : "\u2705 Pre\u00e7o consolidado"}
          </span>
        </div>

        {p.qtd_mensalidade > 1 && (
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{fmtCurto(p.media_mensalidade)}</span>
            <span className="text-xs text-text-tertiary">m\u00e9dia</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-text-tertiary">M\u00edn: </span>
            <span className="text-text-secondary font-medium">{fmt(p.min_mensalidade)}</span>
          </div>
          <div>
            <span className="text-text-tertiary">M\u00e1x: </span>
            <span className="text-text-secondary font-medium">{fmt(p.max_mensalidade)}</span>
          </div>
          {(p.media_matricula != null || p.qtd_matricula > 0) && (
            <div>
              <span className="text-text-tertiary">Matr\u00edcula: </span>
              <span className="text-text-secondary font-medium">{fmt(p.media_matricula)}</span>
            </div>
          )}
          {(p.media_material != null || p.qtd_material > 0) && (
            <div>
              <span className="text-text-tertiary">Material: </span>
              <span className="text-text-secondary font-medium">{fmt(p.media_material)}</span>
            </div>
          )}
        </div>

        <p className="text-[10px] text-text-tertiary">
          Baseado em {p.qtd_mensalidade} contribui\u00e7\u00e3o(\u00f5es)
        </p>
      </div>

      <Link
        href={"/contribuir?escola=" + escolaCodigoInep}
        className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-200 active:scale-[0.97] min-h-[44px]"
      >
        <Edit3 className="w-3.5 h-3.5" />
        Atualizar pre\u00e7o
      </Link>
    </article>
  );
}

function Metadado({ rotulo, valor, span }: { rotulo: string; valor: string | null | undefined; span?: boolean }) {
  if (!valor) return null;
  return (
    <div className={span ? "lg:col-span-2" : ""}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-0.5">{rotulo}</span>
      <span className="text-sm text-text">{valor}</span>
    </div>
  );
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const router = useRouter();
  const isPrivada = escola.categoria_administrativa === "Privada";

  const infoBasica = [
    { rotulo: "Bairro", valor: escola.bairro },
    { rotulo: "Depend\u00eancia", valor: escola.dependencia_administrativa === "Privada" ? "Privada" : "P\u00fablica" },
    { rotulo: "Categoria", valor: escola.categoria_administrativa },
    { rotulo: "Localiza\u00e7\u00e3o", valor: escola.localizacao },
    { rotulo: "Porte", valor: escola.porte_escola },
    { rotulo: "Regulamenta\u00e7\u00e3o", valor: escola.regulamentacao_conselho },
    { rotulo: "Conv\u00eanio P\u00fablico", valor: escola.conveniada_poder_publico },
  ];

  const infoExtra = [
    { rotulo: "C\u00f3digo INEP", valor: escola.codigo_inep },
    { rotulo: "Telefone", valor: escola.telefone },
    { rotulo: "Restri\u00e7\u00e3o", valor: escola.restricao_atendimento },
    { rotulo: "Etapas", valor: escola.etapas_modalidades },
    { rotulo: "Outras Ofertas", valor: escola.outras_ofertas },
    { rotulo: "Localidade Diferenciada", valor: escola.localidade_diferenciada !== "A escola n\u00e3o est\u00e1 em \u00e1rea de localiza\u00e7\u00e3o diferenciada" ? escola.localidade_diferenciada : null },
  ];

  return (
    <main className="min-h-dvh bg-bg text-text transition-colors">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:grid lg:grid-cols-3 lg:gap-8">

        {/* Colunas 1-2: conteudo principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cabecalho */}
          <header className="space-y-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-text">
                {escola.nome}
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
                Valores colaborativos compartilhados por outros pais e respons\u00e1veis.
              </p>

              {precos.length === 0 ? (
                <div className="bg-surface border border-border/60 rounded-xl p-6 text-center space-y-4">
                  <p className="text-sm text-text-tertiary">
                    Nenhum valor cadastrado ainda para esta escola.
                  </p>
                  <Link
                    href={"/contribuir?escola=" + escola.codigo_inep}
                    className="inline-flex items-center gap-2 bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] min-h-[48px]"
                  >
                    <Edit3 className="w-4 h-4" />
                    Seja o primeiro a contribuir
                  </Link>
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
                    <section key={grupo} className="mb-8" aria-label={grupo}>
                      <h2 className="text-xl font-bold text-text mb-4 mt-6 first:mt-0">
                        {grupo}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {series.map((serie) => {
                          const p = precos.find((pr) => pr.serie_slug === serie.slug);
                          return (
                            <CardSerie
                              key={serie.slug}
                              serie={serie}
                              p={p}
                              escolaCodigoInep={escola.codigo_inep}
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
                {"\u2705 Escola p\u00fablica gratuita"}
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Institui\u00e7\u00f5es p\u00fablicas n\u00e3o cobram mensalidade.
              </p>
            </section>
          )}

          {/* Especificacoes Fisicas */}
          <section aria-label="Informa\u00e7\u00f5es sobre a escola">
            <h2 className="text-xl font-bold text-text mb-4">Especifica\u00e7\u00f5es</h2>
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
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary block mb-0.5">Endere\u00e7o</span>
                <span className="text-text">{escola.endereco}</span>
              </div>
            )}

            {/* Info extra colapsada */}
            <details className="mt-3 group">
              <summary className="text-sm text-text-tertiary hover:text-text cursor-pointer transition-colors list-none flex items-center gap-1.5">
                <span className="text-xs">{"\u25b6"}</span>
                Mais informa\u00e7\u00f5es
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

        {/* Coluna 3: Sidebar com mapa + metadados */}
        <aside className="lg:col-span-1 space-y-6 mt-8 lg:mt-0 lg:sticky lg:top-6 lg:self-start">
          {/* Mini Mapa */}
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

          {/* Resumo rapido na sidebar */}
          <div className="bg-surface border border-border/60 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Tipo</span>
                <span className={`font-semibold ${isPrivada ? "text-purple-400" : "text-emerald-400"}`}>
                  {isPrivada ? "Privada" : "P\u00fablica"}
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

          {/* CTA para contribuir na sidebar */}
          {isPrivada && (
            <div className="bg-gradient-to-br from-primary/10 via-purple-500/10 to-coral/10 border border-primary/20 rounded-xl p-5 space-y-3 text-center">
              <p className="text-sm font-semibold text-text">
                Ajude outros pais!
              </p>
              <p className="text-xs text-text-tertiary">
                Seu feedback an\u00f4nimo torna os pre\u00e7os mais justos para todos.
              </p>
              <Link
                href={"/contribuir?escola=" + escola.codigo_inep}
                className="block w-full bg-primary text-white font-semibold py-3 px-5 rounded-xl hover:bg-primary-hover transition-all duration-200 active:scale-[0.97] min-h-[48px]"
              >
                {"\u270f"} Contribuir com pre\u00e7os
              </Link>
              <WhatsAppShare nome={escola.nome} slug={slug} />
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function WhatsAppShare({ nome, slug }: { nome: string; slug: string }) {
  const isBrowser = typeof window !== "undefined";
  const origin = isBrowser ? window.location.origin : "https://mensalidadejusta.com.br";
  const url = origin + "/escola/" + slug;
  const texto =
    "Ol\u00e1! \ud83d\udc4b\n\n"
    + "Tudo bem? "
    + "Eu encontrei a p\u00e1gina do *" + nome + "* no Mensalidade Justa e vi que ainda n\u00e3o tem nenhum valor de mensalidade cadastrado l\u00e1. "
    + "Se voc\u00ea conhece algu\u00e9m que estuda ou j\u00e1 estudou nessa escola, poderia compartilhar esse link com essa pessoa?\n\n"
    + "\u00c9 super r\u00e1pido e an\u00f4nimo \u2014 leva menos de 1 minuto. "
    + "Os dados ajudam outros pais e alunos a terem uma ideia mais justa dos pre\u00e7os praticados.\n\n"
    + "\ud83d\udd17 " + url + "\n\n"
    + "Muito obrigado! \ud83d\udc99";

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
      Conhece algu\u00e9m? Compartilhar
    </a>
  );
}
