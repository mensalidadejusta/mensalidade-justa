import Link from "next/link";
import { makeEscolaSlug } from "@/lib/utils";

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
  valor_mensalidade?: number | null;
  valor_matricula?: number | null;
  valor_material?: number | null;
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
                {escola.valor_mensalidade != null ? (
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    R$ {Number(escola.valor_mensalidade).toFixed(2)}
                    <span className="text-[10px] text-slate-400 font-normal">
                      {' /m'}{'\u00ea'}s
                    </span>
                  </p>
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
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {'📍'} {escola.distancia_km} km
                  </p>
                )}
              </div>
              {(escola.valor_matricula != null ||
                escola.valor_material != null) && (
                <div className="flex gap-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {escola.valor_matricula != null && (
                    <span>
                      Matr{'{\u00ed}'}cula:{' '}
                      <strong className="text-slate-600 dark:text-slate-300">
                        R$ {Number(escola.valor_matricula).toFixed(2)}
                      </strong>
                    </span>
                  )}
                  {escola.valor_material != null && (
                    <span>
                      Material:{' '}
                      <strong className="text-slate-600 dark:text-slate-300">
                        R$ {Number(escola.valor_material).toFixed(2)}
                      </strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
