import { Suspense } from "react";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { getSerieBySlug } from "@/lib/series";
import BuscaContent from "./busca-content";
import type { EscolaResult } from "./busca-results";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function filtrar(
  data: any[],
  showPrivada: boolean,
  showPublica: boolean,
  maxPrice: number | null
): EscolaResult[] {
  let filtrado = [...data];

  if (showPrivada && !showPublica) {
    filtrado = filtrado.filter(
      (e: any) => e.dependencia_administrativa === "Privada"
    );
  } else if (showPublica && !showPrivada) {
    filtrado = filtrado.filter(
      (e: any) => e.dependencia_administrativa !== "Privada"
    );
  } else if (!showPrivada && !showPublica) {
    filtrado = [];
  }

  if (maxPrice != null && !isNaN(maxPrice)) {
    filtrado = filtrado.filter((e: any) => {
      const series = e.series_precos as Array<{ valor_mensalidade: number | null }>;
      if (!series || series.length === 0) return true;
      return series.some((s) => s.valor_mensalidade == null || s.valor_mensalidade <= maxPrice);
    });
  }

  return filtrado as EscolaResult[];
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const cidade = (params.cidade as string) ?? "";
  const uf = (params.uf as string) ?? "";
  const query = (params.q as string) ?? "";
  const serie = (params.serie as string) ?? "";

  const parts: string[] = [];

  if (cidade && uf) {
    parts.push(`Mensalidades Escolares em ${cidade}/${uf.toUpperCase()}`);
  } else if (uf) {
    parts.push(`Escolas em ${uf.toUpperCase()}`);
  } else {
    parts.push("Buscar Escolas e Comparar Mensalidades");
  }

  if (query) {
    parts.unshift(query);
  }

  if (serie) {
    const s = getSerieBySlug(serie);
    if (s) parts.push(s.nome);
  }

  const title = `${parts.join(" - ")} | Mensalidade Justa`;

  let description =
    "Compare mensalidades escolares de forma an\u00f4nima e gratuita. Encontre escolas por cidade e veja valores de mensalidade, matr\u00edcula e material did\u00e1tico.";
  if (cidade && uf) {
    description = `Veja e compare mensalidades de escolas em ${cidade}/${uf.toUpperCase()}. Contribua com valores an\u00f4nimos e ajude outros pais.`;
  }

  return { title, description };
}

export default async function BuscaPage({ searchParams }: Props) {
  const params = await searchParams;
  const uf = (params.uf as string) ?? "";
  const cidade = (params.cidade as string) ?? "";
  const query = (params.q as string) ?? "";
  const serie = (params.serie as string) ?? "";
  const showPrivada = params.privada !== "0";
  const showPublica = params.publica !== "0";
  const maxPriceStr = (params.maxPrice as string) ?? "";
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;

  const supabase = createServerClient();

  const [{ data: ufsData }, { data: cidadesData }] = await Promise.all([
    supabase.rpc("get_ufs"),
    uf
      ? supabase.rpc("get_cidades", { p_uf: uf })
      : Promise.resolve({ data: null }),
  ]);

  const ufs: string[] = (ufsData || [])
    .map((r: any) => r.uf)
    .filter(Boolean);
  const cidades: string[] = (cidadesData || [])
    .map((r: any) => r.municipio)
    .filter(Boolean);

  const { count: totalEscolas } = await supabase
    .from("escolas_bruta")
    .select("*", { count: "exact", head: true });

  let resultados: EscolaResult[] | null = null;
  if (uf && cidade) {
    const { data } = await supabase.rpc("buscar_escolas_com_precos_detalhado", {
      p_uf: uf,
      p_municipio: cidade,
      p_serie_slug: serie || null,
      p_termo: query || null,
    });
    if (data) {
      resultados = filtrar(data, showPrivada, showPublica, maxPrice);
    }
  }

  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-text-tertiary font-medium animate-pulse bg-bg min-h-dvh">Iniciando...</div>}>
      <BuscaContent ufs={ufs} cidades={cidades} resultados={resultados} totalEscolas={totalEscolas ?? 0} />
    </Suspense>
  );
}
