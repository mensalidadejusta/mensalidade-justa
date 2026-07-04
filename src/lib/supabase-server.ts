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
