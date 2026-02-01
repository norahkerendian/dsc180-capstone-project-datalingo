import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  const body = await req.json();

  const lessonId = Number(body.lessonId);
  const questionId = Number(body.questionId);
  const choiceId = Number(body.choiceId);
  const userId = String(body.userId || "");
  const timeSpentSeconds = Number(body.timeSpentSeconds || 0);

  if (!userId || !Number.isFinite(lessonId) || !Number.isFinite(questionId) || !Number.isFinite(choiceId)) {
    return NextResponse.json({ error: "Missing/invalid fields" }, { status: 400 });
  }

  // Determine correctness from DB
  const { data: choiceRow, error: cErr } = await supabase
    .from("question_choices")
    .select("id,is_correct")
    .eq("id", choiceId)
    .eq("question_id", questionId)
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const isCorrect = !!choiceRow?.is_correct;

  // attempt count for this user-question in this lesson
  const { count, error: countErr } = await supabase
    .from("user_responses")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .eq("question_id", questionId);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  const attemptNum = (count ?? 0) + 1;

  const { error: insErr } = await supabase.from("user_responses").insert({
    lesson_id: lessonId,
    user_id: userId,
    question_id: questionId,
    choice_id: choiceId,
    is_correct: isCorrect,
    attempt_num: attemptNum,
    time_spent_seconds: timeSpentSeconds,
  });

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ isCorrect, attemptNum });
}