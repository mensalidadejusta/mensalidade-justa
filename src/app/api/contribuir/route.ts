import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("API contribuir: env vars ausentes");
      return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json();

    // Honeypot: se campo escondido foi preenchido, é robô
    if (body.honeypot) {
      return NextResponse.json({ success: true });
    }

    const {
      escola_id,
      serie_slug,
      serie_nome,
      user_id,
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
      user_id: user_id || null,
      valor_mensalidade: valor_mensalidade ?? null,
      valor_matricula: valor_matricula ?? null,
      valor_material: valor_material ?? null,
      ano_vigencia: anoVigencia,
    });

    if (error) {
      console.error("Erro ao salvar contribuição:", JSON.stringify(error));
      return NextResponse.json(
        { error: "Erro ao salvar: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro na API contribuir:", err?.message || err);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
