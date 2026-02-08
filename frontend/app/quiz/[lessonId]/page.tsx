"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import TutorChatWidget from "@/app/components/TutorChatWidget";

type Choice = { id: number; choice_text: string };
type Question = {
  id: number;
  question: string;
  category: string | null;
  difficulty: number | null;
};

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
  const [isVisible, setIsVisible] = useState(false);
  const [wrongChoiceId, setWrongChoiceId] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [lessonInfo, setLessonInfo] = useState<{
    level: number;
    topic: string;
  } | null>(null);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

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

  // Load lesson info for back navigation
  useEffect(() => {
    async function loadLessonInfo() {
      if (lessonId === null) return;
      try {
        const r = await fetch(`/api/lesson?lessonId=${lessonId}`);
        const json = await r.json();
        if (r.ok && json.lesson) {
          setLessonInfo({
            level: json.lesson.level,
            topic: json.lesson.topic,
          });
        }
      } catch (e) {
        // Ignore errors
      }
    }
    loadLessonInfo();
  }, [lessonId]);

  // load resume state
  useEffect(() => {
    async function loadState() {
      if (lessonId === null || !userId) return;
      const r = await fetch(
        `/api/quiz/state?lessonId=${lessonId}&userId=${userId}`,
      );
      const json = await r.json();
      setIndex(json.nextIndex ?? 0);
      setIsComplete(json.completed ?? false);
    }
    loadState();
  }, [lessonId, userId]);

  // load question at index
  useEffect(() => {
    async function loadQ() {
      if (lessonId === null) return;

      // Don't reload if we're on the last question and quiz is complete
      // This prevents clearing the question display when confetti plays
      if (isComplete && total > 0 && index === total - 1) {
        // Keep the current question visible and preserve status
        // Don't reset status, selected, or question state
        setIsVisible(true);
        return;
      }

      // Don't load if we're past the last question and quiz is complete
      if (isComplete && index >= total) {
        return;
      }

      // Only reset state if we're actually loading a new question
      setLoading(true);
      setStatus("idle");
      setSelected(null);
      setWrongChoiceId(null);
      setIsVisible(false);

      const r = await fetch(
        `/api/quiz/question?lessonId=${lessonId}&index=${index}`,
      );
      const json = await r.json();

      if (!r.ok) {
        setQuestion(null);
        setChoices([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setTotal(json.total ?? 0);

      // Only load question if index is valid
      if (index < (json.total ?? 0)) {
        setQuestion(json.question);
        setChoices(json.choices ?? []);
        startTimeRef.current = Date.now();
      }

      setLoading(false);
      // Trigger fade-in animation after a brief delay
      setTimeout(() => setIsVisible(true), 50);
    }
    loadQ();
  }, [lessonId, index, isComplete, total]);

  if (lessonId === null) {
    return (
      <div className="bg-gradient-to-b from-green-50 to-blue-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-[80px] min-h-[calc(100vh+80px)] pt-[80px] p-10">
        <h1 className="text-2xl font-semibold">Invalid lesson id</h1>
      </div>
    );
  }

  async function submit() {
    if (!userId || !question || selected === null) return;

    setSubmitting(true);

    const timeSpentSeconds = Math.max(
      0,
      Math.round((Date.now() - startTimeRef.current) / 1000),
    );

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
    if (r.ok) {
      if (json.isCorrect) {
        setStatus("correct");
        setWrongChoiceId(null);

        // Check if this was the last question - if so, quiz is complete
        if (index === total - 1) {
          // Immediately set as complete (don't wait for API check)
          setIsComplete(true);
          // Trigger confetti immediately while question is still visible
          if (!confettiTriggered) {
            setConfettiTriggered(true);
            // Small delay to ensure UI updates first
            setTimeout(() => {
              triggerConfetti();
            }, 100);
          }
        }
      } else {
        setStatus("wrong");
        setWrongChoiceId(selected);
      }
    }
    setSubmitting(false);
  }

  function triggerConfetti() {
    // Enhanced confetti effect with mixed shapes (rectangles and circles)
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
      "#22c55e",
      "#3b82f6",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#ec4899",
      "#10b981",
      "#06b6d4",
    ];
    const confetti: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
      shape: "circle" | "rect";
      width?: number;
      height?: number;
    }> = [];

    for (let i = 0; i < 200; i++) {
      const isRect = Math.random() > 0.5;
      confetti.push({
        x: Math.random() * canvas.width,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: isRect ? "rect" : "circle",
        width: isRect ? Math.random() * 8 + 4 : undefined,
        height: isRect ? Math.random() * 8 + 4 : undefined,
      });
    }

    function animate() {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach((c) => {
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.15; // gravity
        c.rotation += c.rotationSpeed;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;

        if (c.shape === "rect" && c.width && c.height) {
          ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, c.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      const stillFalling = confetti.some((c) => c.y < canvas.height);
      if (stillFalling) {
        requestAnimationFrame(animate);
      } else {
        if (document.body.contains(canvas)) {
          document.body.removeChild(canvas);
        }
      }
    }

    animate();
  }

  const canPrev = index > 0;
  const canNext = index < total - 1;

  return (
    <div className="bg-gradient-to-b from-green-50 to-blue-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-[80px] min-h-[calc(100vh+80px)] pt-[80px]">
      <div
        className={`mx-auto max-w-4xl px-8 py-10 transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <button
            className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors duration-200"
            onClick={() => router.back()}
          >
            ← Back
          </button>
          <div className="text-sm text-gray-600 font-medium">
            Question {total === 0 ? 0 : index + 1} / {total}
          </div>
        </div>

        {/* Progress Bar for this lesson */}
        {!loading && total > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Your Progress</span>
              <span>
                {Math.min(100, Math.round(((index + 1) / total) * 100))}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((index + 1) / total) * 100)}%`,
                }}
              ></div>
            </div>
          </div>
        )}

        {loading && <p className="text-gray-600">Loading question…</p>}

        {!loading && question && (
          <div
            className={`rounded-2xl border-2 border-green-200 bg-white p-6 space-y-4 transition-all duration-500 ${
              isVisible ? "fade-in-up" : "opacity-0"
            }`}
          >
            <div className="space-y-1 pt-3">
              <h1 className="text-2xl font-bold text-gray-800">
                {question.question}
              </h1>
              <div className="flex items-center gap-3 flex-wrap mt-4">
                {question.category && (
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-lg px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: "#E5AA70" }}
                    >
                      Category
                    </span>
                    <span className="text-sm text-black font-medium">
                      {question.category}
                    </span>
                  </div>
                )}
                {question.difficulty != null && (
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-lg px-3 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: "#DE3163" }}
                    >
                      Difficulty
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const difficulty = question.difficulty ?? 0;
                        return (
                          <svg
                            key={star}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill={star <= difficulty ? "#DE3163" : "none"}
                            stroke="#DE3163"
                            strokeWidth={1.5}
                            className="w-4 h-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                            />
                          </svg>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 mt-6">
              {choices.map((c, idx) => {
                const isWrong = wrongChoiceId === c.id && status === "wrong";
                const isSelected = selected === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelected(c.id);
                      // Clear wrong styling when a new choice is selected
                      if (wrongChoiceId !== null) {
                        setWrongChoiceId(null);
                        setStatus("idle");
                      }
                    }}
                    className={[
                      "text-left rounded-xl border-2 p-4 transition-all duration-200",
                      isWrong
                        ? "border-gray-400 bg-gray-300"
                        : isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:bg-gray-50 hover:border-gray-300",
                      isVisible ? "fade-in-up" : "opacity-0",
                    ].join(" ")}
                    style={{
                      animationDelay: `${idx * 50}ms`,
                    }}
                  >
                    {c.choice_text}
                  </button>
                );
              })}
            </div>

            {status === "wrong" && (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-700 font-medium animate-fade-in">
                Not quite — try again. (We keep attempts for analytics.)
              </div>
            )}
            {status === "correct" && (
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-green-700 font-medium animate-fade-in">
                Correct ✅ You can move on.
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={!canPrev}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-xl border-2 border-gray-300 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                ← Previous
              </button>

              {status === "correct" ? (
                isComplete || index === total - 1 ? (
                  <button
                    onClick={() => {
                      if (lessonInfo) {
                        router.push(
                          `/levels/${lessonInfo.level}/topics/${encodeURIComponent(lessonInfo.topic)}`,
                        );
                      } else {
                        router.back();
                      }
                    }}
                    className="rounded-xl bg-green-600 text-white px-6 py-2.5 font-semibold hover:bg-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Back to Lessons
                  </button>
                ) : (
                  <button
                    disabled={!canNext}
                    onClick={() => setIndex((i) => i + 1)}
                    className="rounded-xl bg-green-600 text-white px-6 py-2.5 font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Next →
                  </button>
                )
              ) : (
                <button
                  disabled={selected === null || submitting}
                  onClick={submit}
                  className="rounded-xl bg-green-600 text-white px-6 py-2.5 font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </div>
          </div>
        )}

        {!loading && !question && (
          <p className="text-gray-600">
            No questions found for this lesson yet. (Check `lesson_questions`
            mapping.)
          </p>
        )}
      </div>

      {/* Tutor chat (bottom-right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <TutorChatWidget
          topic={lessonInfo?.topic ?? null}
          level={lessonInfo?.level ?? null}
          questionText={question?.question ?? null}
          choices={choices}
          wrongChoiceId={wrongChoiceId}
        />
      </div>
    </div>
  );
}
