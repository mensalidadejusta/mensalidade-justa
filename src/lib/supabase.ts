import { createBrowserClient } from "@supabase/ssr";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        secure: process.env.NODE_ENV !== "development",
      },
    }
  );
}

/** Para uso em Server Components (SSG/SSR) — não depende de cookies/navegador */
export function createServerClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Para uso em Route Handlers (API routes) — lê cookies da requisição e escreve na resposta */
export function createRouteHandlerClient(req: Request, res: Response) {
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookie = req.headers.get("cookie") ?? "";
          if (!cookie) return [];
          return cookie.split("; ").filter(Boolean).map((c) => {
            const eq = c.indexOf("=");
            if (eq === -1) return { name: c.trim(), value: "" };
            return { name: c.slice(0, eq).trim(), value: c.slice(eq + 1) };
          });
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const isDev = process.env.NODE_ENV === "development";
            const secure = isDev ? false : options?.secure ?? true;
            const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
            if (options?.path) parts.push(`Path=${options.path}`);
            if (options?.maxAge != null) parts.push(`Max-Age=${options.maxAge}`);
            if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`);
            if (secure) parts.push("Secure");
            if (options?.httpOnly) parts.push("HttpOnly");
            res.headers.append("Set-Cookie", parts.join("; "));
          });
          if (cacheHeaders) {
            Object.entries(cacheHeaders).forEach(([key, value]) => {
              res.headers.set(key, value);
            });
          }
        },
      },
    }
  );
}
