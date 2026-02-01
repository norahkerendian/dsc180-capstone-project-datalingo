import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lessonId = Number(searchParams.get("lessonId"));
  const index = Number(searchParams.get("index"));

  if (!Number.isFinite(lessonId) || !Number.isFinite(index)) {
    return NextResponse.json({ error: "Invalid lessonId/index" }, { status: 400 });
  }

  const { data: lq, error: lqErr } = await supabase
    .from("lesson_questions")
    .select("question_id,position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });

  if (lqErr) return NextResponse.json({ error: lqErr.message }, { status: 500 });

  const rows = lq ?? [];
  if (index < 0 || index >= rows.length) {
    return NextResponse.json({ error: "Index out of range" }, { status: 400 });
  }

  const questionId = rows[index].question_id;

  const { data: q, error: qErr } = await supabase
    .from("questions")
    .select("id,question,category,difficulty")
    .eq("id", questionId)
    .single();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const { data: choices, error: chErr } = await supabase
    .from("question_choices")
    .select("id,choice_text")
    .eq("question_id", questionId)
    .order("id", { ascending: true });

  if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

  return NextResponse.json({
    total: rows.length,
    index,
    question: q,
    choices: choices ?? [],
  });
}