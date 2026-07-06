# Documentação de Reprodução Completa — Mensalidade Justa

> **Aviso para IAs:** Este documento contém cada detalhe necessário para reproduzir o projeto
> do zero. Leia do início ao fim antes de qualquer ação. Cada arquivo, função, tipo, decisão,
> configuração e migration está documentado em nível de implementação.

---

## Índice

1. [Propósito e Visão Geral](#1-propósito-e-visão-geral)
2. [Stack Completa com Versões](#2-stack-completa-com-versões)
3. [Configuração do Projeto (arquivo por arquivo)](#3-configuração-do-projeto-arquivo-por-arquivo)
4. [Estrutura Completa de Diretórios](#4-estrutura-completa-de-diretórios)
5. [Camada de Infraestrutura — Banco de Dados (Supabase)](#5-camada-de-infraestrutura--banco-de-dados-supabase)
6. [Migrations SQL (ordem de aplicação)](#6-migrations-sql-ordem-de-aplicação)
7. [Cliente Supabase — 3 Estratégias](#7-cliente-supabase--3-estratégias)
8. [Utilitários — slugify, séries, auth](#8-utilitários--slugify-séries-auth)
9. [Sistema de Tema (next-themes + Tailwind v4)](#9-sistema-de-tema-next-themes--tailwind-v4)
10. [Middleware — refresh de sessão e redirect](#10-middleware--refresh-de-sessão-e-redirect)
11. [Layout Raiz e Providers](#11-layout-raiz-e-providers)
12. [Rota Raiz (/) — redirect](#12-rota-raiz--redirect)
13. [Rota de Busca (/busca) — Server Component](#13-rota-de-busca-busca--server-component)
14. [Rota de Busca — Client Component (BuscaContent)](#14-rota-de-busca--client-component-buscacontent)
15. [BuscaResults — Cards de Escola](#15-buscarresults--cards-de-escola)
16. [CaixaBuscaLocalizacao — Input de Endereço](#16-caixabuscadelocalizacao--input-de-endereço)
17. [SearchableSelect — Select com Bottom Sheet](#17-searchableselect--select-com-bottom-sheet)
18. [MapaEscolas — Leaflet Map](#18-mapaescolas--leaflet-map)
19. [SchemaEscolas — JSON-LD Dinâmico](#19-schemaescolas--json-ld-dinâmico)
20. [Página da Escola (/escola/[slug])](#20-página-da-escola-escolaslug)
21. [Página de Listagem SEO (/escolas/[uf]/[cidade])](#21-página-de-listagem-seo-escolasufcidade)
22. [Contribuir (/contribuir)](#22-contribuir-contribuir)
23. [Autenticação — Login, Cadastro, Recuperar/Alterar Senha](#23-autenticação--login-cadastro-recuperaralterar-senha)
24. [Perfil (/perfil)](#24-perfil-perfil)
25. [Página Sobre (/sobre)](#25-página-sobre-sobre)
26. [Sitemap Index — Estrutura Multi-Sitemap](#26-sitemap-index--estrutura-multi-sitemap)
27. [Footer — Diretório de Cidades](#27-footer--diretório-de-cidades)
28. [TabBar — Navegação](#28-tabbar--navegação)
29. [BotaoTema — Toggle Tema](#29-botaotema--toggle-tema)
30. [Scripts — Import CSV e Run Migration](#30-scripts--import-csv-e-run-migration)
31. [Variáveis de Ambiente](#31-variáveis-de-ambiente)
32. [Problemas Conhecidos e Workarounds](#32-problemas-conhecidos-e-workarounds)
33. [Guia de Reprodução Zero-to-Production](#33-guia-de-reprodução-zero-to-production)

---

## 1. Propósito e Visão Geral

Mensalidade Justa é uma plataforma colaborativa para buscar escolas brasileiras e consultar
mensalidades. Usuários pesquisam escolas por estado/cidade/nome, filtram por série/tipo/preço,
visualizam escolas em um mapa interativo (Leaflet) e contribuem anonimamente com valores reais
de mensalidade, matrícula e material didático.

O público-alvo são pais e responsáveis que precisam comparar custos escolares no Brasil.

O projeto é uma Single Page Application (SPA) com renderização híbrida (Next.js App Router)
usando Server Components para dados iniciais e Client Components para interatividade.

---

## 2. Stack Completa com Versões

```json
{
  "Framework": "Next.js 16.2.10 (App Router, Turbopack)",
  "Linguagem": "TypeScript 6.0.3",
  "Estilos": "Tailwind CSS 4.3.2 + PostCSS",
  "Ícones": "lucide-react 1.23.0",
  "Animação": "CSS animations (framer-motion removido por incompatibilidade React 19)",
  "Banco": "Supabase (PostgreSQL 15 + PostGIS)",
  "ORM/Client": "@supabase/supabase-js 2.49.0",
  "SSR Auth": "@supabase/ssr 0.12.0",
  "Mapas": "Leaflet 1.9.4 + react-leaflet 5.0.0",
  "Cluster": "leaflet.markercluster 1.5.3",
  "Tema": "next-themes 0.4.6",
  "DB Driver (local)": "pg 8.22.0",
  "CSV": "csv-parse 5.6.0",
  "React": "React 19.2.7 + React-DOM 19.2.7"
}
```

---

## 3. Configuração do Projeto (arquivo por arquivo)

### 3.1 `package.json`

```json
{
  "name": "mensalidadejusta",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "migrate": "node scripts/run-migration.js",
    "import": "node scripts/import-csv.js"
  },
  "dependencies": {
    "@supabase/ssr": "^0.12.0",
    "@supabase/supabase-js": "^2.49.0",
    "@tailwindcss/postcss": "^4.3.2",
    "@types/leaflet": "^1.9.21",
    "@types/leaflet.markercluster": "^1.5.6",
    "autoprefixer": "^10.5.2",
    "csv-parse": "^5.6.0",
    "dotenv": "^16.4.0",
    "framer-motion": "^12.42.2",
    "leaflet": "^1.9.4",
    "leaflet.markercluster": "^1.5.3",
    "lucide-react": "^1.23.0",
    "next": "^16.2.10",
    "next-themes": "^0.4.6",
    "pg": "^8.22.0",
    "postcss": "^8.5.16",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-leaflet": "^5.0.0",
    "tailwindcss": "^4.3.2"
  },
  "devDependencies": {
    "@types/node": "26.1.0",
    "@types/react": "19.2.17",
    "typescript": "6.0.3"
  }
}
```

### 3.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts", "**/*.ts", "**/*.tsx",
    ".next/types/**/*.ts", ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

### 3.3 `next.config.ts`

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
```

Totalmente vazio — sem redirects, rewrites, headers ou image config.

### 3.4 `postcss.config.cjs`

```js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Usa `@tailwindcss/postcss` (Tailwind v4 como plugin PostCSS).

---

## 4. Estrutura Completa de Diretórios

```
mensalidadejusta.com.br/
├── AGENTS.md                                # Resumo para IA + link para DOCUMENTACAO_PROJETO.md
├── DOCUMENTACAO_PROJETO.md                  # Este arquivo
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.cjs
├── .env                                     # Variáveis de ambiente (não versionado)
├── .env.local                               # Override local (não versionado)
├── next-env.d.ts                            # Auto-gerado Next.js
│
├── src/
│   ├── middleware.ts                         # Middleware de refresh de sessão
│   │
│   ├── app/
│   │   ├── page.tsx                          # redirect("/busca")
│   │   ├── layout.tsx                        # Root layout com providers
│   │   ├── globals.css                       # Tailwind v4 + variáveis CSS + tema
│   │   ├── sitemap.ts                        # Sitemap Index (27 estados)
│   │   │
│   │   ├── sitemaps/
│   │   │   └── [uf]/
│   │   │       └── sitemap.ts                # Sitemap por estado
│   │   │
│   │   ├── busca/
│   │   │   ├── page.tsx                      # Server Component
│   │   │   ├── busca-content.tsx             # Client Component
│   │   │   └── busca-results.tsx             # Cards de escola
│   │   │
│   │   ├── escola/[slug]/
│   │   │   ├── page.tsx                      # Server Component
│   │   │   └── escola-detalhe.tsx            # Client Component
│   │   │
│   │   ├── escolas/[uf]/[cidade]/
│   │   │   └── page.tsx                      # Server Component SEO
│   │   │
│   │   ├── contribuir/
│   │   │   └── page.tsx                      # Formulário de contribuição
│   │   │
│   │   ├── (auth)/                           # Grupo de rotas de autenticação
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx
│   │   │   ├── recuperar-senha/page.tsx
│   │   │   └── alterar-senha/page.tsx
│   │   │
│   │   ├── perfil/page.tsx                   # Perfil + exclusão
│   │   └── sobre/page.tsx                    # Página institucional
│   │
│   ├── components/
│   │   ├── botao-tema.tsx                    # Toggle dark/light
│   │   ├── caixa-busca-localizacao.tsx       # Input de endereço com autocomplete
│   │   ├── footer.tsx                        # Footer com diretório
│   │   ├── mapa-escolas.tsx                  # Leaflet lazy import
│   │   ├── schema-escolas.tsx                # JSON-LD Schema
│   │   ├── searchable-select.tsx             # Bottom sheet / sidebar select
│   │   └── tab-bar.tsx                       # Navegação principal
│   │
│   ├── lib/
│   │   ├── auth-context.tsx                  # Contexto de autenticação
│   │   ├── series.ts                         # Catálogo de séries
│   │   ├── supabase.ts                       # Cliente browser + SSR
│   │   ├── supabase-server.ts                # Cliente SSR cache 24h + timeout
│   │   └── utils.ts                          # slugify, slugs
│   │
│   └── providers/
│       └── theme-provider.tsx                # Provider next-themes
│
├── supabase/
│   └── migrations/
│       ├── 001_create_tables.sql
│       ├── 002_excluir_conta.sql
│       ├── 003_profiles_e_geo.sql
│       ├── 004_mensalidades_series.sql
│       ├── 006_normalizacao_estado_cidade.sql
│       └── 007_filtrar_escolas_paralisadas.sql
│
├── scripts/
│   ├── import-csv.js                         # Import CSV de escolas
│   └── run-migration.js                      # Executor de migrations
│
└── public/                                   # Assets estáticos vazios
```

---

## 5. Camada de Infraestrutura — Banco de Dados (Supabase)

**Projeto:** `ijfwdtemkkoiombxtyip` (US East - N. Virginia)
**Plano:** Free Tier (500MB, CPU compartilhado, conexões limitadas)

### 5.1 Extensões

```sql
CREATE EXTENSION IF NOT EXISTS postgis;     -- Geometria, ST_DWithin, ST_Distance
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Trigram index para ILIKE
-- unaccent também instalada via migration 006
```

### 5.2 Tabela `escolas_raw` (~181k linhas ativas)

Nome original: `escolas`. Renomeada para `escolas_raw` na migration 006.

```sql
CREATE TABLE IF NOT EXISTS escolas_raw (
  id SERIAL PRIMARY KEY,
  codigo_inep VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(500) NOT NULL,
  cidade_id UUID REFERENCES tb_cidades(id) ON DELETE RESTRICT,
  bairro VARCHAR(300),
  endereco TEXT,
  telefone VARCHAR(100),
  localizacao VARCHAR(50),
  localidade_diferenciada VARCHAR(200),
  dependencia_administrativa VARCHAR(50) NOT NULL,
  categoria_administrativa VARCHAR(50),
  categoria_escola_privada VARCHAR(100),
  conveniada_poder_publico VARCHAR(10),
  regulamentacao_conselho VARCHAR(50),
  porte_escola VARCHAR(200),
  etapas_modalidades TEXT,
  outras_ofertas TEXT,
  restricao_atendimento VARCHAR(300),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
```sql
CREATE INDEX idx_escolas_nome ON escolas_raw USING GIN (nome gin_trgm_ops);
CREATE INDEX idx_escolas_dependencia ON escolas_raw (dependencia_administrativa);
CREATE INDEX idx_escolas_geom ON escolas_raw USING GIST (geom);
CREATE INDEX idx_escolas_lat_lng ON escolas_raw (latitude, longitude);
CREATE INDEX idx_escolas_raw_cidade_id ON escolas_raw (cidade_id);
```

**RLS:**
```sql
ALTER TABLE escolas_raw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Escolas visiveis para todos" ON escolas_raw FOR SELECT USING (true);
```

**Regra de negócio:** Escolas com `restricao_atendimento = 'ESCOLA PARALISADA'` (31.321 registros)
são excluídas de todas as RPCs de busca, mapa e contagem (migration 007).

### 5.3 Tabela `tb_estados` (27 linhas)

```sql
CREATE TABLE IF NOT EXISTS tb_estados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tb_estados_uf ON tb_estados (uf);
```

### 5.4 Tabela `tb_cidades` (5.570 linhas)

```sql
CREATE TABLE IF NOT EXISTS tb_cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estado_id UUID NOT NULL REFERENCES tb_estados(id) ON DELETE RESTRICT,
  nome VARCHAR(200) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tb_cidades_estado_id_nome ON tb_cidades (estado_id, nome);
```

### 5.5 Tabela `mensalidades_series` (99+ linhas)

```sql
CREATE TABLE IF NOT EXISTS mensalidades_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id INTEGER NOT NULL REFERENCES escolas_raw(id) ON DELETE CASCADE,
  serie_slug VARCHAR(50) NOT NULL,
  serie_nome VARCHAR(200) NOT NULL,
  valor_mensalidade NUMERIC(10, 2),
  valor_matricula NUMERIC(10, 2),
  valor_material NUMERIC(10, 2),
  ano_vigencia INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mensalidades_series
  ADD CONSTRAINT uq_mensalidades_serie UNIQUE (escola_id, serie_slug, ano_vigencia);
CREATE INDEX IF NOT EXISTS idx_mensalidades_series_escola ON mensalidades_series (escola_id, serie_slug);
ALTER TABLE mensalidades_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura publica" ON mensalidades_series FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados inserem" ON mensalidades_series
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
GRANT SELECT ON mensalidades_series TO anon;
GRANT SELECT, INSERT ON mensalidades_series TO authenticated;
```

### 5.6 Tabela `profiles` (~2 linhas)

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  uf VARCHAR(2),
  cep VARCHAR(9),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios veem seu proprio profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuarios inserem seu proprio profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Usuarios atualizam seu proprio profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Trigger insere profile" ON profiles FOR INSERT WITH CHECK (true); -- para trigger
```

### 5.7 VIEW `escolas`

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

`security_invoker = true` é CRÍTICO — herda RLS da tabela base.

### 5.8 Tabela `mensalidades` (LEGACY — 0 linhas usadas)

Tabela original, ainda existe mas não é mais consultada/inserida pelo app.

---

## 6. Migrations SQL (ordem de aplicação)

### 6.1 `001_create_tables.sql`

Cria:
- Extensões: `postgis`, `pg_trgm`
- Tabela `escolas` (nome original, depois renomeada)
- Tabela `mensalidades` (legacy)
- Índices em escolas: `nome` (GIN trgm), `uf`, `municipio`, `dependencia`, `geom` (GIST)
- RLS: SELECT público em escolas, SELECT/INSERT condicional em mensalidades
- Trigger `update_updated_at_column()` para atualizar `updated_at` automaticamente

### 6.2 `002_excluir_conta.sql`

- Adiciona `user_id UUID REFERENCES auth.users` em mensalidades
- Cria função `excluir_minha_conta()` (SECURITY DEFINER):
  1. Verifica `auth.uid()` não nulo
  2. Anonimiza mensalidades: `UPDATE mensalidades SET user_id = NULL WHERE user_id = uid`
  3. Deleta `auth.users` (cascade deleta identidades, sessions)
- Ajusta RLS de mensalidades

### 6.3 `003_profiles_e_geo.sql`

- Cria tabela `profiles`
- Cria trigger `on_auth_user_created`:
  ```sql
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
  END;
  $$;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  ```
- RLS em profiles
- Cria RPC `escolas_perto_de_mim` (primeira versão)
- `GRANT EXECUTE ON FUNCTION escolas_perto_de_mim TO public`
- `GRANT ALL ON profiles TO service_role`
- `GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated`

### 6.4 `004_mensalidades_series.sql`

- Cria tabela `mensalidades_series` (substitui mensalidades legacy)
- UNIQUE(escola_id, serie_slug, ano_vigencia)
- RLS: SELECT público, INSERT authenticated
- GRANT: SELECT anon, SELECT+INSERT authenticated

### 6.5 `006_normalizacao_estado_cidade.sql`

**Essa migration é complexa. Executar na ordem correta:**

1. Cria `tb_estados` e `tb_cidades`
2. Popula `tb_estados` com DISTINCT uf de `escolas`
3. Popula `tb_cidades` com DISTINCT municipio por estado
4. Adiciona `cidade_id UUID FK → tb_cidades` em escolas
5. Popula `cidade_id` via JOIN
6. Renomeia `escolas` → `escolas_raw`
7. Remove colunas `uf` e `municipio` de `escolas_raw`
8. Cria VIEW `escolas` com `security_invoker = true`
9. Recria RPCs: `get_ufs`, `get_cidades`, `get_top_cidades`, `buscar_escolas_com_precos_detalhado`
10. Cria RPC `buscar_cidades` (unaccent ILIKE, limite 8)
11. Adiciona extensão `unaccent` ao schema

**RPC `buscar_escolas_com_precos_detalhado` — lógica de filtro de etapa:**
```sql
AND ((p_serie_slug IS NULL OR p_serie_slug = '')
  OR (p_serie_slug IN ('baba',...,'pre-3') AND r.etapas_modalidades ILIKE '%Educa'||chr(231)||'ao Infantil%')
  OR (p_serie_slug IN ('1-ano-fundamental',...,'5-ano-fundamental') AND r.etapas_modalidades ILIKE '%Ensino Fundamental%')
  OR (p_serie_slug IN ('6-ano-fundamental',...,'9-ano-fundamental') AND r.etapas_modalidades ILIKE '%Ensino Fundamental%')
  OR (p_serie_slug IN ('1-ano-ensino-medio',...,'3-ano-ensino-medio') AND r.etapas_modalidades ILIKE '%Ensino M'||chr(233)||'dio%'))
```

Nota: `chr(231)` = `ç`, `chr(233)` = `é` (workaround PowerShell 5.1).

### 6.6 `007_filtrar_escolas_paralisadas.sql`

Drop e recria 3 RPCs adicionando filtro de escola paralisada:

**em `buscar_escolas_com_precos_detalhado`:**
```sql
AND (r.restricao_atendimento IS NULL OR r.restricao_atendimento != 'ESCOLA PARALISADA')
```
**em `escolas_perto_de_mim`:**
```sql
AND (e.restricao_atendimento IS NULL OR e.restricao_atendimento != 'ESCOLA PARALISADA')
```
**em `get_top_cidades`:**
```sql
AND (r.restricao_atendimento IS NULL OR r.restricao_atendimento != 'ESCOLA PARALISADA')
```

---

## 7. Cliente Supabase — 3 Estratégias

### 7.1 `src/lib/supabase.ts` — Cliente Browser e SSR simples

```ts
import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

**`createClient()`** — para uso em componentes client-side:
- Usa `@supabase/ssr` `createBrowserClient`
- Gerencia cookies de sessão automaticamente
- Usado em: BuscaContent, contribuir, login, cadastro, perfil, CaixaBuscaLocalizacao

**`createServerClient()`** — para Server Components que NÃO precisam de cookies:
- Usa `@supabase/supabase-js` diretamente
- Sem refresh de token, sem persistência de sessão
- Usado em: escola/[slug]/page, escolas/[uf]/[cidade]/page, sitemap, footer

### 7.2 `src/lib/supabase-server.ts` — Cliente SSR com cache + timeout

```ts
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (url: RequestInfo | URL, init?: RequestInit) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10_000);
          const combined = init?.signal
            ? AbortSignal.any([init.signal, controller.signal])
            : controller.signal;
          return fetch(url, {
            ...init,
            signal: combined,
            next: { revalidate: 86400 } as any,
          }).finally(() => clearTimeout(timeoutId));
        },
      },
    }
  );
}
```

**Características:**
- `next: { revalidate: 86400 }` — cache de 24h (essencial para plano Free)
- `AbortController` timeout de 10s (evita build falhar se Supabase estiver lento)
- Usado APENAS em: `busca/page.tsx`

---

## 8. Utilitários — slugify, séries, auth

### 8.1 `src/lib/utils.ts`

```ts
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
```

**`makeEscolaSlug`**: "35017352" + "Colégio Turma do Bola" → `"35017352-colegio-turma-do-bola"`
**`parseEscolaSlug`**: extrai apenas o `codigo_inep` via regex `^(\d+)`
**`slugToCidade`**: "sao-paulo" → "São Paulo" (respeita palavras minúsculas: "do", "dos", "da", "das", "de", "e", "em", "no", "na", "nos", "nas")
**`slugify`**: NFD normalize → remove acentos → lowercase → substitui não-alfanuméricos por `-` → remove hífens das bordas

### 8.2 `src/lib/series.ts`

```ts
export type Serie = { slug: string; nome: string; grupo: string };

export const SERIES: Serie[] = [
  // Educação Infantil
  { slug: "baba", nome: "Berçário", grupo: "Educação Infantil" },
  { slug: "maternal-1", nome: "Maternal I", grupo: "Educação Infantil" },
  { slug: "maternal-2", nome: "Maternal II", grupo: "Educação Infantil" },
  { slug: "maternal-3", nome: "Maternal III", grupo: "Educação Infantil" },
  { slug: "pre-1", nome: "Pré I", grupo: "Educação Infantil" },
  { slug: "pre-2", nome: "Pré II", grupo: "Educação Infantil" },
  { slug: "pre-3", nome: "Pré III", grupo: "Educação Infantil" },
  // Ensino Fundamental I
  { slug: "1-ano-fundamental", nome: "1º Ano", grupo: "Ensino Fundamental I" },
  { slug: "2-ano-fundamental", nome: "2º Ano", grupo: "Ensino Fundamental I" },
  { slug: "3-ano-fundamental", nome: "3º Ano", grupo: "Ensino Fundamental I" },
  { slug: "4-ano-fundamental", nome: "4º Ano", grupo: "Ensino Fundamental I" },
  { slug: "5-ano-fundamental", nome: "5º Ano", grupo: "Ensino Fundamental I" },
  // Ensino Fundamental II
  { slug: "6-ano-fundamental", nome: "6º Ano", grupo: "Ensino Fundamental II" },
  { slug: "7-ano-fundamental", nome: "7º Ano", grupo: "Ensino Fundamental II" },
  { slug: "8-ano-fundamental", nome: "8º Ano", grupo: "Ensino Fundamental II" },
  { slug: "9-ano-fundamental", nome: "9º Ano", grupo: "Ensino Fundamental II" },
  // Ensino Médio
  { slug: "1-ano-ensino-medio", nome: "1º Ano", grupo: "Ensino Médio" },
  { slug: "2-ano-ensino-medio", nome: "2º Ano", grupo: "Ensino Médio" },
  { slug: "3-ano-ensino-medio", nome: "3º Ano", grupo: "Ensino Médio" },
];

export const GRUPOS = [...new Set(SERIES.map((s) => s.grupo))];

export function getSerieBySlug(slug: string): Serie | undefined {
  return SERIES.find((s) => s.slug === slug);
}
```

4 grupos, 18 séries no total.

### 8.3 `src/lib/auth-context.tsx`

```tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase";

type AuthContextType = { user: User | null; loading: boolean };

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## 9. Sistema de Tema (next-themes + Tailwind v4)

### 9.1 Provider (`src/providers/theme-provider.tsx`)

```tsx
"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
```

Configuração: classe `dark` no `<html>`, tema escuro padrão, sem fallback system.

### 9.2 CSS (`src/app/globals.css`)

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

@layer base {
  :root {
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --color-bg: #f0f4f9;
    --color-surface: #ffffff;
    --color-surface-hover: #e9eef6;
    --color-border: #e3e3e3;
    --color-border-hover: #c7c7c7;
    --color-text: #1f1f1f;
    --color-text-secondary: #474747;
    --color-text-tertiary: #757575;
    --color-accent-primary: #1a73e8;
    --color-accent-primary-hover: #1557b0;
    --color-accent-purple: #9333ea;
    --color-accent-coral: #db2777;
    --color-accent-success: #137333;
    --color-accent-danger: #c5221f;
  }
  .dark {
    --color-bg: #131314;
    --color-surface: #1e1f20;
    --color-surface-hover: #282a2c;
    --color-border: #3c4043;
    --color-border-hover: #5f6368;
    --color-text: #e3e3e3;
    --color-text-secondary: #c4c7c5;
    --color-text-tertiary: #8e918f;
    --color-accent-primary: #a8c7fa;
    --color-accent-primary-hover: #c2e7ff;
    --color-accent-purple: #c084fc;
    --color-accent-coral: #f472b6;
    --color-accent-success: #6ee7b7;
    --color-accent-danger: #f28b82;
  }
  body {
    background-color: var(--color-bg);
    color: var(--color-text);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 2s cubic-bezier(0.4, 0, 0.2, 1),
                color 2s cubic-bezier(0.4, 0, 0.2, 1);
  }
}
```

**Animações customizadas no CSS:**
- `slide-up`, `fade-in`, `bottom-sheet-in`, `bottom-sheet-out`
- Classes utilitárias: `.animate-slide-up`, `.animate-slide-down`, `.animate-fade-in`, `.animate-bottom-sheet-in`

**Leaflet overrides:**
- `.school-popup`: popup transparente com fundo vindo da variável CSS
- `.price-tip`: tooltip com cor e borda do tema

### 9.3 ⚠️ Regra CRÍTICA: Tailwind v4 + TurboPack Bug

**NUNCA use** className com `text-[var(--color-*)]`, `bg-[var(--color-*)]`, `shadow-[...]`.
Isso causa injeção de RSC payload no CSS e quebra o build.

**SEMPRE use** as classes do `@theme`: `text-text`, `bg-surface`, `border-border`, `shadow-sm`.

**Sintomas:** `Parsing CSS source code failed` + `self.__next_f.push`

`npm run dev` (Turbopack) frequentemente falha.
**Para testar localmente:** `npm run build && npm run start`.

---

## 10. Middleware — refresh de sessão e redirect

```tsx
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const authRoutes = ["/login", "/cadastro", "/recuperar-senha"];
  const isAuthRoute = authRoutes.some((r) => req.nextUrl.pathname.startsWith(r));

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/busca", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Funcionamento:**
- Executa em TODAS as requisições (exceto static files)
- Cria cliente SSR com manipulação de cookies
- Se usuário logado acessa `/login`, `/cadastro`, `/recuperar-senha`: redirect para `/busca`
- Matcher amplo: captura inclusive `/alterar-senha` (mas não faz redirect pois não está em `authRoutes`)

---

## 11. Layout Raiz e Providers

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import ThemeProvider from "@/providers/theme-provider";
import TabBar from "@/components/tab-bar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Mensalidade Justa",
  description: "Busque escolas e compare mensalidades com transparência",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh md:pl-16">
        <ThemeProvider>
          <AuthProvider>
            <div className="flex-1 flex flex-col">
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <TabBar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Ordem dos providers:** ThemeProvider → AuthProvider
**`md:pl-16`** no body: espaço para a sidebar (64px = 16 × 4) no desktop.
**`suppressHydrationWarning`**: necessário para next-themes (classe `dark` no html).

---

## 12. Rota Raiz (/) — redirect

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/busca");
}
```

Redirect 307 (temporary) para `/busca`.

---

## 13. Rota de Busca (/busca) — Server Component

### `src/app/busca/page.tsx`

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase-server";
import { getSerieBySlug } from "@/lib/series";
import BuscaContent from "./busca-content";
import type { EscolaResult } from "./busca-results";
```

**Função `filtrar(data, showPrivada, showPublica, maxPrice)` — filtragem server-side:**
```tsx
function filtrar(data: any[], showPrivada: boolean, showPublica: boolean, maxPrice: number | null): EscolaResult[] {
  let filtrado = [...data];
  if (showPrivada && !showPublica) {
    filtrado = filtrado.filter((e) => e.dependencia_administrativa === "Privada");
  } else if (showPublica && !showPrivada) {
    filtrado = filtrado.filter((e) => e.dependencia_administrativa !== "Privada");
  } else if (!showPrivada && !showPublica) {
    filtrado = [];
  }
  if (maxPrice != null && !isNaN(maxPrice)) {
    filtrado = filtrado.filter((e) => {
      const series = e.series_precos as Array<{ valor_mensalidade: number | null }>;
      if (!series || series.length === 0) return true;
      return series.some((s) => s.valor_mensalidade == null || s.valor_mensalidade <= maxPrice);
    });
  }
  return filtrado as EscolaResult[];
}
```

**`generateMetadata` — SEO dinâmico:**
- Monta title a partir de uf, cidade, query (q), serie
- Se cidade+uf: "Mensalidades Escolares em {cidade}/UF"
- Se UF: "Escolas em UF"
- Senão: "Buscar Escolas e Comparar Mensalidades"
- Description: genérica ou específica para cidade

**`BuscaPage` — Server Component:**
```tsx
export default async function BuscaPage({ searchParams }) {
  const params = await searchParams;
  const uf = (params.uf as string) ?? "";
  const cidade = (params.cidade as string) ?? "";
  const query = (params.q as string) ?? "";
  const serie = (params.serie as string) ?? "";
  const showPrivada = params.privada !== "0";
  const showPublica = params.publica !== "0";
  const maxPriceStr = (params.maxPrice as string) ?? "";
  const maxPrice = maxPriceStr ? Number(maxPriceStr) : null;

  const supabase = createServerClient(); // com cache 24h + timeout 10s

  // Parallel fetch de UFs e cidades
  const [{ data: ufsData }, { data: cidadesData }] = await Promise.all([
    supabase.rpc("get_ufs"),
    uf ? supabase.rpc("get_cidades", { p_uf: uf }) : Promise.resolve({ data: null }),
  ]);

  // Fetch de resultados se UF+cidade definidos
  let resultados: EscolaResult[] | null = null;
  if (uf && cidade) {
    const { data } = await supabase.rpc("buscar_escolas_com_precos_detalhado", {
      p_uf: uf, p_municipio: cidade, p_serie_slug: serie || null, p_termo: query || null,
    });
    if (data) resultados = filtrar(data, showPrivada, showPublica, maxPrice);
  }

  return (
    <Suspense fallback={<div>Iniciando...</div>}>
      <BuscaContent ufs={ufs} cidades={cidades} resultados={resultados} />
    </Suspense>
  );
}
```

---

## 14. Rota de Busca — Client Component (BuscaContent)

**Local:** `src/app/busca/busca-content.tsx` (729+ linhas completas no código fonte)

### Props

```tsx
type Props = { ufs: string[]; cidades: string[]; resultados: EscolaResult[] | null };
```

### Estado gerenciado

| Variável | Tipo | Inicialização | Descrição |
|----------|------|---------------|-----------|
| `localQuery` | string | URL param `q` | Input de busca por nome |
| `suggestions` | array | [] | Sugestões de autocomplete |
| `ufs` | string[] | initialUfs | Lista de UFs |
| `cidades` | string[] | initialCidades | Lista de cidades |
| `userLocation` | `{lat,lon}\|null` | null | Localização do usuário |
| `geoLoading` | boolean | false | Loading da geolocalização |
| `geoError` | string | "" | Erro de geolocalização |
| `hoveredId` | number\|null | null | ID da escola em hover |
| `navTick` | number | 0 | Trigger para re-render após navegação |
| `filtroLoc` | `FiltroLocalizacao\|null` | null | Filtro de localização do CaixaBusca |
| `resultadosCoordenadas` | `EscolaResult[]\|null` | null | Resultados por coordenadas (geoloc/mapa) |
| `carregandoCoordenadas` | boolean | false | Loading de busca por coordenadas |
| `mapCenter` | `{lat,lon}\|null` | null | Centro do mapa |

### Valores derivados de URL params

```tsx
const uf = filtroLoc?.uf ?? searchParams.get("uf") ?? "";
const cidade = filtroLoc?.cidade ?? searchParams.get("cidade") ?? "";
const serieSlug = searchParams.get("serie") ?? "";
const showPrivada = searchParams.get("privada") !== "0";
const showPublica = searchParams.get("publica") !== "0";
const showMap = searchParams.get("map") === "1";
const temBusca = !!(uf && cidade) || !!resultadosCoordenadas;
```

### Funções principais

**`readParam(key)`** — lê URL param, com fallback para `window.location.search` no client

**`updateFilters(updates)`** — atualiza URL params via `router.replace`

**`handleLocationChange(filtro)`** — 3 fluxos:
1. Se `filtro.latitude` + `filtro.longitude`: chama `escolas_perto_de_mim` (map center)
2. Se `filtro.cidade` + `filtro.uf`: navega para `/busca?uf=X&cidade=Y` (server fetch)
3. Se `filtro.buscaRaw`: tenta RPC `buscar_cidades`, se falhar, busca por nome (`q`)

**`dadosExibir` (useMemo)** — pipeline de filtragem:
1. Base = `resultadosCoordenadas ?? resultados`
2. Filtro privada/pública
3. Filtro de etapa (serieSlug):
   - Split por vírgula para múltiplas séries
   - Mapeia slug → grupo → busca ILIKE em `etapas_modalidades`
   - Ex: "1-ano-fundamental" → grupo "Ensino Fundamental I" → busca "ensino fundamental"
   - Ex: "baba" → grupo "Educação Infantil" → busca "educação infantil"

**`sortResults`** — ordena por distância (haversine se userLocation disponível)

### Efeitos

1. **Popstate listener**: sincroniza `localQuery` com URL ao navegar (back/forward)
2. **InitialUfs/InitialCidades**: atualiza se props mudarem
3. **Busca por URL (lat/lon)**: se URL tem `lat`/`lon`, chama `escolas_perto_de_mim`
4. **Geolocalização automática**: se mapa aberto sem busca, tenta `navigator.geolocation`
5. **Debounce de busca por nome**: 500ms, atualiza URL param `q`
6. **Autocomplete de escola**: 500ms, `supabase.from("escolas").select(...).ilike("nome", "%q%").limit(6)`
7. **Click outside**: fecha sugestões de autocomplete

### Layout

**Mobile (`md:hidden`):**
- Modo normal: header + inputs + resultados (stacked)
- Modo mapa (`?map=1`): mapa fullscreen com controles sobrepostos

**Desktop (`hidden md:flex`):**
- Modo normal: centralizado (max-w-2xl para inputs, max-w-6xl para resultados)
- Modo mapa: mapa fullscreen com painel à esquerda (w-96)

**Shadow Content SEO (sr-only):**

```tsx
<SchemaEscolas escolas={dadosExibir || []} />

<section aria-label="Diretório de Escolas para Motores de Busca" className="sr-only">
  <ul>
    {(dadosExibir || []).map((escola) => (
      <li key={escola.id}>
        <article>
          <h2>{escola.nome}</h2>
          <p>{escola.bairro
            ? `Localizada no bairro ${escola.bairro}, na cidade de ${escola.municipio} - ${escola.uf}.`
            : `Localizada na cidade de ${escola.municipio} - ${escola.uf}.`}</p>
          <p>Tipo de instituição: Escola {escola.dependencia_administrativa}.</p>
          {escola.series_precos && escola.series_precos.length > 0 && (
            <ul>
              {escola.series_precos.map((sp) => (
                <li key={sp.serie_slug}>
                  Série: {sp.serie_nome}
                  {sp.valor_mensalidade != null
                    ? ` - Mensalidade: R$ ${sp.valor_mensalidade.toFixed(2).replace(".", ",")}`
                    : " - Mensalidade: não informada"}
                </li>
              ))}
            </ul>
          )}
        </article>
      </li>
    ))}
  </ul>
</section>
```

---

## 15. BuscaResults — Cards de Escola

**Local:** `src/app/busca/busca-results.tsx`

### Types

```tsx
export type SeriePreco = {
  serie_slug: string;
  serie_nome: string;
  valor_mensalidade: number | null;
  valor_matricula: number | null;
  valor_material: number | null;
  qtd: number;
};

export type EscolaResult = {
  id: number;
  nome: string;
  uf: string;
  municipio: string;
  bairro: string | null;
  dependencia_administrativa: string;
  latitude: number | null;
  longitude: number | null;
  codigo_inep: string;
  series_precos: SeriePreco[];
  distancia_km?: number;
  etapas_modalidades?: string | null;
};
```

### Estutura do Card

- Indicador lateral: 5px roxo (`bg-purple-500`) para privada, verde (`bg-success`) para pública
- Nome da escola (`<h2>`)
- Distância (se disponível): "< 1km → Xm", "≥ 1km → X.X km"
- Preços:
  - Se `serieSlug` específica: mostra preço da série selecionada
  - Se todas as séries: agrupa por grupo (Infantil, Fundamental I/II, Médio), mostra min-max + qtd contribuições
  - Pública sem preço: "Gratuito"
  - Privada sem preço: "Sem mensalidades ainda. Cadastre a sua..."
- Botões (apenas privadas):
  - "Contribuir" → `/contribuir?escola={codigo_inep}`
  - "Convidar" → WhatsApp share (texto personalizado)

### Hover no mapa

```tsx
onMouseEnter={() => onHover?.(escola.id)}
onMouseLeave={() => onHover?.(null)}
```

Sincroniza com `hoveredId` no BuscaContent e no MapaEscolas.

---

## 16. CaixaBuscaLocalizacao — Input de Endereço

**Local:** `src/components/caixa-busca-localizacao.tsx` (~520 linhas completas)

> ⚠️ **Este componente foi reescrito.** A documentação abaixo reflete a versão mais recente.
> Para histórico de bugs corrigidos, veja [Seção 33](#33-bugs-corrigidos-e-proteções-defensivas).

**Arquitetura do motor de busca:**
- **CEP** (entrada numérica): ViaCEP → Nominatim (geocode secundário para lat/lng)
- **Texto/endereço**: Nominatim OSM diretamente (`search?format=json&q=...&accept-language=pt-BR`)
- Header obrigatório: `User-Agent: MensalidadeJustaApp/1.0 (contato@mensalidadejusta.com.br)`
- Timeout: 5s via `fetchComTimeout()` com `AbortController`
- Anti-race: flag `let active = true` + verificação após cada `await`
- Dedup: filtro `Set<string>` por `label` único
- `slugify()` interno para gerar slugs SEO-friendly
- `extrairUf()` com dicionário `ESTADO_UF` para evitar bug "SÃ"
- Badges de categoria: "Cidade", "Bairro", "Rua/Logradouro", "CEP", "Estabelecimento"

### Tipos

```tsx
export interface SugestaoLocalizacao {
  id: string;
  textoExibicao: string;
  tipo: "bairro" | "cidade" | "logradouro" | "cep";
  bairro?: string;
  cidade: string;
  uf: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

export interface FiltroLocalizacao {
  buscaRaw: string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  latitude?: number;
  longitude?: number;
}
```

### Constantes

```tsx
const CEP_REGEX = /^(\d{5})-?(\d{3})$/;
const FETCH_TIMEOUT_MS = 3000;

function fetchComTimeout(input, init?): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

const ESTADO_UF: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", "amapa": "AP", /* ... 27 estados */
};

function normalizarUf(valor: string): string {
  if (!valor) return "";
  const upper = valor.toUpperCase();
  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) return upper;
  return ESTADO_UF[/* normalize NFD */] || valor.toUpperCase().slice(0, 2);
}
```

### Fluxo de busca

```tsx
async function buscar(query: string) {
  const requestId = ++reqIdRef.current;
  const cepMatch = trimmed.match(CEP_REGEX);
  if (cepMatch) {
    await buscarCep(cepLimpo, requestId);
  } else if (trimmed.length >= 3) {
    await buscarLocationIQ(trimmed, requestId);
  }
}
```

**`buscarCep`** — ViaCEP + Nominatim (geocode secundário):
```tsx
const res = await fetchComTimeout(`https://viacep.com.br/ws/${cep}/json/`);
// Após resposta, faz segunda chamada ao Nominatim para lat/lng
const geoRes = await fetchComTimeout(
  `https://nominatim.openstreetmap.org/search?format=json&q=${enderecoStr}&countrycodes=br&limit=1&accept-language=pt-BR`,
  { headers: { "User-Agent": NOMINATIM_UA } }
);
```
- Se ViaCEP falhar: dropdown vazio com "Nenhum local encontrado"

**`buscarNominatim`** — API principal para texto/endereço:
```tsx
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&addressdetails=1&limit=5&accept-language=pt-BR`;
const res = await fetchComTimeout(url, { headers: { "User-Agent": NOMINATIM_UA } });
```
- Header `User-Agent` obrigatório (evita 403)
- `&accept-language=pt-BR` para nomes completos em português
- Resultados deduplicados por `label` via `Set<string>`

### Botão "Perto de mim"

```tsx
async function buscarPertoDeMim() {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 60000,
    });
  });
  // Reverse geocode via Nominatim
  const res = await fetchComTimeout(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`,
    { headers: { "User-Agent": NOMINATIM_UA } }
  );
  // Chama onLocationChange com lat/lon + cidade/uf
}
```

### Props do componente

```tsx
interface LocalizacaoResult {
  label: string;      // "Piracicaba, SP"
  slug: string;       // "piracicaba-sp" (slugify para SEO)
  lat: number;
  lng: number;
}

interface CaixaBuscaLocalizacaoProps {
  onLocationChange: (filtro: FiltroLocalizacao) => void;
  onLocationSelect?: (loc: LocalizacaoResult) => void;  // dispara ao selecionar local com lat/lng
  initialValue?: string;
  className?: string;
  iconOnlyGeo?: boolean;  // se true, esconde texto "Perto de mim" no botão
}
```

---

## 17. SearchableSelect — Select com Bottom Sheet

**Local:** `src/components/searchable-select.tsx` (354 linhas)

### Props

```tsx
type Props = {
  label: string;
  value: string;
  options?: string[];
  series?: SerieItem[];
  grupos?: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isMultiple?: boolean;
  position?: "sheet" | "sidebar";
};
```

### Modos

**Sheet (padrão):**
- Mobile: bottom sheet (CSS animations, 90dvh, drag removido por crash React 19)
- Desktop: modal centralizado (max-w-lg)
- Overflow: hidden no body quando aberto
- Input de busca com debounce

**Sidebar (desktop apenas):**
- Sidebar fixa (`left-16`, w-80)
- Botões "Aplicar Filtros" e "Limpar" (draft state)
- Overlay semi-transparente

### Funcionamento

```tsx
function handleSelect(val: string) {
  if (sidebar) {
    // Modo draft: modifica draftValue (precisa aplicar)
  } else {
    // Modo imediato: chama onChange direto
  }
}
```

- Suporta `isMultiple`: checkbox (múltiplo) ou radio (único)
- Opção "Todos" / "Todas as etapas"
- Agrupa séries por grupo (Educação Infantil, Fundamental I/II, Médio)

### Animações (CSS)

**framo-motion removido** — causava `TypeError: Cannot read properties of undefined (reading 'map')` + loop infinito de renderização no React 19 devido a incompatibilidade com `React.Children.forEach` na versão 12.42.2.

Substituído por classes CSS definidas em `globals.css`:
- `animate-fade-in`: fade-in 0.2s ease-out (overlay)
- `animate-slide-up`: slide-up 0.3s cubic-bezier (sidebar)
- `animate-bottom-sheet-in`: bottom-sheet-in 0.35s cubic-bezier (mobile sheet)

O `drag` do bottom sheet foi removido (não essencial).

```tsx
{open && !sidebar && (
  <div className="fixed inset-0 z-50 ... animate-fade-in">
    <div className="absolute inset-0 bg-black/70" onClick={closeSheet} />
    <div ref={sheetRef} className="... animate-bottom-sheet-in" style={{ height: "90dvh" }}>
      ...
    </div>
  </div>
)}
```

---

## 18. MapaEscolas — Leaflet Map

**Local:** `src/components/mapa-escolas.tsx` (198 linhas)

### Lazy Import (CRÍTICO)

```tsx
useEffect(() => {
  if (!el.current || state.current) return;
  (async () => {
    const mod = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    const L = mod.default || mod;
    // ...
  })();
}, []);
```

Leaflet é importado dinamicamente APENAS no client-side, nunca no server.

### Inicialização

```tsx
const map = L.map(el.current!, { zoomControl: false }).setView([-15.8, -47.9], 4);
```

View inicial: centro do Brasil, zoom 4.

### Tiles

5 opções com layer control (colapsado, canto superior direito):

| Nome | URL |
|------|-----|
| Padrão | OpenStreetMap |
| Satélite | Esri World Imagery |
| Terreno | OpenTopoMap |
| Claro | CARTO light_all |
| Escuro | CARTO dark_all |

### Marcadores

```tsx
for (const e of selecionadas) {
  const color = priv ? "#a855f7" : "#34d399"; // roxo = privada, verde = pública
  const m = L.circleMarker(p, {
    radius: h ? 10 : 7,
    fillColor: color,
    color: "#222",
    weight: h ? 2.5 : 1.5,
    fillOpacity: h ? 1 : 0.85,
  });
  m.bindPopup(`...html com nome, preços, link...`);
  if (preco) {
    m.bindTooltip(`<span>${preco}</span>`, { permanent: true, direction: "top", className: "price-tip" });
  }
  markers.addLayer(m);
}
```

### Tooltip de preço (permanente)

- Exibido apenas para privadas com preço
- Formato: "R$ 1.2k" (se ≥ 1000) ou "R$ 1200" (se < 1000)
- Escondido ao abrir popup, restaurado ao fechar

### Popup (ao clicar)

- Conteúdo HTML inline com nome, bairro, preços por grupo, link "Ver detalhes"
- Usa `school-popup` className para CSS theme-aware

### Limite de marcadores por zoom

```tsx
const limite = z >= 14 ? 9999 : z >= 12 ? 50 : z >= 10 ? 30 : 15;
```

### Ordenação de marcadores

Com preço primeiro, depois sem preço:
```tsx
const comPreco = todas.filter((e) => priv && mediaPreco(e, serieSlug));
const semPreco = todas.filter((e) => !priv || !mediaPreco(e, serieSlug));
const ordenadas = [...comPreco, ...semPreco];
```

### Pulse animation (localização do usuário)

```tsx
let r = 14;
const int = setInterval(() => {
  r += 0.5;
  pulse.setRadius(r);
  pulse.setStyle({ fillOpacity: Math.max(0, 0.25 - (r - 14) * 0.02) });
  if (r > 30) r = 14;
}, 40);
```

### mapCenter effect

```tsx
useEffect(() => {
  if (!mapCenter || !state.current) return;
  state.current.map.setView([mapCenter.lat, mapCenter.lon], 14, { animate: true });
}, [mapCenter]);
```

### onBoundsChange

Dispara `onBoundsChange` quando o mapa é movido (debounce via hash de bounds).
Não dispara se um popup estiver aberto.

---

## 19. SchemaEscolas — JSON-LD Dinâmico

**Local:** `src/components/schema-escolas.tsx`

```tsx
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

type Props = { escolas: Escola[] };
```

**Função `calcularPriceRange`:**
```tsx
function calcularPriceRange(escola: Escola): string {
  const precos = escola.series_precos
    .map((s) => s.valor_mensalidade)
    .filter((v): v is number => v != null);
  if (precos.length === 0) return "BR-BRL 0-0";
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return `BR-BRL ${Math.round(min)}-${Math.round(max)}`;
}
```

**Schema gerado:**
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "School",
        "name": "Nome da Escola",
        "address": { "@type": "PostalAddress", "addressLocality": "Cidade", "addressRegion": "UF", "streetAddress": "Bairro", "addressCountry": "BR" },
        "priceRange": "BR-BRL 1100-1500"
      }
    }
  ]
}
```

Renderizado no BuscaContent imediatamente antes do shadow content sr-only.

---

## 20. Página da Escola (/escola/[slug])

### Server Component (`escola/[slug]/page.tsx`)

**Função `getEscola(slug)`:**
1. `parseEscolaSlug(slug)` → extrai `codigo_inep`
2. Busca escola: `supabase.from("escolas").select("...").eq("codigo_inep", codigoInep).single()`
3. Busca estatísticas: `supabase.rpc("get_estatisticas_escola", { p_escola_id })`
4. Retorna null se não encontrada (→ `notFound()`)

**Colunas selecionadas da VIEW `escolas`:**
```ts
"id, nome, uf, municipio, bairro, endereco, telefone, dependencia_administrativa, categoria_administrativa, categoria_escola_privada, localizacao, localidade_diferenciada, porte_escola, etapas_modalidades, outras_ofertas, conveniada_poder_publico, regulamentacao_conselho, latitude, longitude, restricao_atendimento, codigo_inep"
```

**JSON-LD (Schema.org):**
```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "...",
  "address": { "@type": "PostalAddress", ... },
  "containsPlace": {
    "@type": "Product",
    "offers": { "@type": "AggregateOffer", "priceCurrency": "BRL", "lowPrice": "—", "highPrice": "—" }
  }
}
```

### Client Component (`escola-detalhe.tsx`)

**Seções:**
1. Botão "← Voltar para busca" (`router.back()`)
2. Nome + localização (`<h1>`)
3. **Se privada:** tabela de preços por série (grupos agrupados)
   - Colunas: Série, Qtd, Mín, Média, Máx
   - Se sem preços: "Seja o primeiro a contribuir" + botão WhatsApp
4. **Se pública:** "Escola pública gratuita"
5. Informações da escola em grid 2 colunas (bairro, dependência, localização, endereço, telefone, porte, etapas, outras ofertas, convênio, regulamentação, código INEP, restrição)
6. Mapa embutido (iframe OpenStreetMap)

**Tabela de preços:**
```tsx
{grupos.map((grupo) => {
  const series = SERIES.filter((s) => s.grupo === grupo);
  const hasData = series.some((s) => precos.find((p) => p.serie_slug === s.slug));
  if (!hasData) return null;
  return (
    <Fragment key={grupo}>
      <tr><td colSpan={5} className="...">{grupo}</td></tr>
      {series.map((s) => {
        const p = precos.find((pr) => pr.serie_slug === s.slug);
        if (!p || !p.qtd_mensalidade) return null;
        return (
          <tr key={s.slug}>
            <td>{s.nome}</td>
            <td>{p.qtd_mensalidade}</td>
            <td>{fmt(p.min_mensalidade)}</td>
            <td className="font-semibold">{fmt(p.media_mensalidade)}</td>
            <td>{fmt(p.max_mensalidade)}</td>
          </tr>
        );
      })}
    </Fragment>
  );
})}
```

**WhatsAppShare:** link para `https://wa.me/?text={texto}` com texto personalizado de convite.

---

## 21. Página de Listagem SEO (/escolas/[uf]/[cidade])

**Local:** `src/app/escolas/[uf]/[cidade]/page.tsx`

**Server Component apenas** (sem Client Component).

**Função `getEscolas(ufSlug, cidadeSlug)`:**
1. `get_cidades(ufUpper)` → descobre nome real da cidade
2. `slugMatch(rows, cidadeSlug)` → match exato (slugify) ou fallback por primeira palavra
3. Fetch paralelo de 3 páginas de 1000 escolas:
   ```tsx
   const ranges = Array.from({ length: 3 }, (_, i) => i * 1000);
   const pages = await Promise.all(
     ranges.map((offset) =>
       supabase.from("escolas").select("id, nome, uf, municipio, bairro, dependencia_administrativa, codigo_inep")
         .eq("uf", ufUpper).eq("municipio", cidadeMatch).order("nome").range(offset, offset + 999)
     )
   );
   ```
4. Concatena todas as páginas

**Renderização:** Lista de links para cada escola (`/escola/{slug}`) dentro de `<main>`.

**SEO:** Título: "Escolas em {cidade}/{UF} — {N} instituições | Mensalidade Justa"

---

## 22. Contribuir (/contribuir)

**Local:** `src/app/contribuir/page.tsx`

### Fluxo

1. **Não logado:** mensagem de anonimato + botões "Entrar" / "Criar conta"
2. **Logado:**
   - Input de busca de escola: `supabase.from("escolas").select("id, nome, bairro, municipio, uf").ilike("nome", "%query%").limit(8)`
   - Select de série (agrupado por GRUPOS, `<optgroup>`)
   - Inputs: mensalidade, matrícula, material (R$)
   - Submit: `supabase.from("mensalidades_series").insert({...})`
     ```tsx
     {
       escola_id: escolaSelected.id,
       serie_slug: serieSlug,
       serie_nome: serie?.nome || serieSlug,
       user_id: user?.id || null,
       valor_mensalidade: mensalidade ? parseFloat(mensalidade) : null,
       valor_matricula: matricula ? parseFloat(matricula) : null,
       valor_material: material ? parseFloat(material) : null,
       ano_vigencia: new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0),
     }
     ```
   - **Regra de ano:** se mês ≥ julho, ano_vigencia = ano atual + 1 (ano letivo seguinte)
3. **Sucesso:** "Obrigado! Sua contribuição foi salva de forma anônima."

---

## 23. Autenticação — Login, Cadastro, Recuperar/Alterar Senha

### Login (`(auth)/login/page.tsx`)

```tsx
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (!error) router.push("/busca");
```

### Cadastro (`(auth)/cadastro/page.tsx`)

**2 etapas:**

Etapa 1 — Credenciais:
```tsx
const { error } = await supabase.auth.signUp({ email, password });
```
Se ok → step = "endereco"

Etapa 2 — Endereço:
- CEP com autocomplete ViaCEP: `https://viacep.com.br/ws/{cep}/json/`
- Geocode Nominatim: `https://nominatim.openstreetmap.org/search?q={endereco}&format=json`
- `supabase.from("profiles").upsert({ id: user.id, logradouro, numero, bairro, cidade, uf, cep, latitude, longitude, geom })`
- Pode pular ("Pular esta etapa")

### Recuperar senha (`(auth)/recuperar-senha/page.tsx`)

```tsx
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/alterar-senha`,
});
```

### Alterar senha (`(auth)/alterar-senha/page.tsx`)

```tsx
const { error } = await supabase.auth.updateUser({ password });
```

Verifica sessão existente (`getSession()`), senão redireciona para `/login`.

---

## 24. Perfil (/perfil)

**Local:** `src/app/perfil/page.tsx`

- Mostra email do usuário
- Link para alterar senha (`/alterar-senha`)
- Botão "Sair": `supabase.auth.signOut()`
- Seção "Excluir conta" com confirmação em 2 etapas:
  1. Clique em "Excluir minha conta" → mostra confirmação
  2. "Sim, excluir" → `supabase.rpc("excluir_minha_conta")` + `signOut()`

---

## 25. Página Sobre (/sobre)

**Local:** `src/app/sobre/page.tsx`

**Server Component estático** (sem nenhum fetch).

Usa `String.fromCodePoint(n)` para caracteres especiais (workaround PowerShell):
```tsx
const A = (n: number) => String.fromCodePoint(n);
// {A(0x00E9)} = "é"
// {A(0x00E7)} = "ç"
// {A(0x00E3)} = "ã"
// {A(0x2190)} = "←"
```

Seções: problema, nossa ideia, para quem é, privacidade total, aviso importante.

---

## 26. Sitemap Index — Estrutura Multi-Sitemap

### Arquivo mestre (`src/app/sitemap.ts`)

```tsx
import type { MetadataRoute } from "next";
import { createServerClient } from "@/lib/supabase";

const BASE = "https://mensalidadejusta.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient();
  const { data: ufs } = await supabase.rpc("get_ufs");
  const ufList: string[] = (ufs || []).map((r: any) => r.uf).filter(Boolean);

  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/busca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/sobre`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  for (const uf of ufList) {
    entries.push({
      url: `${BASE}/sitemaps/${uf.toLowerCase()}/sitemap.xml`,
      lastModified: new Date(), changeFrequency: "weekly", priority: 0.6,
    });
  }

  return entries;
}
```

Gera `/sitemap.xml` com 30 entradas no total (3 fixas + 27 estados).

### Sitemap por estado (`src/app/sitemaps/[uf]/sitemap.ts`)

```tsx
export default async function sitemap({ params }: Props): Promise<MetadataRoute.Sitemap> {
  const { uf: ufSlug } = await params;
  const uf = ufSlug.toUpperCase();
  if (!UFS.has(uf)) notFound();

  const supabase = createServerClient();
  const entries: MetadataRoute.Sitemap = [];

  // Cidades
  const { data: cidades } = await supabase
    .from("escolas").select("municipio").eq("uf", uf).not("municipio", "is", null).order("municipio");
  // ... slugify cada cidade, entries.push(url)

  // Escolas (até 1000 por estado)
  const { data: escolas } = await supabase
    .from("escolas").select("codigo_inep, nome").eq("uf", uf).order("id").limit(1000);
  // ... entries.push para cada escola

  return entries;
}
```

**Importante:** `createServerClient()` sem cache (usado no sitemap para dados fresh).

---

## 27. Footer — Diretório de Cidades

**Local:** `src/components/footer.tsx` (Server Component)

```tsx
const UFS_PRIORITY = ["SP", "RJ", "MG", "RS", "PR", "BA"];

export default async function Footer() {
  const supabase = createServerClient();
  for (const uf of UFS_PRIORITY) {
    try {
      const { data } = await supabase.rpc("get_top_cidades", { p_uf: uf, p_limit: 10 });
      if (data?.length) cidadesPorUf[uf] = data;
    } catch { /* falha silenciosa */ }
  }
  // Renderiza grid de links
}
```

**Características:**
- Busca `get_top_cidades` para 6 UFs
- Cache 24h via `supabase-server.ts`
- Falha silenciosa (build não quebra)
- Grid: 2 col (mobile), 3 (sm), 4 (md), 6 (lg)
- Links para `/escolas/{uf}/{slugify(municipio)}`

---

## 28. TabBar — Navegação

**Local:** `src/components/tab-bar.tsx` (Client Component)

### Abas

```tsx
const tabs = [
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/contribuir", label: "Contribuir", icon: Edit3 },
  { href: "/perfil", label: "Perfil", icon: User },
  { href: "/sobre", label: "Sobre", icon: Info },
];
```

### Desktop

Sidebar fixa à esquerda (`w-16`, `fixed left-0 top-0 bottom-0`):
- Abas no topo
- Botão de tema, botão "Mapa", SHA do commit no final

### Mobile

Bottom tab bar (`sticky bottom-0`):
- 4 abas + Mapa + Tema
- Ativo: cor primary

### Mapa toggle

```tsx
function handleMapToggle() {
  if (pathname === "/busca") {
    // alterna ?map=1
  } else {
    router.push("/busca?map=1");
  }
}
```

### Escondida em

Rotas de auth: `/login`, `/cadastro`, `/recuperar-senha`, `/alterar-senha`.

---

## 29. BotaoTema — Toggle Tema

**Local:** `src/components/botao-tema.tsx`

```tsx
export default function BotaoTema() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />; // placeholder evita layout shift

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}
```

Placeholder de 36×36px (w-9 h-9) enquanto não montado.

---

## 30. Scripts — Import CSV e Run Migration

### 30.1 `scripts/import-csv.js`

```bash
npm run import
```

- Lê `Análise - Tabela da lista das escolas - Detalhado.csv`
- Parseia com `csv-parse`
- Batch de 200 registros (upsert via Supabase REST)
- Conflito resolvido por `codigo_inep`
- Gera `geom` (Point GeoJSON) a partir de lat/lng
- Extrai bairro do endereço via regex: `/\.\s*([^.\d]+?)\.\s*\d{5}/`
- Usa `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` das env vars

**Mapeamento de colunas do CSV:**
```
row[0] = restricao_atendimento
row[1] = nome
row[2] = codigo_inep
row[3] = uf
row[4] = municipio
row[5] = localizacao
row[6] = localidade_diferenciada
row[7] = categoria_administrativa
row[8] = endereco
row[9] = telefone
row[10] = dependencia_administrativa
row[11] = categoria_escola_privada
row[12] = conveniada_poder_publico
row[13] = regulamentacao_conselho
row[14] = porte_escola
row[15] = etapas_modalidades
row[16] = outras_ofertas
row[17] = latitude
row[18] = longitude
```

### 30.2 `scripts/run-migration.js`

```bash
npm run migrate 006_normalizacao_estado_cidade.sql
```

- Resolve DNS via Google DNS (`8.8.8.8`, `1.1.1.1`) — **necessário porque IPv6 não funciona**
- Conecta via `pg` Pool com SSL (`rejectUnauthorized: false`)
- Lê arquivo SQL, divide por `;` e executa statement por statement
- Variáveis de ambiente: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

## 31. Variáveis de Ambiente

```
# .env.local (não versionado)

NEXT_PUBLIC_SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Para import CSV e migrations locais
SUPABASE_URL=https://ijfwdtemkkoiombxtyip.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_MGMT_TOKEN=sbp_...

# Para migrations via pg direto
DB_HOST=db.ijfwdtemkkoiombxtyip.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=...
DB_NAME=postgres

# LocationIQ (autocomplete de endereço)
NEXT_PUBLIC_LOCATIONIQ_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx
```

**Vars expostas ao browser** (prefixo `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_LOCATIONIQ_TOKEN`

**Vars server-side:**
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_MGMT_TOKEN`
- `SUPABASE_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

---

## 32. Problemas Conhecidos e Workarounds

### 32.1 TurboPack + Tailwind v4 (CRÍTICO)

`npm run dev` frequentemente falha com:
```
Parsing CSS source code failed + self.__next_f.push
```

**Causa:** `text-[var(--color-*)]` no className causa injeção de RSC payload no CSS.

**Solução:** Use classes do `@theme` (`text-text`, `bg-surface`, `border-border`).
Nunca use `text-[var(--color-text)]`, `bg-[var(--color-surface)]`.

**Teste local:** `npm run build && npm run start`

### 32.2 Windows PowerShell 5.1 + UTF-8

PowerShell 5.1 corrompe UTF-8.

**Workarounds:**
- JSX: `{'\u00e7'}` = ç, `{'\u00fa'}` = ú, `{'\u00e9'}` = é
- SQL: `chr(231)` = ç, `chr(233)` = é
- JS strings: `String.fromCodePoint(0x00E9)` = "é"
- Emojis: `String.fromCodePoint(0x2764)` = ❤

### 32.3 IPv6

Conexão PostgreSQL direta não funciona porque o host só tem IPv6.

**Solução:** `run-migration.js` resolve DNS via Google DNS (`8.8.8.8`).

### 32.4 Plano Free Supabase

- 500MB de banco
- Conexões limitadas
- CPU compartilhado
- Queries lentas (>5s) podem timeoutar

**Mitigações:**
- Cache 24h via `next: { revalidate: 86400 }` no `supabase-server.ts`
- Timeout de 10s via AbortController
- Falha silenciosa no footer
- Limit de 1000 escolas no sitemap por estado

### 32.5 Windows EPERM

`Remove-Item -Recurse -Force .next` pode falhar com EPERM/EBUSY.
Executar de novo que resolve.

---

## 33. Bugs Corrigidos e Proteções Defensivas

### 33.1 framer-motion AnimatePresence + React 19

**Sintoma:** `TypeError: Cannot read properties of undefined (reading 'map')` no chunk do framer-motion + loop infinito de `postMessage` no scheduler do React.

**Causa:** framer-motion 12.42.2 usa `React.Children.forEach()` internamente no `AnimatePresence`. React 19 modificou a API `Children`, fazendo com que o callback receba `false`/`undefined` em vez de null quando o children é `{cond && <Elemento/>}` avaliando para `false`. O `.map()` subsequente no `AnimatePresence` quebra.

**Solução:** Remoção completa do `AnimatePresence` e `motion.div` do `SearchableSelect`. Substituído por `<div>` puros com classes CSS:
- `animate-fade-in` para o overlay
- `animate-slide-up` para a sidebar
- `animate-bottom-sheet-in` para o bottom sheet

```tsx
// ANTES (crash):
<AnimatePresence>
  {open && sidebar && (<motion.div .../>)}
  {open && !sidebar && (<motion.div .../>)}
</AnimatePresence>

// DEPOIS (CSS):
{open && sidebar && (<div className="animate-fade-in"><div className="animate-slide-up">...</div></div>)}
{open && !sidebar && (<div className="animate-fade-in"><div ref={sheetRef} className="animate-bottom-sheet-in">...</div></div>)}
```

### 33.2 RPC `escolas_perto_de_mim` não retorna `series_precos`

**Sintoma:** `TypeError: Cannot read properties of undefined (reading 'length')` ao carregar página com `?lat=...&lon=...`.

**Causa:** A RPC `escolas_perto_de_mim` retorna as colunas `(id, nome, uf, municipio, bairro, dependencia_administrativa, latitude, longitude, distancia_km)` — **não inclui** `series_precos`. O componente `BuscaResults` acessava `escola.series_precos.length` diretamente, quebrando quando o dado vinha desta RPC (via geolocalização ou coordenadas na URL).

**Solução:** Guard `Array.isArray` na prop antes de acessar:

```tsx
const precosArr = Array.isArray(escola.series_precos) ? escola.series_precos : [];
{precosArr.length > 0 ? (
  // renderiza preços
) : (
  // fallback: "Sem mensalidades" ou "Gratuito"
)}
```

### 33.3 Array.isArray Guards em todo `.map()` do bundle `/busca`

**Sintoma:** `TypeError: Cannot read properties of undefined (reading 'map')` no bundle da rota `/busca`.

**Causa:** Props de componentes (ex: `resultados`, `escolas`) podem chegar como `{}` (objeto vazio) em vez de array em certos fluxos assíncronos. O guard `if (x.length === 0)` não protege contra `{}` porque `{}.length` é `undefined` (não `0`), então o `=== 0` falha e o `.map()` subsequente quebra.

**Solução:** Substituir `x.length === 0` por `Array.isArray(x)` em TODOS os pontos de entrada de arrays:

```tsx
// ❌ FRÁGIL:
if (resultados.length === 0) return <Empty />;
resultados.map(...)

// ✅ RESILIENTE:
const lista = Array.isArray(resultados) ? resultados : [];
if (lista.length === 0) return <Empty />;
lista.map(...)
```

**Arquivos corrigidos:**
- `busca-results.tsx` — `resultados` prop
- `schema-escolas.tsx` — `escolas` prop + `series_precos` interno
- `mapa-escolas.tsx` — `escolas` prop + `series_precos` interno + `mediaPreco()`
- `searchable-select.tsx` — `filteredOptions` array

### 33.4 Mapa: feedback loop no fitBounds durante interação do usuário

**Sintoma:** Ao arrastar ou dar zoom no mapa Leaflet, a câmera "pulava" sozinha, interrompendo a navegação.

**Causa:** `onBoundsChange` disparava `syncMarkers(true)`, que chamava `fitBounds()`/`setView()` mesmo quando o usuário estava interagindo com o mapa — criando um loop: usuário move → `fitBounds` → moveend → mais dados → `fitBounds` de novo.

**Solução:** Ref `isInitialLoadOrFilterChange` que só permite ajuste de câmera na carga inicial ou quando `mapCenter` muda (filtro externo). Interações do usuário (drag/zoom) desativam a flag imediatamente.

```tsx
const isInitialLoadOrFilterChange = useRef(true);

// No moveend (usuário interagiu):
map.on("moveend", () => {
  isInitialLoadOrFilterChange.current = false;  // ← desliga flag
  onBoundsChange({...});
});

// No syncMarkers:
if (ajustarCamera && isInitialLoadOrFilterChange.current && bounds.isValid()) {
  map.fitBounds(bounds);
  isInitialLoadOrFilterChange.current = false;  // ← desliga após ajustar
}

// Quando mapCenter muda (filtro externo):
useEffect(() => {
  isInitialLoadOrFilterChange.current = true;   // ← religa flag
  map.setView([mapCenter.lat, mapCenter.lon], 14);
}, [mapCenter]);
```

### 33.5 Migração de APIs externas (LocationIQ → IBGE + ViaCEP + Nominatim)

**Sintoma:** LocationIQ exigia token pago e não funcionava consistentemente.

**Solução:** Substituído por 3 APIs gratuitas sem token:

| Tipo de entrada | API | Função |
|----------------|-----|--------|
| Letras (cidade) | **IBGE** (`servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=...`) | Autocomplete de municípios brasileiros |
| Números (CEP) | **ViaCEP** (`viacep.com.br/ws/{cep}/json/`) | Busca endereço por CEP |
| Geocode + texto | **Nominatim OSM** (`nominatim.openstreetmap.org/search`) | Converte texto em coordenadas (lat/lng) |
| Reverse geocode | **Nominatim OSM** (`nominatim.openstreetmap.org/reverse`) | Converte coordenadas em endereço |

**Requisitos obrigatórios do Nominatim:**
- Header `User-Agent: MensalidadeJustaApp/1.0 (contato@mensalidadejusta.com.br)` — sem isso retorna 403
- Parâmetro `&accept-language=pt-BR` — força nomes completos em português (resolve bug "SÃ")

**CEP + Geocode secundário:** ViaCEP não retorna coordenadas. Após receber o endereço do ViaCEP, faz-se uma segunda chamada ao Nominatim com o endereço formatado para extrair lat/lng.

**Helper `fetchComTimeout()`** com `AbortController` + 5000ms:
```tsx
const FETCH_TIMEOUT_MS = 5000;
function fetchComTimeout(input, init?): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
```

### 33.6 Bug de encoding "SÃ" no Nominatim

**Sintoma:** Estados apareciam truncados como "SÃ" em vez de "SP" (ex: "Piracicaba, SÃ").

**Causa:** `addr.state` retorna "São Paulo" do Nominatim. O código anterior fazia `.toUpperCase().slice(0, 2)` → "SÃO PAULO" → "SÃ".

**Solução:** Dicionário `ESTADO_UF` com mapeamento nome-completo → sigla + função `extrairUf()`:

```tsx
const ESTADO_UF: Record<string, string> = {
  "acre": "AC", "alagoas": "AL", ..., "sao paulo": "SP", ...
};

function extrairUf(state: string): string {
  if (!state) return "";
  const upper = state.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  const normalizado = state.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return ESTADO_UF[normalizado] || upper.slice(0, 2);
}
```

### 33.7 Dropdown com duplicatas do Nominatim

**Sintoma:** Nominatim retorna múltiplos registros com o mesmo texto para a mesma cidade (ex: ponto central + polígono da prefeitura). O dropdown exibia entradas duplicadas.

**Solução:** Filtro de unicidade baseado no `label`:
```tsx
const vistos = new Set<string>();
const lista = mapeados.filter((item) => {
  if (vistos.has(item.label)) return false;
  vistos.add(item.label);
  return true;
});
```

### 33.8 Mapa desktop não recebia mapCenter

**Sintoma:** Ao selecionar uma cidade no desktop, a URL atualizava mas o mapa não movia a câmera.

**Causa:** A instância desktop do `MapaEscolas` (`hidden md:flex`) não passava a prop `mapCenter`. Apenas a versão mobile tinha `mapCenter={mapCenter}`.

**Solução:** Adicionado `mapCenter={mapCenter}` na instância desktop. O `mapCenter` effect em `mapa-escolas.tsx` já faz `setView` com `isInitialLoadOrFilterChange.current = true`.

### 33.9 URL SEO-friendly com slug

**Sintoma:** A URL gerada ao selecionar uma cidade era `?lat=X&lon=Y`, sem identificador textual para o Google indexar.

**Solução:** Adicionado campo `slug` em `LocalizacaoResult` e parâmetro `cidade` na URL:
```tsx
interface LocalizacaoResult {
  label: string;      // "Santos, SP"
  slug: string;       // "santos-sp" (slugify)
  lat: number;
  lng: number;
}
```

A URL gerada: `/busca?cidade=santos-sp&lat=-23.96&lon=-46.33`

**Preservação de params:** `handleLocationSelect` usa `new URLSearchParams(window.location.search)` para fazer merge com params existentes (`?map=1`, `?serie=...`), evitando resetar o modo mapa.

---

## 33. Guia de Reprodução Zero-to-Production

### Passo 1: Criar projeto Next.js

```bash
npx create-next-app@latest mensalidadejusta --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd mensalidadejusta
```

### Passo 2: Instalar dependências

```bash
npm install @supabase/supabase-js @supabase/ssr @tailwindcss/postcss autoprefixer csv-parse dotenv framer-motion leaflet leaflet.markercluster lucide-react next-themes pg postcss react-leaflet tailwindcss
npm install -D @types/node @types/react typescript
```

### Passo 3: Configurar arquivos base

Copiar: `next.config.ts`, `postcss.config.cjs`, `tsconfig.json`, `globals.css`

### Passo 4: Configurar Supabase

1. Criar projeto em `supabase.com`
2. Executar migrations em ordem: 001 → 002 → 003 → 004 → 006 → 007
3. Copiar URL e anon key para `.env.local`

### Passo 5: Importar dados

```bash
npm run import
```

### Passo 6: Copiar todos os arquivos `src/`

Manter estrutura de diretórios idêntica.

### Passo 7: Build e teste

```bash
npm run build
npm run start
```

### Passo 8: Deploy (Vercel)

1. Conectar repositório GitHub à Vercel
2. Configurar env vars no dashboard da Vercel
3. Deploy automático em cada push para `main`

---

> **Fim do documento. Uma IA lendo isto deve ser capaz de reproduzir o projeto completo.**
