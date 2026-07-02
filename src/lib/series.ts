export type Serie = { slug: string; nome: string; grupo: string };

export const SERIES: Serie[] = [
  // Educação Infantil
  { slug: "baba", nome: "Berçário / Baby", grupo: "Educação Infantil" },
  { slug: "maternal-1", nome: "Maternal I", grupo: "Educação Infantil" },
  { slug: "maternal-2", nome: "Maternal II", grupo: "Educação Infantil" },
  { slug: "maternal-3", nome: "Maternal III", grupo: "Educação Infantil" },
  { slug: "pre-1", nome: "Pré-Escola I (Jardim I)", grupo: "Educação Infantil" },
  { slug: "pre-2", nome: "Pré-Escola II (Jardim II)", grupo: "Educação Infantil" },
  { slug: "pre-3", nome: "Pré-Escola III (Pré)", grupo: "Educação Infantil" },
  // Ensino Fundamental I
  { slug: "1-ano-fundamental", nome: "1º Ano do Ensino Fundamental", grupo: "Ensino Fundamental I" },
  { slug: "2-ano-fundamental", nome: "2º Ano do Ensino Fundamental", grupo: "Ensino Fundamental I" },
  { slug: "3-ano-fundamental", nome: "3º Ano do Ensino Fundamental", grupo: "Ensino Fundamental I" },
  { slug: "4-ano-fundamental", nome: "4º Ano do Ensino Fundamental", grupo: "Ensino Fundamental I" },
  { slug: "5-ano-fundamental", nome: "5º Ano do Ensino Fundamental", grupo: "Ensino Fundamental I" },
  // Ensino Fundamental II
  { slug: "6-ano-fundamental", nome: "6º Ano do Ensino Fundamental", grupo: "Ensino Fundamental II" },
  { slug: "7-ano-fundamental", nome: "7º Ano do Ensino Fundamental", grupo: "Ensino Fundamental II" },
  { slug: "8-ano-fundamental", nome: "8º Ano do Ensino Fundamental", grupo: "Ensino Fundamental II" },
  { slug: "9-ano-fundamental", nome: "9º Ano do Ensino Fundamental", grupo: "Ensino Fundamental II" },
  // Ensino Médio
  { slug: "1-ano-ensino-medio", nome: "1º Ano do Ensino Médio", grupo: "Ensino Médio" },
  { slug: "2-ano-ensino-medio", nome: "2º Ano do Ensino Médio", grupo: "Ensino Médio" },
  { slug: "3-ano-ensino-medio", nome: "3º Ano do Ensino Médio", grupo: "Ensino Médio" },
];

export const GRUPOS = [...new Set(SERIES.map((s) => s.grupo))];

export function getSerieBySlug(slug: string): Serie | undefined {
  return SERIES.find((s) => s.slug === slug);
}
