"use client";

import { Fragment, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function fmt(valor: number | null) {
  if (valor == null) return "\u2014";
  return "R$ " + Number(valor).toFixed(2);
}

function WhatsAppShare({ nome, slug, compact }: { nome: string; slug: string; compact?: boolean }) {
  const isBrowser = typeof window !== "undefined";
  const origin = isBrowser ? window.location.origin : "https://mensalidadejusta.com.br";
  const url = origin + "/escola/" + slug;
  const texto =
    "Ol\u00e1! \ud83d\udc4b\n\n" +
    "Tudo bem? " +
    "Eu encontrei a p\u00e1gina do *" + nome + "* no Mensalidade Justa e vi que ainda n\u00e3o tem nenhum valor de mensalidade cadastrado l\u00e1. " +
    "Se voc\u00ea conhece algu\u00e9m que estuda ou j\u00e1 estudou nessa escola, poderia compartilhar esse link com essa pessoa?\n\n" +
    "\u00c9 super r\u00e1pido e an\u00f4nimo \u2014 leva menos de 1 minuto. " +
    "Os dados ajudam outros pais e alunos a terem uma ideia mais justa dos pre\u00e7os praticados.\n\n" +
    "\ud83d\udd17 " + url + "\n\n" +
    "Muito obrigado! \ud83d\udc99";

  return (
    <a href={"https://wa.me/?text=" + encodeURIComponent(texto)} target="_blank" rel="noopener noreferrer"
      className={"inline-flex items-center justify-center gap-2 bg-[#25d366] text-white font-medium rounded-xl text-sm hover:bg-[#20bd5a] transition-all active:scale-95 " + (compact ? "py-2.5 px-5 flex-1" : "py-2.5 px-5 w-full")}>
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      {compact ? "Conhece dessa escola? Convidar" : "Conhece alguém? Compartilhar"}
    </a>
  );
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const router = useRouter();
  const grupos = [...new Set(SERIES.map((s) => s.grupo))];

  return (
    <div className="min-h-dvh transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-start justify-between mb-6">
          <button onClick={() => router.back()} className="text-sm text-text-tertiary hover:text-primary transition-colors cursor-pointer">
            ← Voltar para busca
          </button>
        </header>

        <main className="space-y-6">
          <section>
            <h1 className="text-2xl font-semibold">{escola.nome}</h1>
            <p className="text-sm text-text-secondary mt-1">{escola.municipio} \u2014 {escola.uf}</p>
          </section>

          {escola.categoria_administrativa === "Privada" && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Mensalidades</h2>
            {precos.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-text-tertiary">Nenhum valor cadastrado ainda.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href={"/contribuir?escola=" + escola.codigo_inep}
                    className="flex-1 inline-flex items-center justify-center gap-2 gradient-btn py-2.5 px-5 rounded-xl text-sm">
                    ✏️ Seja o primeiro a contribuir
                  </Link>
                  <WhatsAppShare nome={escola.nome} slug={slug} compact />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-tertiary border-b border-border">
                      <th className="text-left py-2 pr-3 font-medium">{'S\u00e9rie'}</th>
                      <th className="text-right py-2 px-2 font-medium">Qtd</th>
                      <th className="text-right py-2 px-2 font-medium">{'M\u00edn'}</th>
                      <th className="text-right py-2 px-2 font-medium">{'M\u00e9dia'}</th>
                      <th className="text-right py-2 pl-2 font-medium">{'M\u00e1x'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo) => {
                      const series = SERIES.filter((s) => s.grupo === grupo);
                      const hasData = series.some((s) => precos.find((p) => p.serie_slug === s.slug));
                      if (!hasData) return null;
                      return (
                        <Fragment key={grupo}>
                          <tr className="border-b border-border">
                            <td colSpan={5} className="py-2 text-xs font-semibold text-text-secondary">{grupo}</td>
                          </tr>
                          {series.map((s) => {
                            const p = precos.find((pr) => pr.serie_slug === s.slug);
                            if (!p || !p.qtd_mensalidade) return null;
                            return (
                              <tr key={s.slug} className="border-b border-border last:border-0">
                                <td className="py-2 pr-3">{s.nome}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-xs text-text-tertiary">{p.qtd_mensalidade}</td>
                                <td className="py-2 px-2 text-right tabular-nums">{fmt(p.min_mensalidade)}</td>
                                <td className="py-2 px-2 text-right tabular-nums font-semibold">{fmt(p.media_mensalidade)}</td>
                                <td className="py-2 pl-2 text-right tabular-nums">{fmt(p.max_mensalidade)}</td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {escola.categoria_administrativa !== "Privada" && (
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Mensalidades</h2>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">{'Escola p\u00fablica gratuita'}</p>
          </div>
          )}

          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">{'Informa\u00e7\u00f5es da Escola'}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {escola.bairro && <div><dt className="text-text-tertiary text-xs">Bairro</dt><dd>{escola.bairro}</dd></div>}
              <div>
                <dt className="text-text-tertiary text-xs">{'Depend\u00eancia'}</dt>
                <dd>
                  <span className={"inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full " + (escola.dependencia_administrativa === "Privada" ? "tag-privada" : "tag-publica")}>
                    {escola.dependencia_administrativa === "Privada" ? 'Privada' : 'P\u00fablica'}
                  </span>
                  {escola.categoria_administrativa && " \u2014 " + escola.categoria_administrativa}
                  {escola.categoria_escola_privada && " \u2014 " + escola.categoria_escola_privada}
                </dd>
              </div>
              {escola.localizacao && <div><dt className="text-text-tertiary text-xs">{'Localiza\u00e7\u00e3o'}</dt><dd>{escola.localizacao}</dd></div>}
              {escola.localidade_diferenciada && escola.localidade_diferenciada !== "A escola n\u00e3o est\u00e1 em \u00e1rea de localiza\u00e7\u00e3o diferenciada" && <div><dt className="text-text-tertiary text-xs">Localidade</dt><dd>{escola.localidade_diferenciada}</dd></div>}
              {escola.endereco && <div className="sm:col-span-2"><dt className="text-text-tertiary text-xs">{'Endere\u00e7o'}</dt><dd className="text-sm">{escola.endereco}</dd></div>}
              {escola.telefone && <div><dt className="text-text-tertiary text-xs">Telefone</dt><dd>{escola.telefone}</dd></div>}
              {escola.porte_escola && <div><dt className="text-text-tertiary text-xs">Porte</dt><dd className="text-xs">{escola.porte_escola}</dd></div>}
              {escola.etapas_modalidades && <div className="sm:col-span-2"><dt className="text-text-tertiary text-xs">Etapas</dt><dd className="text-xs">{escola.etapas_modalidades}</dd></div>}
              {escola.outras_ofertas && <div className="sm:col-span-2"><dt className="text-text-tertiary text-xs">Outras Ofertas</dt><dd className="text-xs">{escola.outras_ofertas}</dd></div>}
              {escola.conveniada_poder_publico && <div><dt className="text-text-tertiary text-xs">Conveniada</dt><dd className="text-xs">{escola.conveniada_poder_publico}</dd></div>}
              {escola.regulamentacao_conselho && <div><dt className="text-text-tertiary text-xs">{'Regulamenta\u00e7\u00e3o'}</dt><dd className="text-xs">{escola.regulamentacao_conselho}</dd></div>}
              <div><dt className="text-text-tertiary text-xs">{'C\u00f3digo INEP'}</dt><dd className="font-mono text-xs">{escola.codigo_inep}</dd></div>
              {escola.restricao_atendimento && <div className="sm:col-span-2"><dt className="text-text-tertiary text-xs">{'Restri\u00e7\u00e3o'}</dt><dd className="text-xs">{escola.restricao_atendimento}</dd></div>}
            </dl>
          </div>

          {escola.latitude && escola.longitude && (
            <div className="card p-0 overflow-hidden h-48">
              <iframe title={"Mapa - " + escola.nome}
                src={"https://www.openstreetmap.org/export/embed.html?bbox=" + (escola.longitude - 0.01) + "%2C" + (escola.latitude - 0.01) + "%2C" + (escola.longitude + 0.01) + "%2C" + (escola.latitude + 0.01) + "&layer=mapnik&marker=" + escola.latitude + "%2C" + escola.longitude}
                className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
