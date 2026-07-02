# Mensalidade Justa

App para buscar escolas e consultar mensalidades.

## Stack

- Node.js (ESM), Supabase (PostgreSQL + PostGIS), MCP
- `@supabase/supabase-js` para acesso via REST API (HTTPS)

## Banco de dados (Supabase)

**Projeto:** `ijfwdtemkkoiombxtyip` — `https://ijfwdtemkkoiombxtyip.supabase.co`

**Service role key** está em `.env` (NUNCA versionar).

### Tabelas

- `escolas` (212.386 registros importados do INEP)
  - `codigo_inep` (UNIQUE), `nome`, `uf`, `municipio`, `bairro`, `endereco`, `telefone`, `localizacao`, `dependencia_administrativa` (Municipal/Estadual/Privada/Federal), `categoria_administrativa` (Pública/Privada), `latitude`, `longitude`, `geom` (PostGIS Point 4326), `restricao_atendimento`
  - 158.182 com geom, 54.204 sem coordenadas
  - RLS: leitura pública, sem insert público
  - Índices: nome (GIN trgm), uf, municipio, dependencia, geom (GIST)
- `mensalidades` (vazia, pronta para uso)
  - FK `escola_id` → `escolas.id` CASCADE
  - `valor_mensalidade`, `valor_matricula`, `valor_material_didatico`, `valor_alimentacao`, `etapa_ensino`, `turno`, `ano_referencia`
  - RLS: leitura pública, insert apenas authenticated
  - `user_id` vinculado a `auth.users` para rastreio de contribuições

### Conexão

Conexão direta PostgreSQL via `pg` não funciona desta rede (host só tem IPv6, rede não roteia IPv6). Usar **sempre** `@supabase/supabase-js` via REST API (HTTPS).

```js
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
```

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor Next.js de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run import` | Importa CSV para `escolas` via REST API (upsert por codigo_inep) |

### Novidades

- `get_ufs()` — retorna UFs distintas
- `get_cidades(text)` — retorna cidades distintas de uma UF
- `escolas_perto_de_mim(lat, lon, raio_km)` — escolas num raio usando PostGIS
- `get_top_cidades(uf, limit)` — cidades com mais escolas de uma UF
- Tabela `profiles` vinculada a `auth.users` com endereço e geolocalização
- Trigger `on_auth_user_created` cria profile automaticamente

### Management API

Token de acesso (sbp_...) está em `.env` como `SUPABASE_MGMT_TOKEN`.
Endpoint: `https://api.supabase.com/v1/projects/{ref}/database/query`
Usado para executar SQL de migrations sem depender do SQL Editor.

### Migrations

Em `supabase/migrations/`. Extensões necessárias: `postgis`, `pg_trgm`. Ordem importa: criar extensões ANTES dos índices que as usam.

**Para executar uma migration via script:**
```js
const res = await fetch(
  `https://api.supabase.com/v1/projects/${ref}/database/query`,
  { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlStatement }) }
)
```

## MCP

Supabase MCP configurado globalmente em `~/.config/opencode/opencode.json` (OAuth já autenticado). Tools disponíveis: `execute_sql`, `list_tables`, etc.

## CSV original

`Análise - Tabela da lista das escolas - Detalhado.csv` (~82 MB, 19 colunas, 212.386 linhas, encoding UTF-8). Fonte: INEP.

## Segurança

- `.env` contém service_role key com acesso total ao banco — **nunca commitar**.
- Criar `.gitignore` na init se não existir: `.env`, `node_modules/`, `*.csv`.
