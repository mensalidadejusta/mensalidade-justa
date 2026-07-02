# Mensalidade Justa

App para buscar escolas e consultar mensalidades.

## Stack

- Node.js (ESM), Next.js 16 (App Router, Turbopack), Tailwind CSS v4
- Supabase (PostgreSQL + PostGIS), Leaflet (mapas)
- `@supabase/supabase-js` para acesso REST API (HTTPS)

## Banco de dados (Supabase)

**Projeto:** `ijfwdtemkkoiombxtyip` — `https://ijfwdtemkkoiombxtyip.supabase.co`

**Service role key** está em `.env` (NUNCA versionar).
**Management token** (`sbp_...`) está em `.env` como `SUPABASE_MGMT_TOKEN`.

### Tabelas

- `escolas` (212.386 registros importados do INEP)
  - `codigo_inep` (UNIQUE), `nome`, `uf`, `municipio`, `bairro`, `endereco`, `telefone`, `localizacao`, `dependencia_administrativa` (Municipal/Estadual/Privada/Federal), `categoria_administrativa` (Pública/Privada), `latitude`, `longitude`, `geom` (PostGIS Point 4326), `etapas_modalidades`
  - 158.182 com geom, 54.204 sem coordenadas
  - RLS: leitura pública
  - Índices: nome (GIN trgm), uf, municipio, dependencia, geom (GIST)
- `mensalidades_series` — contribuições de preços por série
  - FK `escola_id` → `escolas.id` CASCADE
  - `serie_slug`, `serie_nome`, `ano_vigencia`, `valor_mensalidade`, `valor_matricula`, `valor_material`
  - RLS: leitura pública, insert apenas authenticated
- `profiles` — vinculada a `auth.users` via trigger `on_auth_user_created`
  - Endereço, lat/lng, geom (Point 4326)

### RPCs

| Função | Descrição |
|--------|-----------|
| `get_ufs()` | UFs distintas |
| `get_cidades(text)` | Cidades de uma UF |
| `get_top_cidades(uf, limit)` | Cidades com mais escolas |
| `escolas_perto_de_mim(lat, lon, raio_km)` | Escolas num raio via PostGIS |
| `buscar_escolas_com_precos(...)` | Busca com LEFT JOIN em mensalidades_series, filtro por etapas_modalidades |
| `get_estatisticas_escola(id)` | Mín, média, máx, qtd por série de uma escola |

## Arquitetura do frontend

- `src/app/busca/page.tsx` — Tela principal com omnibox, filtros (UF, Cidade, Privada/Pública, Etapa, Mensalidade Máxima), lista + mapa (Leaflet)
- `src/app/escola/[slug]/page.tsx` — Página individual da escola com tabela de preços, mapa, compartilhar WhatsApp
- `src/app/contribuir/page.tsx` — Formulário de contribuição com busca de escola, seleção de série e valores
- `src/app/(auth)/` — Login, cadastro (2 etapas: credenciais + endereço opcional), recuperar senha
- `src/components/searchable-select.tsx` — Seletor com painel de busca (UF, Cidade, Etapa)
- `src/components/mapa-escolas.tsx` — Leaflet com 5 estilos de mapa (Padrão, Satélite, Terreno, Claro, Escuro)
- `src/lib/series.ts` — Catálogo de 20 séries em 4 grupos (Educação Infantil, Fundamental I, Fundamental II, Médio)
- `src/lib/utils.ts` — Slugify, parse de slug, conversão cidade-slug

## Conexão com Supabase

Conexão direta PostgreSQL via `pg` não funciona desta rede (host só tem IPv6, rede não roteia IPv6). Usar **sempre** `@supabase/supabase-js` via REST API (HTTPS).

- Cliente browser: `createClient()` de `@/lib/supabase` (usa `createBrowserClient` do `@supabase/ssr`)
- Cliente server (SSR/SSG): `createServerClient()` de `@/lib/supabase` (usa `createClient` do `@supabase/supabase-js` com `persistSession: false`)
- Para queries com mais de 1000 linhas, usar `.range(offset, offset + 999)` para paginar (limite do PostgREST)

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Next.js de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run import` | Importa CSV para `escolas` |
| `npm run migrate` | Executa migration via `pg` |

## Atenção: encoding no Windows

PowerShell corrompe caracteres UTF-8 ao escrever arquivos. Regras:
- **Sempre** usar `String.fromCodePoint(n)` para emojis (ex: `{String.fromCodePoint(0x1F630)}`)
- **Sempre** usar `{'\u00e7'}` (JSX expression) para acentos em JSX text
- **Nunca** escrever acentos diretamente em JSX text (`<p>Informa\u00e7\u00e3o</p>` → `<p>{'Informa\u00e7\u00e3o'}</p>`)
- Para scripts de migração SQL: usar `chr(n)` do PostgreSQL para caracteres especiais

## Migrations

Em `supabase/migrations/`. Extensões: `postgis`, `pg_trgm`. Ordem importa.

Para executar migrations via Management API:
```js
const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlStatement }) }
)
```

## Vercel

- Deploy automático via GitHub na branch `main`
- Env vars necessárias: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `@tailwindcss/postcss` e `tailwindcss` em `dependencies` (não devDependencies — Vercel não instala dev)
- `postcss.config.cjs` (CommonJS, porque `package.json` tem `"type": "module"`)

## Segurança

- `.env` contém service_role key e management token — **nunca commitar**
- `.gitignore`: `.env`, `.env.local`, `node_modules/`, `.next/`, `next-env.d.ts`, `*.csv`
- Dados de usuário são anônimos (LGPD). Exclusão de conta via RPC `excluir_minha_conta()`
