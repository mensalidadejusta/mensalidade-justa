import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase";
import { slugify, makeEscolaSlug } from "@/lib/utils";

const BASE = "https://mensalidadejusta.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();

  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/busca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];

  // City listing pages
  const { data: cidades } = await supabase
    .from("escolas")
    .select("uf, municipio")
    .not("uf", "is", null)
    .not("municipio", "is", null)
    .order("uf")
    .order("municipio");

  if (cidades) {
    const seen = new Set<string>();
    for (const row of cidades) {
      const key = `${row.uf}-${row.municipio}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ufSlug = row.uf.toLowerCase();
      const cidadeSlug = slugify(row.municipio);
      entries.push({
        url: `${BASE}/escolas/${ufSlug}/${cidadeSlug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
      if (entries.length >= 49000) break;
    }
  }

  // School pages (up to 1000 for the sitemap)
  const { data: escolas } = await supabase
    .from("escolas")
    .select("codigo_inep, nome")
    .order("id")
    .limit(1000);

  if (escolas) {
    for (const escola of escolas) {
      const slug = makeEscolaSlug(escola.codigo_inep, escola.nome);
      entries.push({
        url: `${BASE}/escola/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
