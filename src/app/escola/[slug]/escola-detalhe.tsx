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
  categoria_administrativa: string | null; latitude: number | null; longitude: number | null;
  restricao_atendimento: string | null; codigo_inep: string;
};

function fmt(valor: number | null) {
  if (valor == null) return "—";
  return `R$ ${Number(valor).toFixed(2)}`;
}

export default function EscolaDetalhe({ escola, slug, precos }: { escola: Escola; slug: string; precos: Estatistica[] }) {
  const grupos = [...new Set(SERIES.map((s) => s.grupo))];
  const seriesMap = new Map(SERIES.map((s) => [s.slug, s]));

  return (
    <div className="min-h-dvh transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <header className="flex items-start justify-between mb-6">
          <div>
            <Link href="/busca" className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">
              ← Voltar para busca
            </Link>
          </div>
          <ToggleTema />
        </header>

        <main className="space-y-6">
          <section>
            <h1 className="text-2xl font-semibold">{escola.nome}</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">{escola.municipio} — {escola.uf}</p>
          </section>

          {/* Price stats table */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Mensalidades</h2>
            {precos.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">Nenhum valor cadastrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[var(--color-text-tertiary)] border-b border-[var(--color-border)]">
                      <th className="text-left py-2 pr-3 font-medium">Série</th>
                      <th className="text-right py-2 px-2 font-medium">Qtd</th>
                      <th className="text-right py-2 px-2 font-medium">Mín</th>
                      <th className="text-right py-2 px-2 font-medium">Média</th>
                      <th className="text-right py-2 pl-2 font-medium">Máx</th>
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
            <h2 className="text-sm font-semibold">Informações da Escola</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {escola.bairro && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Bairro</dt><dd>{escola.bairro}</dd></div>}
              <div>
                <dt className="text-[var(--color-text-tertiary)] text-xs">Dependência</dt>
                <dd>
                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${escola.dependencia_administrativa === "Privada" ? "tag-privada" : "tag-publica"}`}>
                    {escola.dependencia_administrativa === "Privada" ? "Privada" : "Pública"}
                  </span>
                  {escola.categoria_administrativa && ` — ${escola.categoria_administrativa}`}
                </dd>
              </div>
              {escola.endereco && <div className="sm:col-span-2"><dt className="text-[var(--color-text-tertiary)] text-xs">Endereço</dt><dd className="text-sm">{escola.endereco}</dd></div>}
              {escola.telefone && <div><dt className="text-[var(--color-text-tertiary)] text-xs">Telefone</dt><dd>{escola.telefone}</dd></div>}
              <div><dt className="text-[var(--color-text-tertiary)] text-xs">Código INEP</dt><dd className="font-mono text-xs">{escola.codigo_inep}</dd></div>
            </dl>
          </div>

          {escola.latitude && escola.longitude && (
            <div className="card p-0 overflow-hidden h-48">
              <iframe title={`Mapa - ${escola.nome}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${escola.longitude - 0.01}%2C${escola.latitude - 0.01}%2C${escola.longitude + 0.01}%2C${escola.latitude + 0.01}&layer=mapnik&marker=${escola.latitude}%2C${escola.longitude}`}
                className="w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
