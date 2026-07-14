import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/busca";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("C\u00f3digo de autentica\u00e7\u00e3o ausente")}`);
  }

  const res = NextResponse.redirect(`${origin}${next}`);
  const supabase = createRouteHandlerClient(request, res);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Erro no exchangeCodeForSession:", error.message);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return res;
}
