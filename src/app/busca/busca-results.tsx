import Link from "next/link";
import { Edit3 } from "lucide-react";
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

type Props = {
  resultados: EscolaResult[];
  hoveredId?: number | null;
  onHover?: (id: number | null) => void;
};

export default function BuscaResults({
  resultados,
  hoveredId,
  onHover,
}: Props) {
  if (resultados.length === 0) {
    return (
      <div className="text-center text-sm text-[var(--color-text-tertiary)] py-12">
        <p className="font-medium">Nenhuma escola corresponde aos filtros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {resultados.map((escola) => {
        const isHovered = hoveredId === escola.id;
        return (
          <article key={escola.id}>
            <Link
              href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
              className={`block bg-[var(--color-surface)] border rounded-2xl p-3 md:p-4 transition-all duration-300 ease-in-out ${
                isHovered
                  ? "border-[var(--color-primary)]/40 -translate-y-1 shadow-[0_0_20px_-5px_rgba(66,133,244,0.3),0_-4px_20px_-8px_rgba(139,92,246,0.2),0_4px_20px_-8px_rgba(236,72,153,0.15)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)] hover:-translate-y-1 hover:shadow-[0_0_20px_-5px_rgba(66,133,244,0.2),0_-4px_20px_-8px_rgba(139,92,246,0.15),0_4px_20px_-8px_rgba(236,72,153,0.1)]"
              }`}
              onMouseEnter={() => onHover?.(escola.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              <div className="flex items-start justify-between gap-2 md:gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs md:text-sm font-semibold text-[var(--color-text)] tracking-tight leading-snug">
                    {escola.nome}
                  </h2>
                  <p className="text-[10px] md:text-xs text-[var(--color-text-tertiary)] mt-0.5 font-medium">
                    {escola.bairro && `${escola.bairro}, `}
                    {escola.municipio} - {escola.uf}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className={`text-[9px] md:text-[10px] font-bold px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg ${
                      escola.dependencia_administrativa === "Privada"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {escola.dependencia_administrativa === "Privada"
                      ? "Privada"
                      : "P\u00fablica"}
                  </span>
                  {escola.distancia_km !== undefined && (
                    <span className="text-[9px] md:text-[10px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] px-1.5 md:px-2 py-0.5 rounded-md whitespace-nowrap">
                      {escola.distancia_km} km
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-[var(--color-border)]/60 space-y-1 md:space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  {escola.series_precos.length > 0 ? (
                    <div className="space-y-1 md:space-y-1.5 flex-1">
                      {GRUPOS.map((grupo) => {
                        const items = escola.series_precos.filter(
                          (sp) => slugToGrupo.get(sp.serie_slug) === grupo
                        );
                        if (items.length === 0) return null;
                        return (
                          <div key={grupo}>
                            <p className="text-[9px] md:text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-0.5">
                              {grupo}
                            </p>
                            {items.map((sp) => (
                              <p key={sp.serie_slug} className="text-[11px] md:text-xs leading-5">
                                <span className="text-[var(--color-text-secondary)]">
                                  {sp.serie_nome}:{' '}
                                </span>
                                <span className="text-xs md:text-sm font-bold text-[var(--color-primary)]">
                                  R$ {Number(sp.valor_mensalidade).toFixed(2)}
                                </span>
                                <span className="text-[9px] md:text-[10px] text-[var(--color-text-tertiary)] font-normal">
                                  {' /m'}{'\u00ea'}s
                                </span>
                                <span className="text-[9px] md:text-[10px] text-[var(--color-text-tertiary)] font-normal ml-0.5 md:ml-1">
                                  ({sp.qtd})
                                </span>
                              </p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : escola.dependencia_administrativa === "Privada" ? (
                    <p className="text-[11px] md:text-xs text-[var(--color-text-tertiary)] font-medium">
                      Sem mensalidade cadastrada
                    </p>
                  ) : (
                    <p className="text-[11px] md:text-xs text-[var(--color-text-tertiary)] font-medium">
                      {'Escola p\u00fablica gratuita'}
                    </p>
                  )}
                </div>
                {escola.dependencia_administrativa === "Privada" && (
                  <div className="flex gap-1.5 md:gap-2 pt-1.5 md:pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = "/contribuir?escola=" + escola.codigo_inep;
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-semibold py-1.5 md:py-2 px-2 md:px-3 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3 md:w-3.5 md:h-3.5" /> Contribuir
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          "https://api.whatsapp.com/send?text=" +
                            encodeURIComponent(
                              'Ol\u00e1! Conhece algu\u00e9m que estuda no ' +
                                escola.nome +
                                '? Acesse https://mensalidadejusta.com.br/escola/' +
                                makeEscolaSlug(
                                  escola.codigo_inep,
                                  escola.nome
                                ) +
                                ' e ajude a cadastrar os valores reais de mensalidade. \u00c9 r\u00e1pido e an\u00f4nimo! Obrigado \u2764\uFE0F'
                            ),
                          "_blank"
                        );
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-semibold py-1.5 md:py-2 px-2 md:px-3 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3 md:w-3.5 md:h-3.5 fill-current shrink-0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Convidar
                    </button>
                  </div>
                )}
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
