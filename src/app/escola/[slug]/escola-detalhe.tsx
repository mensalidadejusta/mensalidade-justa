"use client";

import { Fragment } from "react";
import ToggleTema from "@/components/toggle-tema";
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

function WhatsAppShare({ nome, slug }: { nome: string; slug: string }) {
  const isBrowser = typeof window !== "undefined";
  const origin = isBrowser ? window.location.origin : "https://mensalidadejusta.com.br";
  const url = origin + "/escola/" + slug;
  const texto =
    "Ol\u00e1! \ud83d\udc4b\n\n" +
    "Voc\u00ea conhece algu\u00e9m que estuda no *" + nome + "*?\n\n" +
    "Estamos mapeando os valores reais de mensalidade das escolas de forma colaborativa e an\u00f4nima. " +
    "Entre no link, veja as informa\u00e7\u00f5es e cadastre os valores \u2014 leva menos de 1 minuto!\n\n" +
    "\ud83d\udd17 " + url + "\n\n" +
    "Obrigado! \ud83d\udc99";

  return (
    <a href={"https://wa.me/?text=" + encodeURIComponent(texto)} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-[#25d366] text-white font-medium py-2.5 px-5 rounded-xl text-sm hover:bg-[#20bd5a] transition-all active:scale-95 w-full justify-center">
      \ud83d\udcac Compartilhar no WhatsApp
    </a>
  );
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const grupos = [...new Set(SERIES.map((s) => s.grupo))];

  return (
    <div className="min-h-dvh transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-start justify-between mb-6">
          <div>
            <Link href="/busca" className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
              \u2190 Voltar para busca
            </Link>
          </div>
          <ToggleTema />
        </header>

        <main className="space-y-6">
          <section>
            <h1 className="text-2xl font-semibold">{escola.nome}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{escola.municipio} \u2014 {escola.uf}</p>
          </section>

          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Mensalidades</h2>
            {precos.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-tertiary)]">Nenhum valor cadastrado ainda.</p>
                <Link href={"/contribuir?escola=" + escola.codigo_inep}
                  className="inline-flex items-center gap-2 gradient-btn py-2.5 px-5 rounded-xl text-sm">
                  ✏️ Seja o primeiro a contribuir
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border)]">
                      <th className="text-left py-2 pr-3 font-medium">S\u00e9rie</th>
                      <th className="text-right py-2 px-2 font-medium">Qtd</th>
                      <th className="text-right py-2 px-2 font-medium">M\u00edn</th>
                      <th className="text-right py-2 px-2 font-medium">M\u00e9dia</th>
                      <th className="text-right py-2 pl-2 font-medium">M\u00e1x</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo) => {
                      const series = SERIES.filter((s) => s.grupo === grupo);
                      const hasData = series.some((s) => precos.find((p) => p.serie_slug === s.slug));
                      if (!hasData) return null;
                      return (
                        <Fragment key={grupo}>
                          <tr className="border-b border-[var(--color-border)]">
                            <td colSpan={5} className="py-2 text-xs font-semibold text-[var(--color-text-secondary)]">{grupo}</td>
                          </tr>
                          {series.map((s) => {
                            const p = precos.find((pr) => pr.serie_slug === s.slug);
                            if (!p || !p.qtd_mensalidade) return null;
                            return (
                              <tr key={s.slug} className="border-b border-[var(--color-border)] last:border-0">
                                <td className="py-2 pr-3">{s.nome}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-xs text-[var(--color-text-tertiary)]">{p.qtd_mensalidade}</td>
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

          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Informa\u00e7\u00f5es da Escola</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {escola.bairro && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Bairro</dt><dd>{escola.bairro}</dd></div>}
              <div>
                <dt className="text-[var(--color-text-tertiary)] text-xs">Depend\u00eancia</dt>
                <dd>
                  <span className={"inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full " + (escola.dependencia_administrativa === "Privada" ? "tag-privada" : "tag-publica")}>
                    {escola.dependencia_administrativa === "Privada" ? "Privada" : "P\u00fablica"}
                  </span>
                  {escola.categoria_administrativa && " \u2014 " + escola.categoria_administrativa}
                  {escola.categoria_escola_privada && " \u2014 " + escola.categoria_escola_privada}
                </dd>
              </div>
              {escola.localizacao && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Localiza\u00e7\u00e3o</dt><dd>{escola.localizacao}</dd></div>}
              {escola.localidade_diferenciada && escola.localidade_diferenciada !== "A escola n\u00e3o est\u00e1 em \u00e1rea de localiza\u00e7\u00e3o diferenciada" && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Localidade</dt><dd>{escola.localidade_diferenciada}</dd></div>}
              {escola.endereco && <div className="sm:col-span-2"><dt className="text-[var(--color-text-tertiary)] text-xs">Endere\u00e7o</dt><dd className="text-sm">{escola.endereco}</dd></div>}
              {escola.telefone && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Telefone</dt><dd>{escola.telefone}</dd></div>}
              {escola.porte_escola && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Porte</dt><dd className="text-xs">{escola.porte_escola}</dd></div>}
              {escola.etapas_modalidades && <div className="sm:col-span-2"><dt className="text-[var(--color-text-tertiary)] text-xs">Etapas</dt><dd className="text-xs">{escola.etapas_modalidades}</dd></div>}
              {escola.outras_ofertas && <div className="sm:col-span-2"><dt className="text-[var(--color-text-tertiary)] text-xs">Outras Ofertas</dt><dd className="text-xs">{escola.outras_ofertas}</dd></div>}
              {escola.conveniada_poder_publico && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Conveniada</dt><dd className="text-xs">{escola.conveniada_poder_publico}</dd></div>}
              {escola.regulamentacao_conselho && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Regulamenta\u00e7\u00e3o</dt><dd className="text-xs">{escola.regulamentacao_conselho}</dd></div>}
              <div><dt className="text-[var(--color-text-tertiary)] text-xs">C\u00f3digo INEP</dt><dd className="font-mono text-xs">{escola.codigo_inep}</dd></div>
              {escola.restricao_atendimento && <div className="sm:col-span-2"><dt className="text-[var(--color-text-tertiary)] text-xs">Restri\u00e7\u00e3o</dt><dd className="text-xs">{escola.restricao_atendimento}</dd></div>}
            </dl>
          </div>

          <div className="card space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">\ud83d\udcac</span>
              <div>
                <h2 className="text-sm font-semibold">Conhece algu\u00e9m que estuda aqui?</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1 leading-relaxed">
                  Compartilhe esta p\u00e1gina no WhatsApp para que pais e alunos possam cadastrar os valores reais de forma an\u00f4nima.
                </p>
              </div>
            </div>
            <WhatsAppShare nome={escola.nome} slug={slug} />
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
