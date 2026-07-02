import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { parseEscolaSlug } from "@/lib/utils";
import EscolaDetalhe from "./escola-detalhe";

type Props = { params: Promise<{ slug: string }> };

async function getEscola(slug: string) {
  const parsed = parseEscolaSlug(slug);
  if (!parsed) return null;
  const supabase = createServerClient();
  const { data: escola } = await supabase
    .from("escolas")
    .select("id, nome, uf, municipio, bairro, endereco, telefone, dependencia_administrativa, categoria_administrativa, categoria_escola_privada, localizacao, localidade_diferenciada, porte_escola, etapas_modalidades, outras_ofertas, conveniada_poder_publico, regulamentacao_conselho, latitude, longitude, restricao_atendimento, codigo_inep")
    .eq("codigo_inep", parsed.codigoInep)
    .single();

  if (!escola) return null;

  const { data: precos } = await supabase.rpc("get_estatisticas_escola", { p_escola_id: escola.id });

  return { ...escola, precos: precos || [] };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const escola = await getEscola(slug);
  if (!escola) return { title: "Escola não encontrada | Mensalidade Justa" };

  const title = `Mensalidade ${escola.nome} em ${escola.municipio}/${escola.uf} | Mensalidade Justa`;
  const description = `Veja a média de preços de mensalidade, matrícula e material para o ${escola.nome} no bairro ${escola.bairro || escola.municipio}. Informações colaborativas e confidenciais.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article", locale: "pt_BR" },
  };
}

export default async function EscolaPage({ params }: Props) {
  const { slug } = await params;
  const escola = await getEscola(slug);
  if (!escola) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: escola.nome,
    address: {
      "@type": "PostalAddress",
      addressLocality: escola.municipio,
      addressRegion: escola.uf,
      streetAddress: escola.endereco || "",
    },
    telephone: escola.telefone || undefined,
    url: `https://mensalidadejusta.com.br/escola/${slug}`,
    areaServed: { "@type": "City", name: escola.municipio },
    containsPlace: {
      "@type": "Product",
      name: `Mensalidade - ${escola.nome}`,
      description: `Mensalidade escolar no bairro ${escola.bairro || escola.municipio}`,
      category: "Mensalidade Escolar",
      offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "—", highPrice: "—" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EscolaDetalhe escola={escola} slug={slug} precos={escola.precos} />
    </>
  );
}
