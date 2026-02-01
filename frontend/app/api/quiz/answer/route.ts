import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars: SUPABASE_URL and key");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST /api/quiz/answer body:", body);

    const lessonId = Number(body.lessonId);
    const questionId = Number(body.questionId);
    const choiceId = Number(body.choiceId);
    const userId = typeof body.userId === "string" ? body.userId : "";
    const timeSpentSeconds = Number(body.timeSpentSeconds || 0);

    if (
      !userId ||
      !Number.isFinite(lessonId) ||
      !Number.isFinite(questionId) ||
      !Number.isFinite(choiceId)
    ) {
      return NextResponse.json(
        { error: "Missing/invalid fields" },
        { status: 400 },
      );
    }

    // Determine correctness from DB
    const { data: choiceRow, error: cErr } = await supabase
      .from("question_choices")
      .select("id,is_correct")
      .eq("id", choiceId)
      .eq("question_id", questionId)
      .maybeSingle(); // important: does NOT throw error when 0 rows

    if (cErr) {
      const msg = cErr.message || "Supabase error";
      const status = msg.toLowerCase().includes("permission") ? 403 : 500;

      console.error("choice lookup error:", cErr);
      return NextResponse.json({ error: msg }, { status });
    }

    if (!choiceRow) {
      // choiceId doesn't belong to questionId (or doesn't exist)
      return NextResponse.json(
        { error: "Invalid choice for this question" },
        { status: 404 },
      );
    }

    const isCorrect = !!choiceRow.is_correct;

    // attempt count for this user-question in this lesson
    const { count, error: countErr } = await supabase
      .from("user_responses")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .eq("question_id", questionId);

    if (countErr) {
      const msg = countErr.message || "Supabase error";
      const status = msg.toLowerCase().includes("permission") ? 403 : 500;

      console.error("count error:", countErr);
      return NextResponse.json({ error: msg }, { status });
    }

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

    if (insErr) {
      const msg = insErr.message || "Supabase error";
      const status = msg.toLowerCase().includes("permission") ? 403 : 500;

      console.error("insert error:", insErr);
      return NextResponse.json({ error: msg }, { status });
    }

    return NextResponse.json({ isCorrect, attemptNum });
  } catch (err: any) {
    console.error("Route crash:", err);
    return NextResponse.json(
      { error: "Route crashed", details: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}
