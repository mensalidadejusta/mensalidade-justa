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

### Migrations

Em `supabase/migrations/`. Extensões necessárias: `postgis`, `pg_trgm`. Ordem importa: criar extensões ANTES dos índices que as usam.

## MCP

Supabase MCP configurado globalmente em `~/.config/opencode/opencode.json` (OAuth já autenticado). Tools disponíveis: `execute_sql`, `list_tables`, etc.

## CSV original

`Análise - Tabela da lista das escolas - Detalhado.csv` (~82 MB, 19 colunas, 212.386 linhas, encoding UTF-8). Fonte: INEP.

## Segurança

- `.env` contém service_role key com acesso total ao banco — **nunca commitar**.
- Criar `.gitignore` na init se não existir: `.env`, `node_modules/`, `*.csv`.
