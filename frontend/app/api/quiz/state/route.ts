import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lessonId = Number(searchParams.get("lessonId"));
  const userId = searchParams.get("userId") || "";

  if (!Number.isFinite(lessonId) || !userId) {
    return NextResponse.json({ error: "Missing/invalid lessonId or userId" }, { status: 400 });
  }

  // ordered question list for this lesson
  const { data: lq, error: lqErr } = await supabase
    .from("lesson_questions")
    .select("question_id,position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });

  if (lqErr) return NextResponse.json({ error: lqErr.message }, { status: 500 });

  const questionIds = (lq ?? []).map((r) => r.question_id);
  const total = questionIds.length;

  if (total === 0) {
    return NextResponse.json({ total: 0, correctCount: 0, nextIndex: 0, completed: false });
  }

  // which questions are correct for this user in this lesson
  const { data: correctRows, error: cErr } = await supabase
    .from("user_responses")
    .select("question_id")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .eq("is_correct", true);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const correctSet = new Set((correctRows ?? []).map((r) => r.question_id));

  let nextIndex = 0;
  for (let i = 0; i < questionIds.length; i++) {
    if (!correctSet.has(questionIds[i])) {
      nextIndex = i;
      break;
    }
    nextIndex = i + 1;
  }

  const correctCount = correctSet.size;
  const completed = correctCount >= total;

  return NextResponse.json({ total, correctCount, nextIndex, completed });
}