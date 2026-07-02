import Link from "next/link";
import { makeEscolaSlug } from "@/lib/utils";
import { SERIES, GRUPOS } from "@/lib/series";

const slugToGrupo = new Map(SERIES.map((s) => [s.slug, s.grupo]));

export type SeriePreco = {
  serie_slug: string;
  serie_nome: string;
  valor_mensalidade: number | null;
  valor_matricula: number | null;
  valor_material: number | null;
  qtd: number;
};

export type EscolaResult = {
  id: number;
  nome: string;
  uf: string;
  municipio: string;
  bairro: string | null;
  dependencia_administrativa: string;
  latitude: number | null;
  longitude: number | null;
  codigo_inep: string;
  series_precos: SeriePreco[];
  distancia_km?: number;
};

export default function BuscaResults({
  resultados,
}: {
  resultados: EscolaResult[];
}) {
  if (resultados.length === 0) {
    return (
      <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
        <p className="text-3xl mb-3">{'🔍'}</p>
        <p className="font-medium">Nenhuma escola corresponde aos filtros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {resultados.map((escola) => (
        <article key={escola.id}>
          <Link
            href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
            className="block bg-white dark:bg-[#1e1e1f] border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-[#1f1f1f] dark:text-slate-100 tracking-tight leading-snug">
                  {escola.nome}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">
                  {escola.bairro && `${escola.bairro}, `}
                  {escola.municipio} - {escola.uf}
                </p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                  escola.dependencia_administrativa === "Privada"
                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                }`}
              >
                {escola.dependencia_administrativa === "Privada"
                  ? "Privada"
                  : "P\u00fablica"}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                {escola.series_precos.length > 0 ? (
                  <div className="space-y-1.5 flex-1">
                    {GRUPOS.map((grupo) => {
                      const items = escola.series_precos.filter(
                        (sp) => slugToGrupo.get(sp.serie_slug) === grupo
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={grupo}>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                            {grupo}
                          </p>
                          {items.map((sp) => (
                            <p key={sp.serie_slug} className="text-xs leading-5">
                              <span className="text-slate-500 dark:text-slate-400">
                                {sp.serie_nome}:{' '}
                              </span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                R$ {Number(sp.valor_mensalidade).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                {' /m'}{'\u00ea'}s
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({sp.qtd})
                              </span>
                            </p>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : escola.dependencia_administrativa === "Privada" ? (
                  <p className="text-xs text-slate-400 font-medium">
                    Sem mensalidade cadastrada
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">
                    {'Escola p\u00fablica gratuita'}
                  </p>
                )}
                {escola.distancia_km !== undefined && (
                  <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {'📍'} {escola.distancia_km} km
                  </p>
                )}
              </div>
              {escola.dependencia_administrativa === "Privada" && (
                <div className="flex gap-2 pt-2">
                  <Link
                    href={"/contribuir?escola=" + escola.codigo_inep}
                    className="flex-1 text-center text-xs font-semibold py-2 px-3 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all active:scale-95"
                  >
                    {'✏\uFE0F'} Contribuir
                  </Link>
                  <a
                    href={
                      "https://wa.me/?text=" +
                      encodeURIComponent(
                        'Ol\u00e1! Conhece algu\u00e9m que estuda no ' +
                          escola.nome +
                          '? Acesse https://mensalidadejusta.com.br/escola/' +
                          makeEscolaSlug(
                            escola.codigo_inep,
                            escola.nome
                          ) +
                          ' e ajude a cadastrar os valores reais de mensalidade. \u00c9 r\u00e1pido e an\u00f4nimo! Obrigado \ud83d\udc99'
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-xs font-semibold py-2 px-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all active:scale-95"
                  >
                    {'\uD83D\uDCF2'} Convidar
                  </a>
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
