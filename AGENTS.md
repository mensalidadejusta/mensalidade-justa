# Mensalidade Justa

App para buscar escolas e consultar mensalidades.

## Stack

- Node.js (ESM), Next.js 16 (App Router, Turbopack), Tailwind CSS v4
- Supabase (PostgreSQL + PostGIS), Leaflet (mapas)
- `@supabase/supabase-js` via REST API (HTTPS) — conexão direta PostgreSQL via `pg` **não funciona** desta rede (host só tem IPv6, rede não roteia IPv6). Exceção: script `npm run migrate` usa `pg` com DNS resolution workaround (`scripts/run-migration.js`).

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Next.js de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | `next lint` (ESLint via Next.js) |
| `npm run import` | Importa CSV para `escolas` via Supabase REST API |
| `npm run migrate` | Executa migration SQL via `pg` direto (com DNS resolution) |

Não há testes, nem script de typecheck.

## Roteamento (App Router)

- `/` → redireciona para `/busca`
- `/busca` — Tela principal. **Server Component** (`page.tsx`) busca dados no Supabase com `next: { revalidate: 86400 }` + `generateMetadata` dinâmico. `busca-content.tsx` (Client) gerencia interatividade (filtros, autocomplete com debounce 500ms, geoloc, toggle mapa/lista). `busca-results.tsx` renderiza `<article>` + `<h2>` semântico para SEO.
- `/escola/[slug]` — Página individual (Server Component + `EscolaDetalhe` client). Slug = `{codigo_inep}-{nome-slugified}`. Usa `get_estatisticas_escola` RPC.
- `/escolas/[uf]/[cidade]` — Server Component para SEO. Busca paginada (8 páginas de 1000). Slug de cidade via `slugify()`.
- `/contribuir` — Formulário de contribuição com busca de escola, seleção de série e valores.
- `/(auth)/` — `login`, `cadastro` (2 etapas: credenciais + endereço opcional), `recuperar-senha`, `alterar-senha`
- `/perfil` — Perfil do usuário logado
- `/sobre` — Sobre o projeto
- `/sitemap.ts` — Sitemap dinâmico (city listing pages + até 1000 schools)

## Supabase

**Projeto:** `ijfwdtemkkoiombxtyip`

### Conexão

- `src/lib/supabase.ts` — `createClient()` (browser, `@supabase/ssr`) e `createServerClient()` (SSR/SSG, `persistSession: false`).
- `src/lib/supabase-server.ts` — `createServerClient()` para Server Components, com `next: { revalidate: 86400 }` via `fetch` customizado (cache de 24h nas respostas REST do Supabase). Usado em `page.tsx` para queries de UFs, cidades e resultados da busca.
- Middleware (`src/middleware.ts`): usa `@supabase/ssr` `createServerClient` com cookie handling. Matcher: `/((?!_next/static|_next/image|favicon.ico).*)`. Redireciona usuários logados de auth routes para `/busca`.
- Queries >1000 linhas: usar `.range(offset, offset + 999)` (limite PostgREST).

### Tabelas atuais

- `escolas` (~212k registros INEP) — `codigo_inep` (UNIQUE), `nome`, `uf`, `municipio`, `bairro`, `dependencia_administrativa`, `categoria_administrativa`, `latitude`, `longitude`, `geom` (Point 4326), `etapas_modalidades`. RLS: leitura pública.
- `mensalidades_series` — contribuições de preços por série. FK `escola_id`, `serie_slug`, `serie_nome`, `ano_vigencia`, `valor_mensalidade`, `valor_matricula`, `valor_material`. RLS: leitura pública, insert authenticated. Unique: (escola_id, serie_slug, ano_vigencia).
- `profiles` — vinculada a `auth.users` via trigger `on_auth_user_created`. Endereço, lat/lng, geom.

### RPCs

`get_ufs()`, `get_cidades(text)`, `get_top_cidades(uf, limit)`, `escolas_perto_de_mim(lat, lon, raio_km)`, `buscar_escolas_com_precos(...)`, `get_estatisticas_escola(id)`, `excluir_minha_conta()`.

### Migrations

`supabase/migrations/` (ordem importa). Extensões: `postgis`, `pg_trgm`. O script `npm run migrate` executa `001_create_tables.sql` com `pg` direto (DNS resolution via Google DNS para contornar IPv6). Alternativa: Management API (`SUPABASE_MGMT_TOKEN`).

## Atenção: encoding no Windows

PowerShell (5.1) corrompe UTF-8 ao escrever arquivos. Regras:
- Usar `String.fromCodePoint(n)` para emojis
- Usar `{'\u00e7'}` (JSX expression) para acentos em JSX text
- Em SQL migration: usar `chr(n)` do PostgreSQL

## Configurações

- `tsconfig.json`: `"@/*"` → `"./src/*"`
- `postcss.config.cjs` (CommonJS, porque `package.json` tem `"type": "module"`)
- `@tailwindcss/postcss` e `tailwindcss` em `dependencies` (não devDependencies — Vercel não instala dev)
- Tailwind v4: `@import "tailwindcss"` no CSS, `@custom-variant dark`, `@theme` para custom colors
- Tema dark: classe `.dark` no `<html>`, gerenciado por `toggle-tema.tsx` (localStorage + prefers-color-scheme)

## Vercel

Deploy automático via GitHub na branch `main`. Env vars necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## .env

```env
SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
SUPABASE_SERVICE_KEY=svc_role_key
NEXT_PUBLIC_SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key
SUPABASE_MGMT_TOKEN=sbp_...
```

`.env` e `.env.local` — **nunca versionar**.

## Skills disponíveis

- `supabase` — integração com Supabase
- `supabase-postgres-best-practices` — performance e otimização
