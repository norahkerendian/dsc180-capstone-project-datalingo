"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Choice = { id: number; choice_text: string };
type Question = { id: number; question: string; category: string | null; difficulty: number | null };

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();

  const lessonIdRaw = params?.lessonId;
  const lessonIdStr = Array.isArray(lessonIdRaw) ? lessonIdRaw[0] : lessonIdRaw;
  const lessonId = useMemo(() => {
    const n = Number(lessonIdStr);
    return Number.isFinite(n) ? n : null;
  }, [lessonIdStr]);

  const [userId, setUserId] = useState<string | null>(null);

  const [total, setTotal] = useState(0);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  // auth required
  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        router.replace("/");
        return;
      }
      setUserId(uid);
    }
    init();
  }, [router]);

  // load resume state
  useEffect(() => {
    async function loadState() {
      if (lessonId === null || !userId) return;
      const r = await fetch(`/api/quiz/state?lessonId=${lessonId}&userId=${userId}`);
      const json = await r.json();
      setIndex(json.nextIndex ?? 0);
    }
    loadState();
  }, [lessonId, userId]);

  // load question at index
  useEffect(() => {
    async function loadQ() {
      if (lessonId === null) return;
      setLoading(true);
      setStatus("idle");
      setSelected(null);

      const r = await fetch(`/api/quiz/question?lessonId=${lessonId}&index=${index}`);
      const json = await r.json();

      if (!r.ok) {
        setQuestion(null);
        setChoices([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setTotal(json.total ?? 0);
      setQuestion(json.question);
      setChoices(json.choices ?? []);
      startTimeRef.current = Date.now();
      setLoading(false);
    }
    loadQ();
  }, [lessonId, index]);

  if (lessonId === null) return <div className="p-10">Invalid lesson id</div>;

  async function submit() {
    if (!userId || !question || selected === null) return;

    setSubmitting(true);

    const timeSpentSeconds = Math.max(0, Math.round((Date.now() - startTimeRef.current) / 1000));

    const r = await fetch("/api/quiz/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId,
        userId,
        questionId: question.id,
        choiceId: selected,
        timeSpentSeconds,
      }),
    });

    const json = await r.json();
    if (r.ok) setStatus(json.isCorrect ? "correct" : "wrong");
    setSubmitting(false);
  }

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <button className="underline text-sm text-gray-600" onClick={() => router.back()}>
            ← Back
          </button>
          <div className="text-sm text-gray-600">
            Question {total === 0 ? 0 : index + 1} / {total}
          </div>
        </div>

        {loading && <p className="text-gray-600">Loading question…</p>}

        {!loading && question && (
          <div className="rounded-2xl border p-6 space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold">{question.question}</h1>
              <p className="text-sm text-gray-600">
                {question.category ? `Category: ${question.category}` : ""}{" "}
                {question.difficulty != null ? `· Difficulty: ${question.difficulty}` : ""}
              </p>
            </div>

            <div className="grid gap-3">
              {choices.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={[
                    "text-left rounded-xl border p-4 transition",
                    selected === c.id ? "border-black bg-gray-50" : "hover:bg-gray-50",
                  ].join(" ")}
                >
                  {c.choice_text}
                </button>
              ))}
            </div>

            {status === "wrong" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                Not quite — try again. (We keep attempts for analytics.)
              </div>
            )}
            {status === "correct" && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">
                Correct ✅ You can move on.
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={!canPrev}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-xl border px-4 py-2 disabled:opacity-40"
              >
                ← Previous
              </button>

              {status === "correct" ? (
                <button
                  disabled={!canNext}
                  onClick={() => setIndex((i) => i + 1)}
                  className="rounded-xl bg-black text-white px-5 py-2 font-semibold disabled:opacity-40"
                >
                  Next →
                </button>
              ) : (
                <button
                  disabled={selected === null || submitting}
                  onClick={submit}
                  className="rounded-xl bg-black text-white px-5 py-2 font-semibold disabled:opacity-40"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !question && (
          <p className="text-gray-600">
            No questions found for this lesson yet. (Check `lesson_questions` mapping.)
          </p>
        )}
      </div>
    </div>
  );
}