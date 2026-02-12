//////////////////////////////////// Include citation at bottom///////////////////////
"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Lesson = {
  id: number;
  title: string;
  topic: string;
  level: number;
  content_md?: string | null;
  unmodified_content_md?: string | null;
};

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();

  // ---- URL params (SAFE parsing) ----
  const levelRaw = params?.level;
  const topicRaw = params?.topic;
  const lessonIdRaw = params?.lessonId;

  const levelStr = Array.isArray(levelRaw) ? levelRaw[0] : levelRaw;
  const topicStr = Array.isArray(topicRaw) ? topicRaw[0] : topicRaw;
  const lessonIdStr = Array.isArray(lessonIdRaw) ? lessonIdRaw[0] : lessonIdRaw;

  const levelNum = useMemo(() => {
    const n = Number(levelStr);
    return Number.isFinite(n) ? n : null;
  }, [levelStr]);

  // IMPORTANT: decode topic once so we don't double-encode later
  const topicDecoded = useMemo(() => {
    if (!topicStr) return "";
    try {
      return decodeURIComponent(topicStr);
    } catch {
      return String(topicStr);
    }
  }, [topicStr]);

  const lessonId = useMemo(() => {
    const n = Number(lessonIdStr);
    return Number.isFinite(n) ? n : null;
  }, [lessonIdStr]);

  // ---- State ----
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [stateLoading, setStateLoading] = useState(true);
  const [resume, setResume] = useState<{ nextIndex: number; completed: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // ---- Load lesson content ----
  useEffect(() => {
    if (lessonId === null) return;

    setLoading(true);
    setErr(null);
    setIsVisible(false);

    fetch(`/api/lesson?lessonId=${lessonId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => {
        setLesson(data.lesson);
        setTimeout(() => setIsVisible(true), 50);
      })
      .catch((e) => setErr(e.message ?? "Failed to load lesson"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  // ---- Load quiz progress (auth required) ----
  useEffect(() => {
    async function loadState() {
      if (lessonId === null) return;

      setStateLoading(true);

      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;

      if (!userId) {
        router.replace("/");
        return;
      }

      const r = await fetch(`/api/quiz/state?lessonId=${lessonId}&userId=${userId}`);
      const json = await r.json();

      setResume({
        nextIndex: json.nextIndex ?? 0,
        completed: !!json.completed,
      });

      setStateLoading(false);
    }

    loadState();
  }, [lessonId, router]);

  if (lessonId === null) {
    return (
      <div className="bg-gradient-to-b from-green-50 to-blue-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-[80px] min-h-[calc(100vh+80px)] pt-[80px] p-10">
        <h1 className="text-2xl font-semibold">Invalid lesson id</h1>
      </div>
    );
  }

  const backToTitlesHref =
    levelNum !== null && topicDecoded
      ? `/levels/${levelNum}/topics/${encodeURIComponent(topicDecoded)}`
      : "/levels";

  return (
    <div className="bg-gradient-to-b from-green-50 to-blue-50 -mx-4 sm:-mx-6 lg:-mx-8 -mt-[80px] min-h-[calc(100vh+80px)] pt-[80px]">
      <div
        className={`mx-auto max-w-4xl px-8 py-10 transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {loading && <p className="text-gray-600">Loading lesson…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}

        {lesson && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <span
                className="inline-block rounded-lg border-2 px-3 py-1 text-sm font-semibold"
                style={{
                  borderColor:
                    lesson.level === 1
                      ? "#c38e70"
                      : lesson.level === 2
                      ? "#b07d62"
                      : lesson.level === 3
                      ? "#9d6b53"
                      : lesson.level === 4
                      ? "#8a5a44"
                      : "#774936",
                  color:
                    lesson.level === 1
                      ? "#c38e70"
                      : lesson.level === 2
                      ? "#b07d62"
                      : lesson.level === 3
                      ? "#9d6b53"
                      : lesson.level === 4
                      ? "#8a5a44"
                      : "#774936",
                }}
              >
                Level {lesson.level}
              </span>
              <span
                className="font-medium italic"
                style={{
                  color:
                    lesson.level === 1
                      ? "#c38e70"
                      : lesson.level === 2
                      ? "#b07d62"
                      : lesson.level === 3
                      ? "#9d6b53"
                      : lesson.level === 4
                      ? "#8a5a44"
                      : "#774936",
                }}
              >
                {lesson.topic}
              </span>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-black text-gray-800">{lesson.title}</h1>
              </div>
              <Link
                href={backToTitlesHref}
                className="text-sm text-gray-600 hover:text-gray-800 underline transition-colors duration-200"
              >
                ← Back to Titles
              </Link>
            </div>

            <div className="space-y-6">
              <div
                className={`rounded-2xl border-2 border-green-200 bg-white p-6 prose max-w-none transition-all duration-500 ${
                  isVisible ? "fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: "100ms" }}
              >
                <ReactMarkdown>
                  {lesson.unmodified_content_md || lesson.content_md || "No content found."}
                </ReactMarkdown>
              </div>

              <div
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isVisible ? "fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: "200ms" }}
              >
                <button
                  disabled={stateLoading}
                  onClick={() => router.push(`/quiz/${lesson.id}`)}
                  className="rounded-xl bg-green-600 text-white px-6 py-3 font-semibold hover:bg-green-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {resume?.completed ? "Review Quiz" : resume?.nextIndex ? "Resume Quiz" : "Start Quiz"}
                </button>

                <span className="text-sm text-gray-600">
                  {stateLoading
                    ? "Checking progress…"
                    : resume?.completed
                    ? "You completed this lesson. You can review."
                    : "Your progress is saved automatically."}
                </span>
              </div>

              {/* Citation Footer */}
              <div
                className={`mt-8 pt-6 border-t-2 border-green-100 transition-all duration-500 ${
                  isVisible ? "fade-in-up" : "opacity-0"
                }`}
                style={{ animationDelay: "300ms" }}
              >
                <p className="text-sm text-gray-600 text-center">
                  Lesson content sourced from{" "}
                  <a
                    href="https://www.data8.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors"
                  >
                    UC Berkeley&apos;s DATA 8: Foundations of Data Science
                  </a>
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}