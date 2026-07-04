# Mensalidade Justa

App colaborativo para buscar escolas brasileiras e consultar mensalidades.

## Stack

- Node.js (ESM), Next.js 16 (App Router, Turbopack), Tailwind CSS v4
- Supabase (PostgreSQL + PostGIS) via REST API (`@supabase/supabase-js` + `@supabase/ssr`)
- Leaflet (mapas), lucide-react (ícones), framer-motion (animações)
- `next-themes` para alternar tema claro/escuro (`defaultTheme="dark"`, `enableSystem={false}`)

## ⚠️ Turbopack + Tailwind v4: bug crítico

`text-[var(--color-*)]` em className causa injeção de RSC payload no CSS e quebra o build.
**Nunca use** `text-[var(--color-text)]`, `bg-[var(--color-surface)]`, etc.
Use os utilitários do tema diretamente: `text-text`, `bg-surface`, `border-border`, `text-text-tertiary`, `bg-surface-hover`.

Também evite `shadow-[...]` com valores complexos — use `shadow-sm`, `shadow-lg`, etc.

`npm run dev` (Turbopack) frequentemente falha com esse erro.
**Para testar localmente:** `npm run build && npm run start`.

Se o build falhar com `Parsing CSS source code failed` + `self.__next_f.push`, é esse bug.
Solução: remover todos os `text-[var(--color-*)]` do código e garantir que `@theme` use variáveis CSS corretamente.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack — pode falhar) |
| `npm run build` | Build produção |
| `npm run start` | Servidor produção |
| `npm run lint` | `next lint` |
| `npm run import` | Importa CSV (via Supabase REST upsert) |
| `npm run migrate [arquivo]` | Migration SQL via `pg` (workaround IPv6) |

Não há testes nem typecheck.

## Estrutura de rotas

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/` | Redirect | → `/busca` |
| `/busca` | Server + Client | `page.tsx` (fetch dados + filtro server-side), `busca-content.tsx` (filtros client-side, mapa, geoloc), `busca-results.tsx` (cards) |
| `/escola/[slug]` | Server + Client | Slug = `{codigo_inep}-{slugified-name}` |
| `/escolas/[uf]/[cidade]` | Server | Listagem SEO paginada (fetch 8×1000 em paralelo) |
| `/contribuir` | Client | Formulário de contribuição (requer auth) |
| `/login`, `/cadastro`, `/recuperar-senha`, `/alterar-senha` | Client | Auth (roteadas via `src/app/(auth)/`) |
| `/perfil` | Client | Perfil + tema |
| `/sobre` | Server | Página institucional |
| `/sitemap.ts` | Dinâmico | Sitemap SEO (até 49k cidades + 1k escolas) |

## Componentes principais

- **`CaixaBuscaLocalizacao`** — Input de endereço com autocomplete (LocationIQ API). CEP via BrasilAPI. Fallback cidades via Supabase RPC `buscar_cidades` (unaccent ILIKE). Botão "Perto de mim" (geolocation) e toggle mapa.
- **`BuscaContent`** — Toda interatividade: URL params como state, debounce 500ms, ordenação (com preço > distância), filtragem client-side via `dadosExibir` (useMemo).
- **`BuscaResults`** — Cards de escola com preços agregados por grupo (min-max + total contribuições). Botão "Contribuir" → `/contribuir?escola=<inep>`. Botão "Convidar" → WhatsApp share.
- **`SearchableSelect`** — Modal/bottomsheet (mobile) ou sidebar (desktop) para seleção (UF, Cidade, Etapa). Suporta `isMultiple={true}`.
- **`MapaEscolas`** — Leaflet com lazy import. Múltiplos tiles (Padrão, Satélite, Terreno, Claro, Escuro) com layer control. Marcadores com cor (privada=roxo, pública=verde). Pulse animation na localização do usuário.
- **`BotaoTema`** — Toggle claro/escuro via `next-themes`. Renderizado na sidebar (acima do link /sobre).
- **`TabBar`** — Sidebar (desktop) + bottom nav (mobile). Escondida em rotas de auth.

## Tema

- Tema escuro como padrão, sem fallback system. CSS vars em `:root` (claro) e `.dark` (escuro) no `globals.css`.
- Components usam classes `bg-surface`, `text-text`, `border-border` — nunca `bg-[var(--color-*)]`.

## Banco (Supabase)

**Projeto:** `ijfwdtemkkoiombxtyip`

Tabelas:
- `tb_estados` (27) — id UUID, uf VARCHAR(2) UNIQUE, nome
- `tb_cidades` (5570) — id UUID, estado_id FK, nome; UNIQUE(estado_id, nome)
- `escolas_raw` (219k) — tabela original, sem uf/municipio, com cidade_id FK, RLS SELECT público
- `escolas` (VIEW) — join escolas_raw + tb_cidades + tb_estados, expõe uf e municipio, `security_invoker=true`
- `mensalidades` (0 rows) — tabela original (legacy, não usada pelo app, mas ainda existe)
- `mensalidades_series` (99 rows) — preços por série. FK escola_id, serie_slug, ano_vigencia, user_id (nullable). UNIQUE(escola_id, serie_slug, ano_vigencia). RLS: SELECT público, INSERT authenticated.
- `profiles` (2) — vinculada a auth.users via trigger `handle_new_user`.

RPCs:
- `get_ufs()` — lista UFs de tb_estados
- `get_cidades(p_uf)` — cidades de um estado
- `buscar_cidades(p_termo)` — busca cidades com unaccent ILIKE (limite 8)
- `buscar_escolas_com_precos_detalhado(p_uf, p_municipio, p_serie_slug, p_termo)` — schools + prices aggregated
- `escolas_perto_de_mim(p_lat, p_lon, p_raio_km)` — schools num raio com preços + distância
- `get_top_cidades(p_uf, p_limit)` — top N cidades por qtd de escolas
- `get_estatisticas_escola(p_escola_id)` — estatísticas por série (médias/min/max + qtd)
- `excluir_minha_conta()` — deleta conta autenticada (LGPD)

Conexão:
- Browser: `src/lib/supabase.ts` (`createBrowserClient` do `@supabase/ssr`)
- Server (busca): `src/lib/supabase-server.ts` (fetch com cache 24h + timeout 10s)
- Server (escola/sitemap/footer): `src/lib/supabase.ts` — `createServerClient()` com `autoRefreshToken: false`, sem cache customizado
- `pg` direto não funciona (IPv6). Migration usa DNS resolution via Google DNS (`8.8.8.8`).

## Fluxo de busca

1. `page.tsx` (server): fetch `get_ufs()`, `get_cidades(p_uf)`, `buscar_escolas_com_precos_detalhado(...)`. Aplica filtro server-side (privada/pública, maxPrice).
2. `BuscaContent` (client): recebe resultados. Se geolocalização ativa (URL params `lat`/`lon`), chama `escolas_perto_de_mim`. Filtragem adicional client-side por etapa (serieSlug) via `dadosExibir` (useMemo). Ordenação: escolas com preço primeiro, depois por distância.
3. Filtro de etapa usa fallback: slug "1-ano-fundamental" → busca grupo "Ensino Fundamental I" → matchea "ensino fundamental" na coluna `etapas_modalidades`.

## Windows quirks

- `Remove-Item -Recurse -Force .next` pode falhar com EPERM/EBUSY — executar de novo que resolve
- Acentos em JSX: usar `{'\u00e7'}` (escape) em vez de caracteres literais. PowerShell 5.1 corrompe UTF-8 ao escrever arquivos.

## Migrations

Arquivos em `supabase/migrations/` (ordem importa). Aplicar:
```bash
npm run migrate 006_normalizacao_estado_cidade.sql
```

Extensões: `postgis`, `pg_trgm`, `unaccent`.

## Vercel

Deploy automático via GitHub (branch main). Env necessárias:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_LOCATIONIQ_TOKEN`.
