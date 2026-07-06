# Documentação Completa — Mensalidade Justa

> **App colaborativo para buscar escolas brasileiras e consultar mensalidades.**
> Usuários pesquisam escolas por nome/local, filtram por série/tipo/preço, veem preços no mapa, e contribuem com valores anonimamente.
>
> Se você for uma IA lendo este documento: leia do início ao fim antes de responder qualquer pergunta.
> Este documento é a **única fonte da verdade** sobre o projeto. Siga cada instrução à risca.

---

## Sumário

1. [Stack completa](#1-stack-completa)
2. [Estrutura de diretórios](#2-estrutura-de-diretórios)
3. [Arquitetura e fluxo de dados](#3-arquitetura-e-fluxo-de-dados)
4. [Banco de dados (Supabase PostgreSQL)](#4-banco-de-dados-supabase-postgresql)
5. [Rotas da aplicação](#5-rotas-da-aplicação)
6. [Componentes e sua responsabilidade](#6-componentes-e-sua-responsabilidade)
7. [Tema (claro/escuro)](#7-tema-claroescuro)
8. [Autenticação](#8-autenticação)
9. [SEO e metadados](#9-seo-e-metadados)
10. [Comandos e scripts](#10-comandos-e-scripts)
11. [Migrations](#11-migrations)
12. [Deploy (Vercel)](#12-deploy-vercel)
13. [Problemas conhecidos e workarounds](#13-problemas-conhecidos-e-workarounds)
14. [Especificações detalhadas de componentes](#14-especificações-detalhadas-de-componentes)
15. [Especificações detalhadas de páginas](#15-especificações-detalhadas-de-páginas)
16. [Segurança](#16-segurança)

---

## 1. Stack completa

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js 16 (App Router) | ^16.2.10 |
| Linguagem | TypeScript | 6.0.3 |
| Build tool | Turbopack | embutido no Next.js |
| Estilos | Tailwind CSS | ^4.3.2 |
| PostCSS | @tailwindcss/postcss | ^4.3.2 |
| Ícones | lucide-react | ^1.23.0 |
| Animação | framer-motion | ^12.42.2 |
| Banco | Supabase PostgreSQL 15 + PostGIS | via REST |
| ORM/Client | @supabase/supabase-js | ^2.49.0 |
| SSR Auth | @supabase/ssr | ^0.12.0 |
| Mapas | Leaflet + react-leaflet | ^1.9.4 / ^5.0.0 |
| Cluster | leaflet.markercluster | ^1.5.3 |
| Tema | next-themes | ^0.4.6 |
| Database driver | pg (apenas para migrations) | ^8.22.0 |
| CSV Parser | csv-parse | ^5.6.0 |
| Autoprefixer | autoprefixer | ^10.5.2 |
| React | react + react-dom | ^19.2.7 |

### Configuração Next.js (`next.config.ts`)

```ts
const nextConfig: NextConfig = {};
export default nextConfig;
```

Sem configuração especial. Sem redirects, rewrites, headers ou images remote patterns.

### Configuração TypeScript (`tsconfig.json`)

- `target: "ES2017"`, `module: "esnext"`, `moduleResolution: "bundler"`
- `strict: true`, `jsx: "react-jsx"`
- Path alias: `@/*` → `./src/*`

### Configuração PostCSS (`postcss.config.cjs`)

```js
module.exports = { plugins: { "@tailwindcss/postcss": {} } };
```

---

## 2. Estrutura de diretórios

```
mensalidadejusta.com.br/
├── AGENTS.md                        # Instruções para IA (versão resumida)
├── DOCUMENTACAO_PROJETO.md          # Este arquivo (versão completa)
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.cjs
├── .env                             # Variáveis de ambiente locais
├── .env.local                       # Variáveis de ambiente (não versionado)
│
├── src/
│   ├── middleware.ts                # Middleware de refresh de sessão + redirect
│   │
│   ├── app/
│   │   ├── page.tsx                 # Redirect / → /busca
│   │   ├── layout.tsx               # Root layout: ThemeProvider + AuthProvider + TabBar + Footer
│   │   ├── globals.css              # Tailwind v4 + variáveis CSS + tema dark/light
│   │   ├── sitemap.ts               # Sitemap dinâmico (~49k URLs)
│   │   │
│   │   ├── busca/                   # Tela principal de busca
│   │   │   ├── page.tsx             # Server Component: fetch dados, filtra, SEO
│   │   │   ├── busca-content.tsx    # Client Component: toda interatividade
│   │   │   └── busca-results.tsx    # Componente de cards de escola
│   │   │
│   │   ├── escola/[slug]/
│   │   │   ├── page.tsx             # Server Component: fetch escola + JSON-LD
│   │   │   └── escola-detalhe.tsx   # Client Component: detalhes + tabela de preços
│   │   │
│   │   ├── escolas/[uf]/[cidade]/
│   │   │   └── page.tsx             # Server Component: listagem SEO paginada
│   │   │
│   │   ├── contribuir/
│   │   │   └── page.tsx             # Formulário de contribuição de preços
│   │   │
│   │   ├── (auth)/                  # Grupo de rotas de autenticação (layout compartilhado implícito)
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx    # 2 etapas: credenciais + endereço opcional
│   │   │   ├── recuperar-senha/page.tsx
│   │   │   └── alterar-senha/page.tsx
│   │   │
│   │   ├── perfil/page.tsx          # Perfil do usuário + logout + exclusão LGPD
│   │   └── sobre/page.tsx          # Página institucional
│   │
│   ├── components/
│   │   ├── footer.tsx               # Footer com diretório de cidades
│   │   ├── tab-bar.tsx              # Sidebar (desktop) + bottom nav (mobile)
│   │   ├── toggle-tema.tsx          # Toggle dark/light mode
│   │   ├── mapa-escolas.tsx         # Mapa Leaflet (lazy import)
│   │   ├── searchable-select.tsx    # Select com autocomplete + bottom sheet / sidebar
│   │   └── caixa-busca-localizacao.tsx  # Input de endereço com autocomplete
│   │
│   ├── lib/
│   │   ├── supabase.ts              # Cliente browser + SSR básico (sem cache)
│   │   ├── supabase-server.ts       # Cliente SSR com cache 24h + timeout 10s
│   │   ├── auth-context.tsx         # Contexto de autenticação (React Context)
│   │   ├── utils.ts                 # slugify, makeEscolaSlug, parseEscolaSlug, slugToCidade
│   │   └── series.ts                # Catálogo de séries/etapas de ensino
│   │
│   └── providers/
│       └── theme-provider.tsx       # Provider next-themes (dark fixo, sem system)
│
├── supabase/
│   └── migrations/                  # Migrations SQL (ordem importa!)
│       ├── 001_create_tables.sql
│       ├── 002_excluir_conta.sql
│       ├── 003_profiles_e_geo.sql
│       ├── 004_mensalidades_series.sql
│       ├── 006_normalizacao_estado_cidade.sql
│       └── 007_filtrar_escolas_paralisadas.sql
│
├── scripts/
│   ├── import-csv.js               # Importa CSV de escolas via Supabase REST upsert
│   ├── run-migration.js             # Executa migration SQL via pg direto
│   ├── create-index.mjs             # Utilitário auxiliar
│   ├── fix-accent-colors.mjs        # Script de migração de classes
│   ├── fix-tailwind-classes.mjs     # Script de migração de classes
│   └── fix-theme-colors.mjs         # Script de migração de classes
│
└── public/                          # Assets estáticos
```

---

## 3. Arquitetura e fluxo de dados

### 3.1 Modelo geral

O app usa **Next.js 16 App Router** com uma combinação de Server Components (fetch de dados, SEO) e Client Components (interatividade, mapa). Não há API routes — todas as consultas ao banco são feitas via **Supabase REST API** (RPC functions) diretamente dos componentes.

### 3.2 Fluxo de busca (tela principal)

```
1. Usuário acessa /busca
2. URL params carregam estado: ?uf=SP&cidade=São%20Paulo&q=&serie=&privada=1&publica=1&maxPrice=

3. Server Component (busca/page.tsx):
   a. Lê searchParams (uf, cidade, q, serie, privada, publica, maxPrice)
   b. Cria supabase client com supabase-server.ts (cache 24h + timeout 10s)
   c. get_ufs() → lista todas as UFs
   d. Se uf definida: get_cidades(p_uf) → lista cidades do estado
   e. Se uf + cidade definidos: buscar_escolas_com_precos_detalhado(p_uf, p_municipio, p_serie_slug, p_termo)
   f. Aplica filtro server-side:
      - Se privada=1 e publica=0: só privadas
      - Se publica=1 e privada=0: só públicas
      - Se ambos 0: lista vazia
      - Se maxPrice definido: escolas com pelo menos uma série ≤ maxPrice
   g. Renderiza <BuscaContent> passando ufs[], cidades[], resultados[]

4. BuscaContent (Client Component, busca-content.tsx):
   a. Gerencia estado via URL (useSearchParams + router.replace)
   b. <CaixaBuscaLocalizacao> → input de endereço com autocomplete LocationIQ
   c. <input> → busca de escola por nome (query na VIEW escolas, limite 6)
   d. Filtros: privada/pública, etapa (serieSlug), mapa toggle
   e. Se geolocalização ativa (URL params lat/lon):
      - Chama escolas_perto_de_mim(p_lat, p_lon, 50)
      - MapCenter setado, userLocation setado
   f. Se mapa aberto e sem localização: tenta navigator.geolocation automático
   g. handleLocationChange: se lat/lon → escolas_perto_de_mim; se cidade/uf → server fetch
   h. handleMapBoundsChange: quando o usuário move o mapa, chama escolas_no_mapa
   i. dadosExibir (useMemo): aplica filtro client-side de etapa (serieSlug)
      - slug da série → busca grupo → match ILIKE na coluna etapas_modalidades
      - Ex: "1-ano-fundamental" → grupo "Ensino Fundamental I" → busca "ensino fundamental"
   j. sortedResultados (useMemo): ordena por distância (quem tem preço primeiro)
   k. Layout: mobile (stacked ou fullscreen map) | desktop (painel 55% + mapa 45%)

5. BuscaResults (busca-results.tsx):
   a. Renderiza <article> com <h2> semântico para cada escola
   b. Card com indicador colorido (verde=pública, roxo=privada)
   c. Preços agrupados por etapa (Educação Infantil, Fundamental I/II, Médio)
      - Se serieSlug específica: mostra preço da série selecionada
      - Se todas: mostra min-max por grupo + quantidade de contribuições
   d. Botão "Contribuir" (apenas privadas) → /contribuir?escola=<inep>
   e. Botão "Convidar" (apenas privadas) → WhatsApp share
   f. Hover → sincroniza com marcador no mapa (hoveredId)
   g. Distância: se coordenadas disponíveis, mostra "X km" ou "Xm"

6. Mapa (mapa-escolas.tsx):
   a. Leaflet com lazy import (import("leaflet"))
   b. 5 tiles: Padrão, Satélite, Terreno, Claro, Escuro (com layer control)
   c. Marcadores: circleMarker com cor (privada=#a855f7 roxo, pública=#34d399 verde)
   d. Tooltip permanente no marcador com o preço (se houver)
   e. Popup ao clicar: nome, bairro, preços por grupo, link "Ver detalhes"
   f. Pulse animation na localização do usuário
   g. Limite de marcadores por zoom: z≥14 → 9999, z≥12 → 50, z≥10 → 30, else 15
   h. Ordenação: escolas com preço primeiro
   i. onBoundsChange: quando o mapa é movido, busca escolas na área visível
```

### 3.3 Clientes Supabase

**`src/lib/supabase.ts`** — Duas funções:

1. `createClient()` → browser client (`createBrowserClient` do `@supabase/ssr`)
   - Usa cookies para sessão
   - Usado em: componentes client-side (BuscaContent, contribuir, login, etc.)

2. `createServerClient()` → SSR client (`createSupabaseClient` direto)
   - Sem cookies (`autoRefreshToken: false, persistSession: false`)
   - Usado em: Server Components (escola/page, escolas/[uf]/[cidade]/page, footer, sitemap)

**`src/lib/supabase-server.ts`** — Uma função:

1. `createServerClient()` → SSR client com cache e timeout
   - `next: { revalidate: 86400 }` — cache de 24h
   - `AbortController` com timeout de 10s
   - Usado APENAS em: `busca/page.tsx` (onde a performance é crítica)

### 3.4 Conexão direta PostgreSQL (pg)

- **NÃO funciona por IPv6** — o host só tem IPv6 e a rede não roteia.
- O script `scripts/run-migration.js` contorna isso resolvendo o DNS via Google DNS (8.8.8.8).
- Usado APENAS para aplicar migrations, nunca em produção.

---

## 4. Banco de dados (Supabase PostgreSQL)

**Projeto:** `ijfwdtemkkoiombxtyip`
**Região:** US East (N. Virginia) — `us-east-1`
**Plano:** Free (500MB, CPU compartilhado, conexões limitadas)

### 4.1 Extensões instaladas

- `postgis` — geometria e cálculos de distância
- `pg_trgm` — trigram index para ILIKE em textos longos
- `unaccent` — busca sem acentos

### 4.2 Tabelas

#### `escolas_raw` (~181.065 linhas ativas, após filtro de paralisadas)

Tabela original com os dados do MEC/INEP. Foi renomeada de `escolas` para `escolas_raw` na migration 006.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `SERIAL PRIMARY KEY` | auto increment |
| `codigo_inep` | `VARCHAR(20) UNIQUE NOT NULL` | Código INEP do MEC |
| `nome` | `VARCHAR(500) NOT NULL` | Nome da escola |
| `cidade_id` | `UUID FK → tb_cidades(id)` | Referência normalizada |
| `bairro` | `VARCHAR(300)` | Bairro |
| `endereco` | `TEXT` | Endereço completo |
| `telefone` | `VARCHAR(100)` | Telefone |
| `dependencia_administrativa` | `VARCHAR(50) NOT NULL` | "Privada" ou "Pública" (Estadual/Municipal/Federal) |
| `categoria_administrativa` | `VARCHAR(50)` | Categoria administrativa |
| `categoria_escola_privada` | `VARCHAR(100)` | Subtipo se privada |
| `localizacao` | `VARCHAR(50)` | Urbana/Rural |
| `localidade_diferenciada` | `VARCHAR(200)` | Indígena, quilombola, etc |
| `porte_escola` | `VARCHAR(200)` | Porte da escola |
| `etapas_modalidades` | `TEXT` | Etapas oferecidas (string separada por vírgulas) |
| `outras_ofertas` | `TEXT` | EJA, profissionalizante, etc |
| `conveniada_poder_publico` | `VARCHAR(10)` | Se conveniada com o poder público |
| `regulamentacao_conselho` | `VARCHAR(50)` | Regulamentação |
| `latitude` | `NUMERIC(10,7)` | Latitude |
| `longitude` | `NUMERIC(10,7)` | Longitude |
| `restricao_atendimento` | `VARCHAR(300)` | Restrições. Se = 'ESCOLA PARALISADA', a escola é **excluída** de todos os resultados de busca, mapa e contagens |
| `geom` | `GEOMETRY(Point, 4326)` | PostGIS geometry |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | Data de criação |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | Data de atualização |

**Regra importante:** Escolas com `restricao_atendimento = 'ESCOLA PARALISADA'` (cerca de 31.321 registros) são completamente excluídas de:
- `buscar_escolas_com_precos_detalhado` — não aparecem em buscas
- `escolas_perto_de_mim` — não aparecem no mapa por geolocalização
- `get_top_cidades` — não contam para o total de escolas por cidade

**RLS:** SELECT público (policy `"Escolas visiveis para todos"` usando `true`).

#### `tb_estados` (27 linhas)

| Coluna | Tipo |
|--------|------|
| `id` | `UUID PK DEFAULT gen_random_uuid()` |
| `nome` | `VARCHAR(100) NOT NULL` |
| `uf` | `VARCHAR(2) NOT NULL UNIQUE` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

#### `tb_cidades` (5.570 linhas)

| Coluna | Tipo |
|--------|------|
| `id` | `UUID PK DEFAULT gen_random_uuid()` |
| `estado_id` | `UUID FK → tb_estados(id) ON DELETE RESTRICT` |
| `nome` | `VARCHAR(200) NOT NULL` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |

**UNIQUE:** `(estado_id, nome)`

#### `mensalidades_series` (99+ linhas)

Tabela de preços por série. Criada na migration 004 para substituir a tabela `mensalidades` (legacy).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `UUID PK DEFAULT gen_random_uuid()` | |
| `escola_id` | `INTEGER FK → escolas_raw(id) ON DELETE CASCADE` | |
| `serie_slug` | `VARCHAR(50) NOT NULL` | Slug da série (ex: "1-ano-fundamental") |
| `serie_nome` | `VARCHAR(200) NOT NULL` | Nome legível (ex: "1º Ano") |
| `valor_mensalidade` | `NUMERIC(10,2)` | Valor da mensalidade |
| `valor_matricula` | `NUMERIC(10,2)` | Valor da matrícula |
| `valor_material` | `NUMERIC(10,2)` | Valor do material didático |
| `ano_vigencia` | `INTEGER NOT NULL DEFAULT YEAR(NOW())` | Ano de vigência |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` | |

**UNIQUE:** `(escola_id, serie_slug, ano_vigencia)` — apenas um preço por série/ano por escola.

**RLS:**
- SELECT: público (policy `"Leitura publica"` com `true`)
- INSERT: authenticated apenas (policy `"Usuarios autenticados inserem"` com `auth.role() = 'authenticated'`)

#### `profiles` (~2 linhas)

Vinculada a `auth.users` via trigger `on_auth_user_created`. Criada na migration 003.

| Coluna | Tipo |
|--------|------|
| `id` | `UUID PK FK → auth.users(id) ON DELETE CASCADE` |
| `logradouro` | `TEXT` |
| `numero` | `TEXT` |
| `bairro` | `TEXT` |
| `cidade` | `TEXT` |
| `uf` | `VARCHAR(2)` |
| `cep` | `VARCHAR(9)` |
| `latitude` | `DOUBLE PRECISION` |
| `longitude` | `DOUBLE PRECISION` |
| `geom` | `GEOMETRY(Point, 4326)` |
| `created_at` | `TIMESTAMPTZ DEFAULT NOW()` |
| `updated_at` | `TIMESTAMPTZ DEFAULT NOW()` |

**RLS:**
- SELECT: próprio usuário (policy `"Usuarios veem seu proprio profile"`)
- INSERT: próprio usuário OU trigger (policy `"Trigger insere profile"` com `true`)
- UPDATE: próprio usuário

#### `mensalidades` (0 linhas — LEGACY)

Tabela original, não usada pelo app. Ainda existe no banco mas não é consultada nem inserida.

### 4.3 VIEW `escolas`

```sql
CREATE VIEW escolas WITH (security_invoker = true) AS
SELECT
  r.id, r.codigo_inep, r.nome,
  e.uf,
  c.nome AS municipio,
  r.bairro, r.endereco, r.telefone,
  r.dependencia_administrativa, r.categoria_administrativa,
  r.categoria_escola_privada, r.localizacao,
  r.localidade_diferenciada, r.porte_escola,
  r.etapas_modalidades, r.outras_ofertas,
  r.conveniada_poder_publico, r.regulamentacao_conselho,
  r.latitude, r.longitude, r.restricao_atendimento,
  r.geom, r.created_at, r.updated_at
FROM escolas_raw r
JOIN tb_cidades c ON c.id = r.cidade_id
JOIN tb_estados e ON e.id = c.estado_id;
```

**`security_invoker = true`** — importante para RLS (herda as permissões de quem consulta).

### 4.4 Índices

| Índice | Tipo | Colunas |
|--------|------|---------|
| `escolas_pkey` | btree | id |
| `escolas_codigo_inep_key` | btree UNIQUE | codigo_inep |
| `idx_escolas_nome` | GIN (trgm) | nome |
| `idx_escolas_uf` | btree | uf (legado — removido da raw table) |
| `idx_escolas_municipio` | btree | municipio (legado) |
| `idx_escolas_dependencia` | btree | dependencia_administrativa |
| `idx_escolas_geom` | GIST | geom |
| `idx_escolas_lat_lng` | btree | latitude, longitude |
| `idx_escolas_raw_cidade_id` | btree | cidade_id |
| `idx_tb_estados_uf` | btree UNIQUE | uf |
| `idx_tb_cidades_estado_id_nome` | btree UNIQUE | (estado_id, nome) |
| `idx_mensalidades_series_escola` | btree | (escola_id, serie_slug) |

### 4.5 RPC Functions

Todas as funções são `LANGUAGE SQL STABLE` (a menos que indicado).

| Nome | Parâmetros | Retorno | Descrição |
|------|-----------|---------|-----------|
| `get_ufs()` | — | `TABLE(uf VARCHAR)` | Lista UFs de tb_estados ordenadas por uf |
| `get_cidades(p_uf)` | `p_uf VARCHAR` | `TABLE(municipio VARCHAR)` | Cidades de um estado ordenadas por nome |
| `get_top_cidades(p_uf, p_limit)` | `VARCHAR, INTEGER DEFAULT 25` | `TABLE(municipio VARCHAR, total BIGINT)` | Top N cidades por qtd de escolas (exclui paralisadas) |
| `buscar_cidades(p_termo)` | `p_termo VARCHAR` | `TABLE(cidade VARCHAR, uf VARCHAR)` | Busca cidades com unaccent ILIKE (limite 8) |
| `buscar_escolas_com_precos_detalhado(p_uf, p_municipio, p_serie_slug, p_termo)` | 4× VARCHAR | `TABLE(id INT, nome VARCHAR, uf VARCHAR, municipio VARCHAR, bairro VARCHAR, dependencia_administrativa VARCHAR, categoria_administrativa VARCHAR, latitude NUMERIC, longitude NUMERIC, codigo_inep VARCHAR, series_precos JSON)` | Escolas de uma cidade com preços agregados. Exclui paralisadas. Filtro de etapa via ILIKE em etapas_modalidades |
| `escolas_perto_de_mim(p_lat, p_lon, p_raio_km)` | `DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION DEFAULT 5` | `TABLE(id INT, nome TEXT, uf TEXT, municipio TEXT, bairro TEXT, dependencia_administrativa TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, distancia_km DOUBLE PRECISION)` | Escolas num raio com distância. Exclui paralisadas. Limite 30. Usa ST_DWithin + ST_Distance |
| `escolas_no_mapa(p_min_lat, p_min_lon, p_max_lat, p_max_lon, p_center_lat, p_center_lon, p_limit)` | (bounds) | `TABLE(id INT, nome TEXT, uf TEXT, municipio TEXT, bairro TEXT, dependencia_administrativa TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, codigo_inep TEXT, series_precos JSON)` | Escolas em bounding box, ordenadas por distância ao centro |
| `get_estatisticas_escola(p_escola_id)` | `INT` | estatísticas por série (médias/min/max + qtd) | Usada na página individual da escola |
| `excluir_minha_conta()` | — | `void` | Anonimiza mensalidades + deleta auth.users. SECURITY DEFINER |

### 4.6 Filtro de etapa na RPC `buscar_escolas_com_precos_detalhado`

O filtro por série usa ILIKE na coluna `etapas_modalidades` com mapeamento de slugs para grupos:

```sql
-- Educação Infantil
p_serie_slug IN ('baba','maternal-1','maternal-2','maternal-3','pre-1','pre-2','pre-3')
  → r.etapas_modalidades ILIKE '%Educa'||chr(231)||'ao Infantil%'

-- Ensino Fundamental I (1º ao 5º ano)
p_serie_slug IN ('1-ano-fundamental',...,'5-ano-fundamental')
  → r.etapas_modalidades ILIKE '%Ensino Fundamental%'

-- Ensino Fundamental II (6º ao 9º ano)
p_serie_slug IN ('6-ano-fundamental',...,'9-ano-fundamental')
  → r.etapas_modalidades ILIKE '%Ensino Fundamental%'

-- Ensino Médio
p_serie_slug IN ('1-ano-ensino-medio','2-ano-ensino-medio','3-ano-ensino-medio')
  → r.etapas_modalidades ILIKE '%Ensino M'||chr(233)||'dio%'
```

Nota: `chr(231)` = `ç`, `chr(233)` = `é`. Isso é necessário porque o PowerShell 5.1 corrompe UTF-8 em arquivos SQL.

---

## 5. Rotas da aplicação

| Rota | Tipo | Server/Client | Descrição |
|------|------|--------------|-----------|
| `/` | Redirect | Server | `redirect("/busca")` |
| `/busca` | Dinâmica | Server + Client | Tela principal de busca com filtros + mapa |
| `/escola/[slug]` | Dinâmica | Server + Client | Página individual da escola com preços |
| `/escolas/[uf]/[cidade]` | Dinâmica | Server | Página SEO com lista de escolas |
| `/contribuir` | Dinâmica | Client | Formulário de contribuição de preços |
| `/login` | Dinâmica | Client | Login |
| `/cadastro` | Dinâmica | Client | Cadastro em 2 etapas |
| `/recuperar-senha` | Dinâmica | Client | Recuperar senha |
| `/alterar-senha` | Dinâmica | Client | Alterar senha |
| `/perfil` | Dinâmica | Client | Perfil do usuário |
| `/sobre` | Static | Server | Página institucional (sem fetch) |
| `/sitemap.xml` | Dinâmico | Server | Sitemap XML com cidades + escolas |

### 5.1 Parâmetros de URL (`/busca`)

| Parâmetro | Descrição | Default | Exemplo |
|-----------|-----------|---------|---------|
| `uf` | Sigla do estado | — | `SP` |
| `cidade` | Nome da cidade | — | `São Paulo` |
| `q` | Termo de busca (nome da escola) | — | `colegio` |
| `serie` | Slug(s) da série (múltiplos separados por vírgula) | — | `1-ano-fundamental` |
| `privada` | Mostrar privadas (`1` ou `0`) | `1` | `0` |
| `publica` | Mostrar públicas (`1` ou `0`) | `1` | `0` |
| `maxPrice` | Preço máximo | — | `2000` |
| `lat` | Latitude (geolocalização) | — | `-23.5505` |
| `lon` | Longitude (geolocalização) | — | `-46.6333` |
| `map` | Modo mapa fullscreen (`1`) | — | `1` |

### 5.2 Slug de escola

Formato: `{codigo_inep}-{nome-slugified}`

Exemplo: `35017352-colegio-turma-do-bola`

**`makeEscolaSlug(codigoInep, nome)`** em `src/lib/utils.ts`:
- Normaliza NFD, remove acentos, lowercases, substitui não-alfanuméricos por `-`, remove hífens das bordas

**`parseEscolaSlug(slug)`** em `src/lib/utils.ts`:
- Extrai apenas o `codigo_inep` via regex `^(\d+)`

---

## 6. Componentes e sua responsabilidade

### 6.1 `src/components/caixa-busca-localizacao.tsx` (601 linhas)

**Responsabilidade:** Input de endereço com autocomplete multi-fonte.

**Funcionamento detalhado:**

1. Usuário digita no input
2. Debounce de 300ms
3. Se digitar ≥3 caracteres:
   a. Se parece CEP (formato `NNNNN-NNN`): busca na **BrasilAPI** (`https://brasilapi.com.br/api/cep/v2/{cep}`)
      - Retorna: logradouro, bairro, cidade, uf, lat/lon
   b. Se parece endereço (contém "rua", "av", "avenida", número): busca na **LocationIQ** (`autocomplete` endpoint)
      - Token: `NEXT_PUBLIC_LOCATIONIQ_TOKEN`
      - Limite: 5 resultados
      - País: Brasil
      - Idioma: pt-br
      - Retorna: logradouro, bairro, cidade, uf, lat/lon
   c. Senão: busca cidades no **Supabase** via RPC `buscar_cidades` (unaccent ILIKE)
      - Limite 8 resultados
      - Retorna: cidade, uf
   d. Também busca **estados localmente** (match no nome do estado ou sigla)

4. Dropdown de sugestões com:
   - Ícone por tipo (MapPin=cidade, Building=bairro, Home=logradouro, Hash=CEP)
   - Navegação por teclado (setas + enter + escape)
   - Clique fora fecha

5. Botão **"Perto de mim"**:
   - `navigator.geolocation.getCurrentPosition()`
   - Reverse geocode via LocationIQ (`reverse` endpoint)
   - Chama `onLocationChange` com lat/lon + cidade/uf

6. **Props:**
   - `onLocationChange(filtro: FiltroLocalizacao)` — callback quando local selecionado
   - `onSelectSugestao?(sugestao)` — callback adicional
   - `initialValue` — valor inicial
   - `className` — classes CSS extras
   - `iconOnlyGeo` — se true, esconde texto "Perto de mim" (mobile map mode)

7. **FiltroLocalizacao (type):**
   ```ts
   { buscaRaw: string; cep?: string; logradouro?: string; bairro?: string; cidade?: string; uf?: string; latitude?: number; longitude?: number }
   ```

### 6.2 `src/components/searchable-select.tsx` (354 linhas)

**Responsabilidade:** Select com autocomplete, bottom sheet (mobile) ou sidebar (desktop).

**Modos:**
- **Sheet (padrão):** bottom sheet em mobile (framer-motion, drag to dismiss), modal centralizado em desktop
- **Sidebar:** sidebar animada que entra pela esquerda (mobile não usa este modo)

**Funcionalidades:**
- Input de busca com filtro (normaliza acentos)
- Agrupamento por grupos (para séries de ensino)
- `isMultiple`: checkbox (múltiplos) ou radio (único)
- Opção "Todos" / "Todas as etapas"
- No mode sidebar: botões "Aplicar Filtros" e "Limpar" (draft state)
- No mode sheet: confirmação imediata

**Props:**
```ts
{ label: string; value: string; options?: string[]; series?: SerieItem[]; grupos?: string[]; onChange: (val: string) => void; placeholder?: string; disabled?: boolean; isMultiple?: boolean; position?: "sheet" | "sidebar" }
```

### 6.3 `src/components/mapa-escolas.tsx` (198 linhas)

**Responsabilidade:** Mapa Leaflet com lazy import.

**Funcionamento:**
1. Lazy import dinâmico: `import("leaflet")` + `import("leaflet/dist/leaflet.css")`
2. 5 layers de tile:
   - "Padrão": OpenStreetMap
   - "Satélite": Esri World Imagery
   - "Terreno": OpenTopoMap
   - "Claro": CARTO light
   - "Escuro": CARTO dark
3. Layer control no canto superior direito (colapsado)
4. Marcadores: `L.circleMarker` com:
   - Raio: 7 (normal) ou 10 (hovered)
   - Cor: `#a855f7` (privada) ou `#34d399` (pública)
   - Borda: `#222`, weight 1.5 (normal) ou 2.5 (hovered)
   - Opacidade: 0.85 (normal) ou 1 (hovered)
5. Tooltip permanente nos marcadores com preço (ex: "R$ 1.2k")
6. Popup ao clicar: nome, bairro, preços agrupados, link "Ver detalhes"
7. `syncMarkers()`:
   - Limpa todos os marcadores
   - Filtra por zoom (z≥14=9999, z≥12=50, z≥10=30, else 15)
   - Ordena: com preço primeiro
   - Atualiza bounds do mapa (`fitBounds` ou `setView` se 1 resultado)
8. Pulse animation na localização do usuário (círculo pulsante radial)
9. `onBoundsChange`: callback quando o mapa é movido (debounce via key hash)

**Props:**
```ts
{ escolas: Escola[]; userLocation?: { lat: number; lon: number } | null; hoveredId?: number | null; serieSlug?: string; mapCenter?: { lat: number; lon: number } | null; onBoundsChange?: (bounds: { minLat; minLon; maxLat; maxLon }) => void }
```

### 6.4 `src/components/tab-bar.tsx` (109 linhas)

**Responsabilidade:** Navegação principal.

**Desktop:** Sidebar fixa à esquerda (`w-16`, `fixed left-0 top-0 bottom-0`). Botões: Busca, Contribuir, Perfil. No final: Toggle tema, Mapa, Sobre, SHA do commit.

**Mobile:** Bottom tab bar (`sticky bottom-0`). Botões: Busca, Contribuir, Perfil, Sobre, Mapa + Tema.

**Escondida em:** rotas de auth (`/login`, `/cadastro`, `/recuperar-senha`, `/alterar-senha`).

**Botão Mapa:** alterna `?map=1` na URL de busca.

### 6.5 `src/components/toggle-tema.tsx` (26 linhas)

**Responsabilidade:** Toggle dark/light mode via `next-themes`.
- Botão: sol (dark→light) ou lua (light→dark)
- Espaço reservado de 36×36px enquanto não montado (evita layout shift)

### 6.6 `src/components/footer.tsx` (68 linhas)

**Responsabilidade:** Footer com diretório de cidades.

- Server Component assíncrono
- Busca `get_top_cidades` para 6 UFs prioritárias: SP, RJ, MG, RS, PR, BA
- Cache: 24h (usa `supabase-server.ts`)
- Falha silenciosa se Supabase estiver lento (build não pode quebrar)
- Layout grid: 2 colunas mobile, 6 desktop

---

## 7. Tema (claro/escuro)

### 7.1 Configuração

**Provider (`src/providers/theme-provider.tsx`):**
```tsx
<NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
```

**Regras:**
- Tema escuro é o **padrão**
- **Sem fallback para system preference** (`enableSystem={false}`)
- Usa `attribute="class"` — tema alterado pela classe `dark` no `<html>`
- Transição suave de 2s (definida no CSS)

### 7.2 Variáveis CSS (`src/app/globals.css`)

```css
@import "tailwindcss";

@theme {
  --color-primary: var(--color-accent-primary);
  --color-primary-hover: var(--color-accent-primary-hover);
  --color-purple: var(--color-accent-purple);
  --color-coral: var(--color-accent-coral);
  --color-success: var(--color-accent-success);
  --color-danger: var(--color-accent-danger);
  --color-surface: var(--color-surface);
  --color-surface-hover: var(--color-surface-hover);
  --color-border: var(--color-border);
  --color-border-hover: var(--color-border-hover);
  --color-text: var(--color-text);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-tertiary: var(--color-text-tertiary);
  --color-bg: var(--color-bg);
}
```

**Tema claro (`:root`):**
- bg: `#f0f4f9`
- surface: `#ffffff`
- surface-hover: `#e9eef6`
- border: `#e3e3e3`
- text: `#1f1f1f`
- text-secondary: `#474747`
- text-tertiary: `#757575`
- primary: `#1a73e8`
- purple: `#9333ea`
- coral: `#db2777`

**Tema escuro (`.dark`):**
- bg: `#131314`
- surface: `#1e1f20`
- surface-hover: `#282a2c`
- border: `#3c4043`
- text: `#e3e3e3`
- text-secondary: `#c4c7c5`
- text-tertiary: `#8e918f`
- primary: `#a8c7fa`
- purple: `#c084fc`
- coral: `#f472b6`

### 7.3 ⚠️ Regra CRÍTICA: Tailwind v4 + Turbopack bug

**`text-[var(--color-*)]`** em className causa injeção de RSC payload no CSS e quebra o build.

**NUNCA USE:**
```tsx
className="text-[var(--color-text)]"  // PROIBIDO
className="bg-[var(--color-surface)]" // PROIBIDO
className="shadow-[...]"              // EVITAR
```

**SEMPRE USE:**
```tsx
className="text-text"                 // CORRETO
className="bg-surface"               // CORRETO
className="border-border"            // CORRETO
className="shadow-sm"                // CORRETO
```

**Sintomas do bug:**
```
Parsing CSS source code failed + self.__next_f.push
```

**Solução:** Remover todos os `text-[var(--color-*)]` do código e garantir que `@theme` use variáveis CSS corretamente.

**Impacto:** `npm run dev` (Turbopack) frequentemente falha. **Para testar localmente:** use `npm run build && npm run start`.

---

## 8. Autenticação

### 8.1 Stack

Supabase Auth (email/senha). Sem OAuth, sem magic link.

### 8.2 Fluxo

1. **Cadastro** (`/cadastro`): 2 etapas
   - Etapa 1: email + senha → `supabase.auth.signUp()`
   - Etapa 2 (opcional): endereço → `supabase.from("profiles").upsert()`
   - Geocode do endereço via Nominatim (`https://nominatim.openstreetmap.org/search`)

2. **Login** (`/login`): `supabase.auth.signInWithPassword()`

3. **Recuperar senha** (`/recuperar-senha`): `supabase.auth.resetPasswordForEmail()` com redirect para `/alterar-senha`

4. **Alterar senha** (`/alterar-senha`): `supabase.auth.updateUser()`

5. **Logout**: `supabase.auth.signOut()`

### 8.3 Middleware (`src/middleware.ts`)

- `createServerClient` do `@supabase/ssr` com manipulação de cookies
- Se usuário logado acessa `/login`, `/cadastro` ou `/recuperar-senha`: redirect para `/busca`
- Matcher: todas as rotas exceto `_next/static`, `_next/image`, `favicon.ico`

### 8.4 Auth Context (`src/lib/auth-context.tsx`)

- `createContext<{ user: User | null; loading: boolean }>`
- `AuthProvider`: useEffect com `supabase.auth.getUser()` + `onAuthStateChange`
- Hook: `useAuth()`

### 8.5 RLS e segurança

- `mensalidades_series`: INSERT apenas authenticated, SELECT público
- `profiles`: cada usuário vê apenas seu próprio perfil
- Trigger `on_auth_user_created`: cria profile automaticamente no signup
- `excluir_minha_conta()`: função SECURITY DEFINER que anonimiza mensalidades e deleta auth.users

---

## 9. SEO e metadados

### 9.1 `generateMetadata`

Implementado em:
- `/busca` (page.tsx): título dinâmico baseado em uf, cidade, query e série
- `/escola/[slug]` (page.tsx): título com nome da escola + JSON-LD
- `/escolas/[uf]/[cidade]` (page.tsx): título com nome da cidade + contagem de escolas

### 9.2 JSON-LD

Na página da escola (`/escola/[slug]/page.tsx`):
```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "...",
  "address": { "@type": "PostalAddress", ... },
  "containsPlace": {
    "@type": "Product",
    "offers": { "@type": "AggregateOffer", "priceCurrency": "BRL" }
  }
}
```

### 9.3 Sitemap (`/sitemap.ts`)

Gera até ~49k URLs:
1. URLs fixas: `/`, `/busca`
2. URLs de cidade: `/escolas/{uf}/{cidade-slug}` — até 49.000
3. URLs de escola: `/escola/{inep}-{slug}` — até 1.000 (limitado por performance)

Usa `createServerClient()` (sem cache) para evitar stale data no sitemap.

---

## 10. Comandos e scripts

### 10.1 Comandos npm

| Comando | Descrição | Notas |
|---------|-----------|-------|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) | **Pode falhar** — ver bug do Tailwind v4 |
| `npm run build` | Build de produção | Usar para testar localmente |
| `npm run start` | Servidor de produção | Após build |
| `npm run lint` | `next lint` | Verifica código |
| `npm run import` | Importa CSV de escolas | Usa `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` |
| `npm run migrate [file]` | Executa migration SQL | Usa `pg` direto (IPv6 workaround) |

### 10.2 Script de importação (`scripts/import-csv.js`)

```bash
npm run import
```

- Lê `Análise - Tabela da lista das escolas - Detalhado.csv`
- Parseia com `csv-parse`
- Batch de 200 registros
- Upsert na tabela `escolas` (na época era escolas, hoje seria `escolas_raw`)
- Conflito resolvido por `codigo_inep`
- Gera `geom` (Point) a partir de lat/lng
- Extrai bairro do endereço via regex

### 10.3 Script de migration (`scripts/run-migration.js`)

```bash
npm run migrate 006_normalizacao_estado_cidade.sql
```

- Resolve DNS via Google DNS (`8.8.8.8`) — **necessário porque IPv6 não funciona**
- Conecta via `pg` Pool com SSL
- Lê arquivo SQL de `supabase/migrations/` e executa statement por statement
- Variáveis de ambiente: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

## 11. Migrations

Arquivos em `supabase/migrations/`. **Ordem importa.**

| Arquivo | Conteúdo |
|---------|----------|
| `001_create_tables.sql` | Extensões (postgis, pg_trgm), tabela `escolas`, tabela `mensalidades`, índices, RLS básico, trigger updated_at |
| `002_excluir_conta.sql` | Coluna user_id em mensalidades, função `excluir_minha_conta()` (LGPD), ajuste de RLS |
| `003_profiles_e_geo.sql` | Tabela `profiles`, trigger `on_auth_user_created`, RLS de profiles, função `escolas_perto_de_mim()` |
| `004_mensalidades_series.sql` | Tabela `mensalidades_series` (substitui mensalidades legacy), RLS, unique constraint |
| `006_normalizacao_estado_cidade.sql` | Tabelas `tb_estados` e `tb_cidades`, refactor: renomeia `escolas` → `escolas_raw`, adiciona `cidade_id`, cria VIEW `escolas`, recria RPCs |
| `007_filtrar_escolas_paralisadas.sql` | Filtra escolas com `restricao_atendimento = 'ESCOLA PARALISADA'` em todas as RPCs |

**Observação:** Não há migration 005 (pulado).

---

## 12. Deploy (Vercel)

- **Deploy automático** via GitHub (branch main)
- **Variáveis de ambiente necessárias:**
  - `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Chave anônima (pública)
  - `NEXT_PUBLIC_LOCATIONIQ_TOKEN` — Token da API LocationIQ (autocomplete de endereço)
- **Build pode falhar** se Server Component timeoutar — timeout 10s no `supabase-server.ts` evita isso
- **Commit SHA** aparece no canto inferior da sidebar (via `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`)

---

## 13. Problemas conhecidos e workarounds

### 13.1 Turbopack + Tailwind v4 (CRÍTICO)

Conforme seção 7.3. `npm run dev` frequentemente falha. **Sempre testar com `npm run build && npm run start`.**

### 13.2 Windows PowerShell 5.1 + UTF-8

PowerShell 5.1 corrompe UTF-8 ao escrever arquivos. Workarounds:
- **Em JSX:** usar `{'\u00e7'}` (escape unicode) em vez de caracteres literais como `ç`
- **Em SQL:** usar `chr(231)` para `ç`, `chr(233)` para `é`
- **Em strings JS:** usar `String.fromCodePoint(n)` para emojis e caracteres especiais
- **Exemplos:**
  - `"P{'\u00fa'}blicas"` → "Públicas"
  - `"Pre{'\u00e7'}os"` → "Preços"
  - `"Informa{'\u00e7'}{'\u00e3'}o"` → "Informação"

### 13.3 IPv6

Conexão PostgreSQL direta (`pg`) não funciona desta rede porque o host `db.ijfwdtemkkoiombxtyip.supabase.co` só tem registro IPv6 e a rede local não roteia IPv6. O script `run-migration.js` contorna isso resolvendo o DNS explicitamente via Google DNS (`8.8.8.8`).

### 13.4 Plano Free Supabase

- 500MB de banco (escolas_raw já ocupa ~200MB com ~212k registros)
- Conexões limitadas
- CPU compartilhado
- Queries lentas (>5s) podem timeoutar
- **Cache via `next: { revalidate: 86400 }` é essencial** para rotas públicas

### 13.5 `Remove-Item -Recurse -Force .next`

Pode falhar com `EPERM`/`EBUSY` no Windows. Executar de novo que resolve.

---

## 14. Especificações detalhadas de componentes

### 14.1 `Series` (`src/lib/series.ts`)

Catálogo de séries de ensino:

```ts
export type Serie = { slug: string; nome: string; grupo: string };
```

**Grupos e séries:**

| Grupo | Slugs |
|-------|-------|
| Educação Infantil | `baba`, `maternal-1`, `maternal-2`, `maternal-3`, `pre-1`, `pre-2`, `pre-3` |
| Ensino Fundamental I | `1-ano-fundamental` a `5-ano-fundamental` |
| Ensino Fundamental II | `6-ano-fundamental` a `9-ano-fundamental` |
| Ensino Médio | `1-ano-ensino-medio` a `3-ano-ensino-medio` |

**Funções:**
- `getSerieBySlug(slug)` → `Serie | undefined`

### 14.2 `utils` (`src/lib/utils.ts`)

```ts
slugify(text)           // "Colégio Turma do Bola" → "colegio-turma-do-bola"
makeEscolaSlug(codInep, nome) // "35017352-colegio-turma-do-bola"
parseEscolaSlug(slug)   // → { codigoInep: "35017352" }
slugToCidade(slug)      // "sao-paulo" → "São Paulo" (capitaliza com exceções)
```

**`slugToCidade`** respeita palavras minúsculas: "do", "dos", "da", "das", "de", "e", "em", "no", "na", "nos", "nas".

### 14.3 `EscolaResult` type (`src/app/busca/busca-results.tsx`)

```ts
type EscolaResult = {
  id: number;
  nome: string;
  uf: string;
  municipio: string;
  bairro: string | null;
  dependencia_administrativa: string;
  latitude: number | null;
  longitude: number | null;
  codigo_inep: string;
  series_precos: SeriePreco[];       // preços agregados
  distancia_km?: number;
  etapas_modalidades?: string | null;
};

type SeriePreco = {
  serie_slug: string;
  serie_nome: string;
  valor_mensalidade: number | null;
  valor_matricula: number | null;
  valor_material: number | null;
  qtd: number;  // número de contribuições
};
```

### 14.4 `SearchableSelect` — comportamento detalhado

**Modo sheet (padrão):**
- Mobile: bottom sheet que cobre 90dvh, drag para fechar (framer-motion)
- Desktop: modal centralizado (max-w-lg)
- Input de busca com filtro
- Seleção é imediata (onChange chamado na hora)
- Múltiplo: checkbox. Único: radio.

**Modo sidebar:**
- Sidebar fixa à esquerda (desktop only, `left-16`)
- Botões "Aplicar Filtros" e "Limpar" (draft state)
- Seleção é em draft até aplicar

### 14.5 `CaixaBuscaLocalizacao` — comportamento detalhado

**Fontes de dados (em ordem de prioridade):**
1. **CEP** (se input corresponde a `NNNNN-NNN`): BrasilAPI
2. **LocationIQ autocomplete** (se parece endereço): API externa
3. **Supabase RPC `buscar_cidades`** (fallback): busca cidades
4. **Match local de estados**: match por nome do estado ou sigla

**LocationIQ:**
- Autocomplete: `https://api.locationiq.com/v1/autocomplete?key={token}&q={query}&limit=5&countrycodes=br&accept-language=pt-br`
- Reverse: `https://api.locationiq.com/v1/reverse?key={token}&lat={lat}&lon={lon}&format=json&accept-language=pt-br`

**BrasilAPI:**
- CEP: `https://brasilapi.com.br/api/cep/v2/{cep}`

### 14.6 `BuscaContent` — estado e comportamento

**Estado gerenciado via URL params (useSearchParams + router.replace):**
- `uf`, `cidade`, `q`, `serie`, `privada`, `publica`, `maxPrice`, `lat`, `lon`, `map`

**Busca de escola por nome (autocomplete):**
```ts
supabase.from("escolas")
  .select("id, nome, municipio, uf, codigo_inep")
  .ilike("nome", `%${query}%`)
  .order("nome")
  .limit(6)
```

**Filtro de etapa (client-side) — `dadosExibir` (useMemo):**
```ts
// slug "1-ano-fundamental" → grupo "Ensino Fundamental I"
// → busca "ensino fundamental" na coluna etapas_modalidades
const slugToGrupo = new Map(SERIES.map(s => [s.slug, s.grupo]));
const gruposSelecionados = slugs.map(s => slugToGrupo.get(s));
filtrado = filtrado.filter(e => {
  if (!e.etapas_modalidades) return false;
  const etapas = e.etapas_modalidades.toLowerCase();
  return gruposSelecionados.some(g => {
    if (g.startsWith("ensino fundamental")) return etapas.includes("ensino fundamental");
    if (g.startsWith("educação infantil")) return etapas.includes("educação infantil");
    if (g.startsWith("ensino médio")) return etapas.includes("ensino médio");
    return etapas.includes(g);
  });
});
```

**Ordenação (`sortResults`):**
1. Calcula distância via haversine (se userLocation disponível)
2. Ordena por distância crescente

### 14.7 `BuscaResults` — cards de escola

**Estrutura do card:**
- Indicador lateral: 5px roxo (privada) ou verde (pública)
- Nome da escola (h2)
- Distância (se disponível): "350m" ou "1.2 km"
- Preços:
  - Se série específica: mostra preço da série
  - Se todas: mostra min-max por grupo com qtd de contribuições
  - Pública sem preço: "Gratuito"
  - Privada sem preço: "Sem mensalidades ainda"
- Botões (apenas privadas):
  - "Contribuir" → `/contribuir?escola={inep}`
  - "Convidar" → WhatsApp share (texto personalizado)
- Hover: destaca no mapa (via `hoveredId`)

### 14.8 `MapaEscolas` — detalhes de renderização

**Marcadores com preço (tooltip):**
```ts
if (preco) {
  m.bindTooltip(`<span style="color:var(--color-price-text);font-weight:700;font-size:11px">${preco}</span>`, {
    permanent: true, direction: "top", className: "price-tip"
  });
  m.on("popupopen", () => { m.closeTooltip(); });
  m.on("popupclose", () => { m.bindTooltip(...); });
}
```

**Popup ao clicar:**
- Nome da escola (negrito)
- Bairro
- Preços por grupo (Educação Infantil, Fundamental I/II, Médio) com min-max
- Link "Ver detalhes" → `/escola/{slug}` (target _blank)

**Pulse animation:**
```ts
let r = 14;
const int = setInterval(() => {
  r += 0.5;
  pulse.setRadius(r);
  pulse.setStyle({ fillOpacity: Math.max(0, 0.25 - (r - 14) * 0.02) });
  if (r > 30) r = 14;
}, 40);
```

---

## 15. Especificações detalhadas de páginas

### 15.1 Página da escola (`/escola/[slug]`)

**Server Component (`page.tsx`):**
1. Parseia slug → codigo_inep
2. Busca escola: `supabase.from("escolas").select("...").eq("codigo_inep", codigoInep).single()`
   - Seleciona: id, nome, uf, municipio, bairro, endereco, telefone, dependencia_administrativa, categoria_administrativa, categoria_escola_privada, localizacao, localidade_diferenciada, porte_escola, etapas_modalidades, outras_ofertas, conveniada_poder_publico, regulamentacao_conselho, latitude, longitude, restricao_atendimento, codigo_inep
3. Busca estatísticas: `get_estatisticas_escola(p_escola_id)`
4. Retorna 404 se não encontrada
5. Gera JSON-LD (Schema.org EducationalOrganization + AggregateOffer)
6. Renderiza `<EscolaDetalhe>`

**Client Component (`escola-detalhe.tsx`):**
- Botão "Voltar" (router.back())
- Nome + localização
- Se privada:
  - Tabela de preços por série (grupos agrupados)
  - Colunas: Série, Qtd, Mín, Média, Máx
  - Se sem preços: "Seja o primeiro a contribuir" + "Convidar" (WhatsApp)
- Se pública: "Escola pública gratuita"
- Informações da escola em grid 2 colunas
- Mapa embutido (iframe OpenStreetMap)
- Componente WhatsAppShare para campanha de compartilhamento

### 15.2 Listagem SEO (`/escolas/[uf]/[cidade]`)

**Server Component apenas (sem Client Component):**
1. Fetch `get_cidades(uf)` para descobrir nome real da cidade a partir do slug
2. Match por slugify (tenta match exato, depois match por primeira palavra)
3. Fetch escolas: `supabase.from("escolas").select("...").eq("uf", uf).eq("municipio", cidade).order("nome")`
4. 3 páginas paralelas de 1000 escolas cada (range 0-999, 1000-1999, 2000-2999)
5. Renderiza lista de links para cada escola

### 15.3 Contribuir (`/contribuir`)

**Client Component, requer autenticação:**
1. Se não logado: mostra mensagem de anonimato + botões "Entrar" / "Criar conta"
2. Input de busca de escola (autocomplete): `supabase.from("escolas").select("id, nome, bairro, municipio, uf").ilike("nome", "%query%").limit(8)`
3. Select de série (agrupado por GRUPOS)
4. Inputs: mensalidade, matrícula, material (R$)
5. Submit: `supabase.from("mensalidades_series").insert({...})`
   - `ano_vigencia`: ano atual se mês < julho, senão ano atual + 1
6. Confirmação: "Obrigado! Sua contribuição foi salva de forma anônima."

### 15.4 Cadastro (`/cadastro`)

**2 etapas:**
1. Credenciais: email + senha + confirmar senha → `supabase.auth.signUp()`
2. Endereço (opcional): CEP (com busca ViaCEP), logradouro, número, bairro, cidade, UF
   - Geocode via Nominatim para lat/lon
   - `supabase.from("profiles").upsert()`
   - Pode pular

### 15.5 Perfil (`/perfil`)

**Client Component:**
- Mostra email do usuário
- Link para alterar senha
- Botão "Sair"
- Seção "Excluir conta" com confirmação em 2 etapas
- Exclusão: `supabase.rpc("excluir_minha_conta")` + signOut

### 15.6 Página Sobre (`/sobre`)

**Server Component estático (sem fetch):**
- Texto institucional sobre o projeto
- Usa `String.fromCodePoint(n)` para caracteres especiais (ex: `String.fromCodePoint(0x00E9)` = "é")
- Links para contribuir

---

## 16. Segurança

### 16.1 RLS Policies

| Tabela | Operação | Policy | Público? |
|--------|----------|--------|----------|
| `escolas_raw` | SELECT | `true` (público) | ✅ |
| `mensalidades_series` | SELECT | `true` (público) | ✅ |
| `mensalidades_series` | INSERT | `auth.role() = 'authenticated'` | ❌ |
| `profiles` | SELECT | `auth.uid() = id` | ❌ (próprio) |
| `profiles` | INSERT | `auth.uid() = id` OU trigger | Parcial |
| `profiles` | UPDATE | `auth.uid() = id` | ❌ (próprio) |

### 16.2 VIEW `escolas`

Usa `security_invoker = true` — herda RLS da tabela base.

### 16.3 Exclusão de conta (LGPD)

`excluir_minha_conta()`:
1. Verifica se usuário está autenticado (`auth.uid() IS NULL` → exception)
2. Anonimiza mensalidades: `UPDATE mensalidades SET user_id = NULL WHERE user_id = uid`
3. Deleta `auth.users` (cascade deleta identidades, sessions, profiles)

### 16.4 Anonimato

- `user_id` em `mensalidades_series` é NULL se contribuidor não logado
- `user_id` em `mensalidades_series` nunca é exposto em consultas públicas (SELECT só retorna escola_id + preços agregados)
- Profiles nunca são expostos publicamente (RLS restrito ao próprio usuário)

---

## Nota final para IAs

Se você está lendo este documento como uma IA que vai trabalhar neste projeto:

1. **Leia todo o documento** antes de qualquer ação
2. Siga as regras de **Tailwind v4** (nunca use `text-[var(--color-*)]`)
3. Use `chr(231)` para `ç` e `chr(233)` para `é` em SQL
4. Use `{'\u00e7'}` para acentos em JSX/TypeScript
5. **Sempre execute `npm run build && npm run start` para testar** (nunca `npm run dev`)
6. Para alterações no banco: use MCP (`execute_sql`) para iterar, depois crie migration
7. Cache de 24h é essencial para queries públicas devido ao plano Free
8. Nunca quebre o build — timeout de 10s no supabase-server.ts e fail silencioso no footer
