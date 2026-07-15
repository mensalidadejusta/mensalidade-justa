import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { slugify, makeEscolaSlug } from "@/lib/utils";

type Props = { params: Promise<{ uf: string; cidade: string }> };

async function getEscolas(uf: string, cidadeSlug: string) {
  const supabase = createServerClient();
  const ufUpper = uf.toUpperCase();

  const { data: cidadesRaw } = await supabase.rpc("get_cidades", { p_uf: ufUpper });
  const cidades: { municipio: string }[] = (cidadesRaw || []).map((c: any) => ({ municipio: c.municipio }));

  const cidadeMatch = slugMatch(cidades, cidadeSlug);
  if (!cidadeMatch) return { escolas: [], cidade: cidadeSlug, contagem: { total: 0, privadas: 0, publicas: 0 } };

  const ranges = Array.from({ length: 3 }, (_, i) => i * 1000);
  const pages = await Promise.all(
    ranges.map((offset) =>
      supabase
        .from("escolas")
        .select("id, nome, uf, municipio, bairro, dependencia_administrativa, codigo_inep")
        .eq("uf", ufUpper)
        .eq("municipio", cidadeMatch)
        .order("nome")
        .range(offset, offset + 999)
    )
  );

  const todas: any[] = [];
  for (const { data } of pages) {
    if (data?.length) todas.push(...data);
  }

  const privadas = todas.filter((e) => e.dependencia_administrativa === "Privada").length;
  const publicas = todas.length - privadas;

  return { escolas: todas, cidade: cidadeMatch, contagem: { total: todas.length, privadas, publicas } };
}

function slugMatch(rows: { municipio: string }[], slug: string): string | null {
  if (!rows.length) return null;
  for (const r of rows) {
    if (slugify(r.municipio) === slug) return r.municipio;
  }
  const firstWord = slug.split("-")[0];
  for (const r of rows) {
    if (slugify(r.municipio).startsWith(firstWord)) return r.municipio;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade: cidadeSlug } = await params;
  const { escolas, cidade, contagem } = await getEscolas(uf, cidadeSlug);

  if (contagem.total === 0) {
    return { title: `Nenhuma escola em ${cidadeSlug} | Mensalidade Justa` };
  }

  const ufUpper = uf.toUpperCase();
  const title = `Escolas em ${cidade}/${ufUpper} — ${contagem.total} institui\u00e7\u00f5es | Mensalidade Justa`;
  const description = `Veja a lista de ${contagem.total} escolas em ${cidade}/${ufUpper}. Compare mensalidades, matr\u00edcula e materiais de forma an\u00f4nima e gratuita.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function EscolasCidadePage({ params }: Props) {
  const { uf, cidade: cidadeSlug } = await params;
  const { escolas, cidade, contagem } = await getEscolas(uf, cidadeSlug);
  const ufUpper = uf.toUpperCase();

  return (
    <div className="min-h-dvh transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/busca" className="text-sm text-text-tertiary hover:text-primary transition-colors">
          {'\u2190'} Voltar para busca
        </Link>

        <header className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-text">
            Escolas em {cidade}, {ufUpper}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {contagem.total} escola{contagem.total !== 1 ? "s" : ""} encontrada{contagem.total !== 1 ? "s" : ""}
            {contagem.privadas > 0 && <>{' \u2022 '}{contagem.privadas} privada{contagem.privadas !== 1 ? "s" : ""}</>}
            {contagem.publicas > 0 && <>{' \u2022 '}{contagem.publicas} p\u00fablica{contagem.publicas !== 1 ? "s" : ""}</>}
          </p>
        </header>

        {contagem.total === 0 ? (
          <div className="bg-surface border border-border/60 rounded-2xl p-10 text-center">
            <p className="text-sm text-text-tertiary">Nenhuma escola encontrada nesta cidade.</p>
          </div>
        ) : (
          <main className="space-y-2">
            {escolas.map((escola) => (
              <Link
                key={escola.id}
                href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
                className="block bg-surface border border-border/60 rounded-xl p-4 hover:border-border hover:shadow-sm transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-text truncate">{escola.nome}</h2>
                    {escola.bairro && (
                      <p className="text-xs text-text-tertiary mt-0.5">{escola.bairro}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                    escola.dependencia_administrativa === "Privada"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  }`}>
                    {escola.dependencia_administrativa === "Privada" ? "Privada" : "P\u00fablica"}
                  </span>
                </div>
              </Link>
            ))}
          </main>
        )}
      </div>
    </div>
  );
}
