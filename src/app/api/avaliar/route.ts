import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CRITERIOS = [
  "nota_infraestrutura", "nota_seguranca", "nota_pedagogico",
  "nota_acolhimento", "nota_cursos_extras", "nota_diversidade", "nota_inclusao",
];

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Erro de configuração do servidor." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await request.json();
    const { escola_id, user_id, comentario, ...notas } = body;

    if (!escola_id || typeof escola_id !== "number") {
      return NextResponse.json({ error: "ID da escola é obrigatório." }, { status: 400 });
    }

    for (const criterio of CRITERIOS) {
      const val = notas[criterio];
      if (val != null) {
        const num = Number(val);
        if (!Number.isInteger(num) || num < 1 || num > 5) {
          return NextResponse.json({ error: `${criterio} deve ser um número entre 1 e 5.` }, { status: 400 });
        }
      }
    }

    if (comentario && comentario.length > 1000) {
      return NextResponse.json({ error: "Comentário deve ter no máximo 1000 caracteres." }, { status: 400 });
    }

    const insertData: Record<string, any> = { escola_id, comentario: comentario || null, user_id: user_id || null };
    for (const c of CRITERIOS) {
      if (notas[c] != null) insertData[c] = Number(notas[c]);
    }

    const { error } = await supabase.from("avaliacoes").insert(insertData);

    if (error) {
      console.error("Erro ao inserir avaliação:", error);
      return NextResponse.json({ error: "Erro ao salvar avaliação." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
