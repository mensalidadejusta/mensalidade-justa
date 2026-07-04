import Link from "next/link";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { slugify, makeEscolaSlug } from "@/lib/utils";

type Props = { params: Promise<{ uf: string; cidade: string }> };

async function getEscolas(uf: string, cidadeSlug: string) {
  const supabase = createServerClient();
  const ufUpper = uf.toUpperCase();

  // Fetch distinct city names for this UF and match by slug
  const { data: cidadesRaw } = await supabase.rpc("get_cidades", { p_uf: ufUpper });
  const cidades: { municipio: string }[] = (cidadesRaw || []).map((c: any) => ({ municipio: c.municipio }));

  const cidadeMatch = slugMatch(cidades, cidadeSlug);

  if (!cidadeMatch) return { escolas: [], cidade: cidadeSlug };

  // Fetch all pages in parallel
  const ranges = Array.from({ length: 8 }, (_, i) => i * 1000);
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

  return { escolas: todas, cidade: cidadeMatch };
}

function slugMatch(rows: { municipio: string }[], slug: string): string | null {
  if (!rows.length) return null;
  // First try exact match after un-accenting
  for (const r of rows) {
    if (slugify(r.municipio) === slug) return r.municipio;
  }
  // Fallback: match by first word
  const firstWord = slug.split("-")[0];
  for (const r of rows) {
    if (slugify(r.municipio).startsWith(firstWord)) return r.municipio;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uf, cidade: cidadeSlug } = await params;
  const { escolas, cidade } = await getEscolas(uf, cidadeSlug);

  if (escolas.length === 0) {
    return { title: `Nenhuma escola em ${cidadeSlug} | Mensalidade Justa` };
  }

  const ufUpper = uf.toUpperCase();
  const title = `Escolas em ${cidade}/${ufUpper} — ${escolas.length} instituições | Mensalidade Justa`;
  const description = `Veja a lista de ${escolas.length} escolas em ${cidade}/${ufUpper}. Compare mensalidades, matrícula e materiais de forma anônima e gratuita.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function EscolasCidadePage({ params }: Props) {
  const { uf, cidade: cidadeSlug } = await params;
  const { escolas, cidade } = await getEscolas(uf, cidadeSlug);
  const ufUpper = uf.toUpperCase();

  return (
    <div className="min-h-dvh transition-colors">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/busca" className="text-sm text-text-tertiary hover:text-primary transition-colors">
          ← Voltar para busca
        </Link>

        <header className="mt-4 mb-6">
          <h1 className="text-2xl font-semibold">
            Escolas em {cidade}, {ufUpper}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {escolas.length} escola(s) encontrada(s)
          </p>
        </header>

        {escolas.length === 0 ? (
          <div className="card text-center text-sm text-text-tertiary py-10">
            Nenhuma escola encontrada nesta cidade.
          </div>
        ) : (
          <main className="space-y-2">
            {escolas.map((escola) => (
              <Link
                key={escola.id}
                href={`/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`}
                className="result-card block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-medium truncate">{escola.nome}</h2>
                    {escola.bairro && (
                      <p className="text-xs text-text-tertiary mt-0.5">{escola.bairro}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${escola.dependencia_administrativa === "Privada" ? "tag-privada" : "tag-publica"}`}>
                    {escola.dependencia_administrativa === "Privada" ? "Privada" : "Pública"}
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
