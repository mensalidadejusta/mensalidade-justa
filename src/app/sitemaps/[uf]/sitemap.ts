import type { MetadataRoute } from "next";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { slugify, makeEscolaSlug } from "@/lib/utils";

const BASE = "https://mensalidadejusta.com.br";
const UFS = new Set([
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
]);

type Props = { params: Promise<{ uf: string }> };

export default async function sitemap({ params }: Props): Promise<MetadataRoute.Sitemap> {
  const { uf: ufSlug } = await params;
  const uf = ufSlug.toUpperCase();
  if (!UFS.has(uf)) notFound();

  const supabase = createServerClient();
  const entries: MetadataRoute.Sitemap = [];

  // City listing pages
  const { data: cidades } = await supabase
    .from("escolas")
    .select("municipio")
    .eq("uf", uf)
    .not("municipio", "is", null)
    .order("municipio");

  if (cidades) {
    const seen = new Set<string>();
    for (const row of cidades) {
      if (seen.has(row.municipio)) continue;
      seen.add(row.municipio);
      const cidadeSlug = slugify(row.municipio);
      entries.push({
        url: `${BASE}/escolas/${ufSlug}/${cidadeSlug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // School pages (up to 1000 per state)
  const { data: escolas } = await supabase
    .from("escolas")
    .select("codigo_inep, nome")
    .eq("uf", uf)
    .order("id")
    .limit(1000);

  if (escolas) {
    for (const escola of escolas) {
      entries.push({
        url: `${BASE}/escola/${makeEscolaSlug(escola.codigo_inep, escola.nome)}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
