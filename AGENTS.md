# Mensalidade Justa

Documentação completa e super detalhada em [`DOCUMENTACAO_PROJETO.md`](./DOCUMENTACAO_PROJETO.md).

Leia aquele arquivo primeiro — ele contém TUDO sobre o projeto: stack, banco, rotas, componentes, fluxos, bugs conhecidos, workarounds, etc.

Resumo executivo abaixo:

## Stack

- Node.js (ESM), Next.js 16 (App Router, Turbopack), Tailwind CSS v4
- Supabase (PostgreSQL + PostGIS) via REST API (`@supabase/supabase-js` + `@supabase/ssr`)
- Leaflet (mapas), lucide-react (ícones), framer-motion (animações)
- `next-themes` para alternar tema claro/escuro (`defaultTheme="dark"`, `enableSystem={false}`)

## ⚠️ Turbopack + Tailwind v4: bug crítico

**Nunca use** `text-[var(--color-text)]`, `bg-[var(--color-surface)]` em className.
Use os utilitários do tema: `text-text`, `bg-surface`, `border-border`.

`npm run dev` (Turbopack) frequentemente falha.
**Para testar localmente:** `npm run build && npm run start`.

## Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server (Turbopack — pode falhar) |
| `npm run build` | Build produção |
| `npm run start` | Servidor produção |
| `npm run lint` | `next lint` |
| `npm run import` | Importa CSV (via Supabase REST upsert) |
| `npm run migrate [arquivo]` | Migration SQL via `pg` (workaround IPv6) |

## Windows quirks

- `Remove-Item -Recurse -Force .next` pode falhar com EPERM/EBUSY
- Acentos em JSX: usar `{'\u00e7'}` (escape). PowerShell 5.1 corrompe UTF-8.

---

> **Para qualquer IA: leia `DOCUMENTACAO_PROJETO.md` do início ao fim antes de responder ou modificar algo.**
