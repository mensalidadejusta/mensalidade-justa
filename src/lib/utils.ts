const lowercaseWords = new Set(["do", "dos", "da", "das", "de", "e", "em", "no", "na", "nos", "nas"]);

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeEscolaSlug(codigoInep: string, nome: string): string {
  return `${codigoInep}-${slugify(nome)}`;
}

export function parseEscolaSlug(slug: string): { codigoInep: string } | null {
  const match = slug.match(/^(\d+)/);
  if (!match) return null;
  return { codigoInep: match[1] };
}

export function slugToCidade(slug: string): string {
  const words = slug.split("-");
  return words
    .map((w, i) => {
      if (i === 0) return w.charAt(0).toUpperCase() + w.slice(1);
      if (lowercaseWords.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}
