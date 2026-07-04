import Link from "next/link";
import { createServerClient } from "@/lib/supabase-server";
import { slugify } from "@/lib/utils";

const UFS_PRIORITY = ["SP", "RJ", "MG", "RS", "PR", "BA", "SC", "PE", "CE", "DF", "ES"];

export default async function Footer() {
  const supabase = createServerClient();
  const cidadesPorUf: Record<string, { municipio: string; total: number }[]> = {};

  for (const uf of UFS_PRIORITY) {
    const { data } = await supabase.rpc("get_top_cidades", { p_uf: uf, p_limit: 25 });
    if (data?.length) cidadesPorUf[uf] = data;
  }

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <nav aria-label="Diretório de escolas por cidade">
          <h2 className="text-sm font-semibold mb-6">Explore por Cidades</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {UFS_PRIORITY.map((uf) => {
              const cidades = cidadesPorUf[uf];
              if (!cidades?.length) return null;
              return (
                <div key={uf}>
                  <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
                    {uf}
                  </h3>
                  <ul className="space-y-1.5">
                    {cidades.map(({ municipio }) => (
                      <li key={municipio}>
                        <Link
                          href={`/escolas/${uf.toLowerCase()}/${slugify(municipio)}`}
                          className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          {municipio}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-tertiary)]">
          <div className="flex gap-4">
            <Link href="/sobre" className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">Sobre</Link>
            <span className="text-xs text-[var(--color-border)]">|</span>
            <a href="mailto:mensalidadejustabr@gmail.com" className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors">Contato</a>
          </div>
          <p>&copy; {new Date().getFullYear()} Mensalidade Justa. Dados colaborativos.</p>
        </div>
      </div>
    </footer>
  );
}
