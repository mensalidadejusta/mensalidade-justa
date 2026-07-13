import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase";
import { parseEscolaSlug } from "@/lib/utils";
import FormularioAvaliacaoPremium from "@/components/FormularioAvaliacaoPremium";

type Props = { params: Promise<{ slug: string }> };

async function getEscola(slug: string) {
  const parsed = parseEscolaSlug(slug);
  if (!parsed) return null;
  const supabase = createServerClient();
  const { data: escola } = await supabase
    .from("escolas")
    .select("id, nome, uf, municipio, bairro")
    .eq("codigo_inep", parsed.codigoInep)
    .single();
  if (!escola) return null;
  return escola;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const escola = await getEscola(slug);
  if (!escola) return { title: "Escola não encontrada | Mensalidade Justa" };

  return {
    title: `Avaliar ${escola.nome} em ${escola.municipio}/${escola.uf} | Mensalidade Justa`,
    description: `Avalie a escola ${escola.nome} e ajude outros pais a escolherem a melhor opção para a educação dos seus filhos.`,
    openGraph: {
      title: `Avaliar ${escola.nome} em ${escola.municipio}/${escola.uf} | Mensalidade Justa`,
      description: `Avalie a escola ${escola.nome} e ajude outros pais a escolherem a melhor opção para a educação dos seus filhos.`,
      type: "website",
      locale: "pt_BR",
    },
    robots: { index: true, follow: true },
  };
}

export default async function AvaliarPage({ params }: Props) {
  const { slug } = await params;
  const escola = await getEscola(slug);
  if (!escola) notFound();

  const endereco = `${escola.municipio} - ${escola.uf}${escola.bairro ? `, ${escola.bairro}` : ""}`;

  return (
    <main className="min-h-dvh bg-bg text-text">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        <FormularioAvaliacaoPremium
          escolaId={escola.id}
          escolaNome={escola.nome}
          escolaEndereco={endereco}
          slug={slug}
        />
      </div>
    </main>
  );
}
