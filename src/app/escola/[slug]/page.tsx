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

  const anoRef = new Date().getFullYear();

  const { data: idebEscola } = await supabase
    .from("ideb_escolas")
    .select("etapa, ano, ideb, meta_ideb")
    .eq("escola_id", escola.id)
    .order("ano", { ascending: false });

  const { data: idebCidade } = await supabase
    .from("ideb_escolas")
    .select("sg_uf, etapa, ano, ideb")
    .eq("sg_uf", escola.uf)
    .eq("ano", 2023)
    .limit(1000);

  return {
    ...escola,
    precos: precos || [],
    ideb: idebEscola || [],
    idebCidade: idebCidade || [],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const escola = await getEscola(slug);
  if (!escola) return { title: "Escola n\u00e3o encontrada | Mensalidade Justa" };

  const title = `Mensalidade ${escola.nome} em ${escola.municipio}/${escola.uf} | Mensalidade Justa`;
  const description = `Veja a m\u00e9dia de pre\u00e7os de mensalidade, matr\u00edcula e material para o ${escola.nome} no bairro ${escola.bairro || escola.municipio}. Informa\u00e7\u00f5es colaborativas e confidenciais.`;

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
      offers: { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: "\u2014", highPrice: "\u2014" },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <EscolaDetalhe escola={escola} slug={slug} precos={escola.precos} ideb={escola.ideb} idebCidade={escola.idebCidade} />
    </>
  );
}
