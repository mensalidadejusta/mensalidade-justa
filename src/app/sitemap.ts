import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase";

const BASE = "https://mensalidadejusta.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data: ufs } = await supabase.rpc("get_ufs");
  const ufList: string[] = (ufs || []).map((r: any) => r.uf).filter(Boolean);

  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/busca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/sobre`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const uf of ufList) {
    entries.push({
      url: `${BASE}/sitemaps/${uf.toLowerCase()}/sitemap.xml`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
