// "use client";

// import Link from "next/link";
// import ReactMarkdown from "react-markdown";
// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";
// import { supabase } from "@/lib/supabaseClient";

// type Lesson = {
//   id: number;
//   title: string;
//   topic: string;
//   level: number;
//   content_md?: string | null;
//   unmodified_content_md?: string | null;
// };

// export default function LessonDetailPage() {
//   const params = useParams();
//   const router = useRouter();

//   const lessonIdRaw = params?.lessonId;
//   const lessonIdStr = Array.isArray(lessonIdRaw) ? lessonIdRaw[0] : lessonIdRaw;
//   const lessonId = useMemo(() => {
//     const n = Number(lessonIdStr);
//     return Number.isFinite(n) ? n : null;
//   }, [lessonIdStr]);

//   const [lesson, setLesson] = useState<Lesson | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [stateLoading, setStateLoading] = useState(true);
//   const [resume, setResume] = useState<{ nextIndex: number; completed: boolean } | null>(null);
//   const [err, setErr] = useState<string | null>(null);

//   useEffect(() => {
//     if (lessonId === null) return;

//     setLoading(true);
//     setErr(null);

//     fetch(`/api/lesson?lessonId=${lessonId}`)
//       .then(async (r) => {
//         if (!r.ok) throw new Error(await r.text());
//         return r.json();
//       })
//       .then((data) => setLesson(data.lesson))
//       .catch((e) => setErr(e.message ?? "Failed to load lesson"))
//       .finally(() => setLoading(false));
//   }, [lessonId]);

//   useEffect(() => {
//     async function loadState() {
//       if (lessonId === null) return;
//       setStateLoading(true);

//       const { data } = await supabase.auth.getUser();
//       const userId = data.user?.id;

//       if (!userId) {
//         router.replace("/"); // must login
//         return;
//       }

//       const r = await fetch(`/api/quiz/state?lessonId=${lessonId}&userId=${userId}`);
//       const json = await r.json();
//       setResume({ nextIndex: json.nextIndex ?? 0, completed: !!json.completed });
//       setStateLoading(false);
//     }
//     loadState();
//   }, [lessonId, router]);

//   if (lessonId === null) return <div className="p-10">Invalid lesson id</div>;

//   return (
//     <div className="min-h-screen px-6 py-10">
//       <div className="mx-auto max-w-3xl space-y-6">
//         <Link href="../" className="underline text-sm text-gray-600">
//         ← Back to Titles
//         </Link>

//         {loading && <p className="text-gray-600">Loading lesson…</p>}
//         {err && <p className="text-red-600">Error: {err}</p>}

//         {lesson && (
//           <>
//             <div className="space-y-1">
//               <h1 className="text-3xl font-bold">{lesson.title}</h1>
//               <p className="text-gray-600">
//                 Level {lesson.level} · {lesson.topic}
//               </p>
//             </div>

//             <div className="rounded-2xl border p-6 prose max-w-none">
//               <ReactMarkdown>
//                 {lesson.content_md || lesson.unmodified_content_md || "No content found."}
//               </ReactMarkdown>
//             </div>

//             <div className="flex items-center gap-3">
//               <button
//                 disabled={stateLoading}
//                 onClick={() => router.push(`/quiz/${lesson.id}`)}
//                 className="rounded-xl bg-black text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
//               >
//                 {resume?.completed ? "Review Quiz" : resume?.nextIndex ? "Resume Quiz" : "Start Quiz"}
//               </button>

//               <span className="text-sm text-gray-600">
//                 {stateLoading
//                   ? "Checking progress…"
//                   : resume?.completed
//                   ? "You completed this lesson. You can review."
//                   : "Your progress is saved automatically."}
//               </span>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

///////////////////////// Fixes back to title button /////////////////////////////////////

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

  const level = Array.isArray(levelRaw) ? levelRaw[0] : levelRaw;
  const topic = Array.isArray(topicRaw) ? topicRaw[0] : topicRaw;
  const lessonIdStr = Array.isArray(lessonIdRaw) ? lessonIdRaw[0] : lessonIdRaw;

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

  // ---- Load lesson content ----
  useEffect(() => {
    if (lessonId === null) return;

    setLoading(true);
    setErr(null);

    fetch(`/api/lesson?lessonId=${lessonId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setLesson(data.lesson))
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
        router.replace("/"); // force login
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
    return <div className="p-10">Invalid lesson id</div>;
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* ✅ CORRECT BACK LINK (NO 404) */}
        <Link
          href={`/levels/${level}/topics/${encodeURIComponent(topic ?? "")}`}
          className="underline text-sm text-gray-600"
        >
          ← Back to Titles
        </Link>

        {loading && <p className="text-gray-600">Loading lesson…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}

        {lesson && (
          <>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{lesson.title}</h1>
              <p className="text-gray-600">
                Level {lesson.level} · {lesson.topic}
              </p>
            </div>

            <div className="rounded-2xl border p-6 prose max-w-none">
              <ReactMarkdown>
                {lesson.content_md ||
                  lesson.unmodified_content_md ||
                  "No content found."}
              </ReactMarkdown>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={stateLoading}
                onClick={() => router.push(`/quiz/${lesson.id}`)}
                className="rounded-xl bg-black text-white px-5 py-3 font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {resume?.completed
                  ? "Review Quiz"
                  : resume?.nextIndex
                  ? "Resume Quiz"
                  : "Start Quiz"}
              </button>

              <span className="text-sm text-gray-600">
                {stateLoading
                  ? "Checking progress…"
                  : resume?.completed
                  ? "You completed this lesson. You can review."
                  : "Your progress is saved automatically."}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}