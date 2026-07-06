import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot: se campo escondido foi preenchido, é robô
    if (body.honeypot) {
      // Responde sucesso falsamente para não alertar o bot
      return NextResponse.json({ success: true });
    }

    const {
      escola_id,
      serie_slug,
      serie_nome,
      valor_mensalidade,
      valor_matricula,
      valor_material,
    } = body;

    if (!escola_id || !serie_slug || !serie_nome) {
      return NextResponse.json(
        { error: "Campos obrigatórios faltando." },
        { status: 400 }
      );
    }

    if (
      valor_mensalidade != null &&
      (valor_mensalidade < 100 || valor_mensalidade > 15000)
    ) {
      return NextResponse.json(
        { error: "Valor da mensalidade deve estar entre R$ 100 e R$ 15.000." },
        { status: 422 }
      );
    }

    const anoVigencia =
      new Date().getFullYear() + (new Date().getMonth() >= 6 ? 1 : 0);

    const { error } = await supabase.from("mensalidades_series").insert({
      escola_id,
      serie_slug,
      serie_nome,
      user_id: null,
      valor_mensalidade: valor_mensalidade ?? null,
      valor_matricula: valor_matricula ?? null,
      valor_material: valor_material ?? null,
      ano_vigencia: anoVigencia,
    });

    if (error) {
      console.error("Erro ao salvar contribuição:", error);
      return NextResponse.json(
        { error: "Erro interno ao salvar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erro na API contribuir:", err);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
