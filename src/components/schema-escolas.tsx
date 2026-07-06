type SeriePreco = {
  serie_slug: string;
  serie_nome: string;
  valor_mensalidade: number | null;
  valor_matricula: number | null;
  valor_material: number | null;
  qtd: number;
};

type Escola = {
  id: number;
  nome: string;
  uf: string;
  municipio: string;
  bairro: string | null;
  dependencia_administrativa: string;
  codigo_inep: string;
  series_precos: SeriePreco[];
};

type Props = {
  escolas: Escola[];
};

function calcularPriceRange(escola: Escola): string {
  const precos = escola.series_precos
    .map((s) => s.valor_mensalidade)
    .filter((v): v is number => v != null);

  if (precos.length === 0) {
    return escola.dependencia_administrativa === "Privada" ? "BR-BRL 0-0" : "BR-BRL 0-0";
  }

  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return `BR-BRL ${Math.round(min)}-${Math.round(max)}`;
}

export default function SchemaEscolas({ escolas }: Props) {
  if (!escolas || escolas.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: escolas.map((escola, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "School",
        name: escola.nome,
        address: {
          "@type": "PostalAddress",
          addressLocality: escola.municipio,
          addressRegion: escola.uf,
          streetAddress: escola.bairro || escola.municipio,
          addressCountry: "BR",
        },
        priceRange: calcularPriceRange(escola),
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
