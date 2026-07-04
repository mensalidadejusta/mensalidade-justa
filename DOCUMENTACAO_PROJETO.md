# Documentação Completa — Mensalidade Justa

App colaborativo para buscar escolas e consultar mensalidades no Brasil.
Usuários pesquisam escolas por nome/local, filtram por série/tipo/preço, veem preços no mapa, e contribuem com valores anonimamente.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript 6 |
| Estilos | Tailwind CSS v4, CSS Modules |
| Ícones | lucide-react |
| Animação | framer-motion (bottom sheets) |
| Banco | Supabase (PostgreSQL 15 + PostGIS) |
| Mapas | Leaflet + react-leaflet |
| Auth | Supabase Auth (email/senha) |

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── page.tsx                       # Redireciona / → /busca
│   ├── layout.tsx                     # Root layout: AuthProvider + Footer + TabBar
│   ├── globals.css                    # Tailwind v4 + variáveis CSS + tema dark
│   ├── sitemap.ts                     # Sitemap dinâmico
│   ├── busca/                         # Tela principal de busca
│   │   ├── page.tsx                   # Server Component: fetch dados, filtra, SEO
│   │   ├── busca-content.tsx          # Client: toda interatividade, filtros, mapa
│   │   └── busca-results.tsx          # Cards de resultado de escola
│   ├── escola/[slug]/
│   │   ├── page.tsx                   # Server Component: fetch escola + JSON-LD
│   │   └── escola-detalhe.tsx         # Client: detalhes da escola, preços
│   ├── escolas/[uf]/[cidade]/
│   │   └── page.tsx                   # Server Component: lista SEO de escolas
│   ├── contribuir/
│   │   └── page.tsx                   # Formulário de contribuição de preços
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── cadastro/page.tsx          # 2 etapas: credenciais + endereço
│   │   ├── recuperar-senha/page.tsx
│   │   └── alterar-senha/page.tsx
│   ├── perfil/page.tsx               # Perfil do usuário logado
│   └── sobre/page.tsx                 # Sobre o projeto
├── components/
│   ├── footer.tsx                     # Footer com diretório de cidades
│   ├── tab-bar.tsx                    # Nav bar (sidebar desktop + bottom mobile)
│   ├── toggle-tema.tsx                # Dark/light mode toggle
│   ├── mapa-escolas.tsx               # Mapa Leaflet com marcadores
│   └── searchable-select.tsx          # Select com autocomplete + bottom sheet
├── lib/
│   ├── supabase.ts                    # Cliente Supabase (browser + SSR básico)
│   ├── supabase-server.ts             # Cliente SSR com cache 24h + timeout 10s
│   ├── utils.ts                       # slugify, makeEscolaSlug, parseEscolaSlug
│   ├── series.ts                      # Catálogo de séries/etapas de ensino
│   └── auth-context.tsx               # Contexto de autenticação
├── middleware.ts                      # @supabase/ssr middleware + redirects
└── components/
    └── mapa-escolas.tsx               # Mapa Leaflet
```

---

## Rotas (App Router)

| Rota | Tipo | Descrição |
|------|------|-----------|
| `/` | Redirect | → `/busca` |
| `/busca` | Server + Client | Tela principal de busca com filtros + mapa |
| `/escola/[slug]` | Server + Client | Página individual da escola com preços |
| `/escolas/[uf]/[cidade]` | Server | Página SEO com lista de escolas (paginação 8×1000) |
| `/contribuir` | Client | Formulário de contribuição de preços |
| `/login` | Client | Login |
| `/cadastro` | Client | Cadastro em 2 etapas |
| `/recuperar-senha` | Client | Recuperar senha |
| `/alterar-senha` | Client | Alterar senha |
| `/perfil` | Client | Perfil do usuário |
| `/sobre` | Static | Sobre o projeto |
| `/sitemap.xml` | Dinâmico | Sitemap com cidades + até 1000 escolas |

---

## Banco de Dados — Estrutura Atual

### `escolas_raw` (212.386 linhas)
VIEW pública: `escolas` (compatibilidade — junta escolas_raw + tb_cidades + tb_estados)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INTEGER PK | auto increment |
| `codigo_inep` | VARCHAR UNIQUE | Código INEP do MEC |
| `nome` | VARCHAR | Nome da escola |
| `cidade_id` | UUID FK → tb_cidades | Referência normalizada |
| `bairro` | VARCHAR NULL | Bairro |
| `endereco` | TEXT NULL | Endereço completo |
| `telefone` | VARCHAR NULL | Telefone |
| `dependencia_administrativa` | VARCHAR | "Privada" ou "Pública" (Estadual/Municipal/Federal) |
| `categoria_administrativa` | VARCHAR NULL | Categoria administrativa |
| `categoria_escola_privada` | VARCHAR NULL | Subtipo se privada |
| `localizacao` | VARCHAR NULL | Localização (urbana/rural) |
| `localidade_diferenciada` | VARCHAR NULL | Indígena, quilombola, etc |
| `porte_escola` | VARCHAR NULL | Porte |
| `etapas_modalidades` | TEXT NULL | Etapas oferecidas (string search) |
| `outras_ofertas` | TEXT NULL | EJA, profissionalizante, etc |
| `conveniada_poder_publico` | VARCHAR NULL | Se conveniada |
| `regulamentacao_conselho` | VARCHAR NULL | Regulamentação |
| `latitude` | NUMERIC NULL | Latitude |
| `longitude` | NUMERIC NULL | Longitude |
| `restricao_atendimento` | VARCHAR NULL | Restrições |
| `geom` | GEOMETRY(Point, 4326) | PostGIS geometry |
| `created_at` | TIMESTAMPTZ | now() |
| `updated_at` | TIMESTAMPTZ | now() |

### `tb_estados` (27 linhas)

| Coluna | Tipo |
|--------|------|
| `id` | UUID PK |
| `nome` | VARCHAR |
| `uf` | VARCHAR(2) UNIQUE |
| `created_at` | TIMESTAMPTZ |

### `tb_cidades` (5.570 linhas)

| Coluna | Tipo |
|--------|------|
| `id` | UUID PK |
| `estado_id` | UUID FK → tb_estados |
| `nome` | VARCHAR |
| UNIQUE | (estado_id, nome) |

### `mensalidades_series` (99+ linhas)

| Coluna | Tipo |
|--------|------|
| `id` | UUID PK |
| `escola_id` | INTEGER FK → escolas_raw |
| `serie_slug` | VARCHAR |
| `serie_nome` | VARCHAR |
| `valor_mensalidade` | NUMERIC NULL |
| `valor_matricula` | NUMERIC NULL |
| `valor_material` | NUMERIC NULL |
| `ano_vigencia` | INTEGER |
| `user_id` | UUID NULL (auth.users) |
| UNIQUE | (escola_id, serie_slug, ano_vigencia) |

RLS: SELECT público, INSERT authenticated.

### `profiles` (2+ linhas — vinculada a auth.users via trigger)

| Coluna | Tipo |
|--------|------|
| `id` | UUID PK FK → auth.users |
| `logradouro, numero, bairro, cidade, uf, cep` | TEXT/VARCHAR |
| `latitude, longitude` | FLOAT |
| `geom` | GEOMETRY |

### VIEW `escolas` — compatibilidade

Junta `escolas_raw` + `tb_cidades` + `tb_estados`. Expõe `uf` e `municipio` como strings (mesmo nome da tabela original). `security_invoker = true`.

### RPCs

| Nome | Params | Retorno | Descrição |
|------|--------|---------|-----------|
| `get_ufs()` | — | `TABLE(uf VARCHAR)` | Lista UFs de tb_estados |
| `get_cidades(p_uf)` | VARCHAR | `TABLE(municipio VARCHAR)` | Cidades de um estado |
| `get_top_cidades(p_uf, p_limit)` | VARCHAR, INT | `TABLE(municipio VARCHAR, total BIGINT)` | Top N cidades por qtd de escolas |
| `buscar_escolas_com_precos_detalhado(p_uf, p_municipio, p_serie_slug, p_termo)` | 4 VARCHAR | `TABLE(id, nome, uf, municipio, bairro, dependencia..., latitude, longitude, codigo_inep, series_precos JSON)` | Escolas com preços agregados, usada na busca principal |
| `get_estatisticas_escola(p_escola_id)` | INT | estatísticas por série | Médias/min/max de mensalidade/matrícula/material |
| `excluir_minha_conta()` | — | void | Exclui conta do usuário logado |

### Índices

| Índice | Colunas |
|--------|---------|
| `escolas_pkey` | id |
| `escolas_codigo_inep_key` | codigo_inep (UNIQUE) |
| `idx_escolas_nome` | nome (GIN trgm) |
| `idx_escolas_uf` | uf (legado — na raw table) |
| `idx_escolas_municipio` | municipio (legado) |
| `idx_escolas_dependencia` | dependencia_administrativa |
| `idx_escolas_geom` | geom (GIST) |
| `idx_escolas_lat_lng` | latitude, longitude |
| `idx_escolas_raw_cidade_id` | cidade_id |
| `idx_tb_estados_uf` | uf (UNIQUE) |
| `idx_tb_cidades_estado_id_nome` | estado_id, nome (UNIQUE composto) |
| `idx_mensalidades_series_escola` | escola_id, serie_slug |

---

## Fluxo da Busca (Tela Principal)

```
1. Usuário acessa /busca
2. Server Component (page.tsx):
   - Lê searchParams (uf, cidade, q, serie, privada, publica, maxPrice)
   - Chama get_ufs() + get_cidades() (se uf definida)
   - Chama buscar_escolas_com_precos_detalhado() (se uf+cidade definidas)
   - Filtra localmente (público/privado, preço máximo)
   - Passa para BuscaContent (Client Component)

3. BuscaContent (Client):
   - Gerencia estado via URL (useSearchParams + router.replace)
   - Autocomplete com debounce 500ms: supabase.from("escolas").select("id,nome,municipio,uf,codigo_inep").ilike("nome", "%query%").limit(6)
   - Geolocalização: navigator.geolocation + Nominatim reverse geocode
   - Ordenação: quem tem preço primeiro, depois por distância
   - Layout: mobile (stacked) | desktop (painel 55% + mapa 45%)

4. BuscaResults:
   - Renderiza <article> com <h2> semântico
   - Card com: indicador colorido (verde=pública, roxo=privada), nome, endereço, badge privada/pública
   - Preços agrupados por etapa (Educação Infantil, Fundamental I/II, Médio)
   - Botões "Contribuir" e "Convidar" (WhatsApp) apenas para privadas
   - Hover sincroniza com marcador no mapa

5. Mapa:
   - Leaflet com marcadores para cada escola
   - Marcador destacado no hover
   - Botão "Perto de Mim": geolocation + busca
```

### Parâmetros de URL (/busca?uf=SP&cidade=São%20Paulo&privada=1&publica=1&serie=1-ano-fundamental&maxPrice=2000)

| Parâmetro | Descrição | Default |
|-----------|-----------|---------|
| `uf` | Sigla do estado | — |
| `cidade` | Nome da cidade | — |
| `q` | Termo de busca (nome) | — |
| `serie` | Slug da série | — |
| `privada` | "0" para ocultar privadas | "1" |
| `publica` | "0" para ocultar públicas | "1" |
| `maxPrice` | Preço máximo | — |

---

## Séries/Etapas de Ensino

Definidas em `src/lib/series.ts`. 4 grupos com slugs padronizados:

| Grupo | Séries |
|-------|--------|
| Educação Infantil | baba, maternal-1/2/3, pre-1/2/3 |
| Ensino Fundamental I | 1-ano-fundamental até 5-ano-fundamental |
| Ensino Fundamental II | 6-ano-fundamental até 9-ano-fundamental |
| Ensino Médio | 1-ano-ensino-medio até 3-ano-ensino-medio |

Slugs são usados em: filtro de etapa, RPC `buscar_escolas_com_precos_detalhado`, e na tabela `mensalidades_series.serie_slug`.

---

## Contribuição de Preços

Rota `/contribuir`:
1. Usuário busca escola por nome (autocomplete)
2. Seleciona escola
3. Preenche: série, valor mensalidade, matrícula, material
4. INSERT em `mensalidades_series` (authenticated)
5. Se não logado, redireciona para login

---

## Autenticação

- Supabase Auth (email/senha)
- `src/lib/auth-context.tsx`: Provider com getUser + onAuthStateChange
- `src/middleware.ts`: refresh session, redireciona auth routes de logados para /busca
- Tabela `profiles` criada via trigger `on_auth_user_created`
- Cadastro em 2 etapas: (1) credenciais → (2) endereço opcional

---

## Tema

- Dark mode fixo (classe `dark` no `<html>`)
- `src/components/toggle-tema.tsx`: usa localStorage + prefers-color-scheme
- Variáveis CSS em `globals.css`: `--color-bg`, `--color-surface`, `--color-text`, etc.

---

## Layout

- `src/app/layout.tsx`: RootLayout com `<AuthProvider>`, `<Footer>`, `<TabBar>`
- `body` tem `md:pl-16` para a sidebar do desktop
- `<TabBar>`: sidebar (desktop, `position: fixed`, `left-0`) + bottom tab bar (mobile, `sticky bottom-0`)
- `<Footer>`: diretório de cidades (11 UFs principais, sequencial, cache 24h), links "Sobre" e "Contato"

---

## Supabase Client

### `src/lib/supabase.ts`
- `createClient()`: browser (`@supabase/ssr` createBrowserClient)
- `createServerClient()`: SSR sem cache

### `src/lib/supabase-server.ts`
- `createServerClient()`: SSR com `next: { revalidate: 86400 }` (cache 24h) + `AbortController` timeout 10s
- Usado em Server Components (`page.tsx`)

---

## Migrations

Arquivos em `supabase/migrations/` (ordem importa):

| Arquivo | Conteúdo |
|---------|----------|
| `001_create_tables.sql` | Tabela escolas, índices, RLS, extensões PostGIS + pg_trgm |
| `002_excluir_conta.sql` | Função excluir_minha_conta |
| `003_profiles_e_geo.sql` | Tabela profiles, trigger on_auth_user_created |
| `004_mensalidades_series.sql` | Tabela mensalidades_series, RLS |
| `006_normalizacao_estado_cidade.sql` | tb_estados, tb_cidades, refactor escolas_raw + VIEW |

Execução: `npm run migrate [nome_arquivo]` (usa `pg` direto com DNS resolution workaround).
Migration 001 também recria tudo do zero (script de bootstrap).

---

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Next.js de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | `next lint` |
| `npm run import` | Importa CSV para escolas via Supabase REST API |
| `npm run migrate` | Executa migration SQL via pg direto |

---

## Variáveis de Ambiente (.env)

```
SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
SUPABASE_SERVICE_KEY=svc_role_key
NEXT_PUBLIC_SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key
SUPABASE_MGMT_TOKEN=sbp_...
```

---

## SEO

- `generateMetadata` dinâmico em `/busca` e `/escola/[slug]`
- JSON-LD (Schema.org EducationalOrganization + AggregateOffer) na página da escola
- Sitemap XML em `/sitemap.xml` com:
  - URLs de cidade: `/escolas/{uf}/{cidade}` (páginas de listagem SEO)
  - Até 1000 URLs de escola: `/escola/{codigo_inep}-{nome-slugified}`
- Páginas cidade: `/escolas/[uf]/[cidade]` com lista paginada (8 páginas de 1000 escolas cada)

---

## Observações Técnicas Importantes

1. **Encoding no Windows**: PowerShell 5.1 corrompe UTF-8. Usar `String.fromCodePoint(n)` para emojis, `{'\u00e7'}` para acentos em JSX, `chr(n)` do PostgreSQL em SQL.

2. **IPv6**: Conexão PostgreSQL direta não funciona desta rede (host só tem IPv6, rede não roteia). Usar REST API via supabase-js ou script `run-migration.js` com DNS resolution via Google DNS.

3. **Tailwind v4**: `@import "tailwindcss"` no CSS, `@custom-variant dark`, `@theme` para custom colors. `@tailwindcss/postcss` em dependencies.

4. **Plano Free Supabase**: 500MB banco, conexões limitadas, CPU compartilhado. Queries lentas (>5s) podem timeoutar. Cache via `next: { revalidate: 86400 }` é essencial.

5. **Vercel**: Deploy automático via GitHub (branch main). Build precisa de `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Build falha se Server Component timeoutar — timeout 10s no supabase-server.ts evita isso.
