// "use client";

// import { useEffect, useRef, useState } from "react";
// import { supabase } from "@/lib/supabaseClient";

// type Props = {
//   user: any;
// };

// type QuestionRow = {
//   id: number;
//   question: string;
//   answer: string;
// };

// export default function QuizCard({ user }: Props) {
//   const [q, setQ] = useState<QuestionRow | null>(null);
//   const [userAnswer, setUserAnswer] = useState("");
//   const [feedback, setFeedback] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);

//   const startTimeRef = useRef<number>(Date.now());

//   const loadOneQuestion = async () => {
//     setLoading(true);
//     setFeedback(null);
//     setUserAnswer("");

//     const { data, error } = await supabase
//       .from("questions")
//       .select("id,question,answer")
//       .order("id", { ascending: true })
//       .limit(1);

//     if (error) {
//       setFeedback("Failed to load question.");
//       setLoading(false);
//       return;
//     }

//     const first = data?.[0] ?? null;
//     setQ(first);
//     startTimeRef.current = Date.now();
//     setLoading(false);
//   };

//   useEffect(() => {
//     loadOneQuestion();
//   }, []);

//   const submit = async () => {
//     if (!q) return;

//     const timeSpentSeconds = Math.max(
//       1,
//       Math.floor((Date.now() - startTimeRef.current) / 1000)
//     );

//     const isCorrect =
//       userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();

//     setLoading(true);

//     const { error } = await supabase.from("attempts").insert({
//       user_id: user.id,
//       question_id: q.id,
//       is_correct: isCorrect,
//       time_spent_seconds: timeSpentSeconds,
//     });

//     if (error) {
//       setFeedback("Saved attempt failed, check RLS and table columns.");
//       setLoading(false);
//       return;
//     }

//     setFeedback(
//       isCorrect ? "Correct, nice." : `Not quite, correct answer is ${q.answer}`
//     );
//     setLoading(false);
//   };

//   if (loading && !q) {
//     return <div className="text-gray-500">Loading question.</div>;
//   }

//   if (!q) {
//     return <div className="text-gray-500">No questions found.</div>;
//   }

//   return (
//     <div className="border rounded-lg p-4 space-y-4 text-left">
//       <p className="font-semibold">Practice question</p>
//       <p className="text-lg">{q.question}</p>

//       <input
//         className="border rounded px-3 py-2 w-full"
//         placeholder="Type your answer"
//         value={userAnswer}
//         onChange={(e) => setUserAnswer(e.target.value)}
//       />

//       <div className="flex gap-2">
//         <button
//           onClick={submit}
//           disabled={loading}
//           className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
//         >
//           Submit
//         </button>
//         <button
//           onClick={loadOneQuestion}
//           disabled={loading}
//           className="px-4 py-2 rounded bg-gray-200 disabled:opacity-60"
//         >
//           Reload
//         </button>
//       </div>

//       {feedback && <p className="text-sm">{feedback}</p>}
//     </div>
//   );
// }
////////////////////////////////
// "use client";

// import { useEffect, useRef, useState } from "react";
// import { supabase } from "@/lib/supabaseClient";

// type Props = {
//   user: any;
// };

// type QuestionRow = {
//   id: number;
//   question: string;
//   answer: string;
// };

// export default function QuizCard({ user }: Props) {
//   const [q, setQ] = useState<QuestionRow | null>(null);
//   const [userAnswer, setUserAnswer] = useState("");
//   const [feedback, setFeedback] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [chatInput, setChatInput] = useState("");
//   const [chatResponse, setChatResponse] = useState<string | null>(null);
//   const [chatError, setChatError] = useState<string | null>(null);
//   const [chatLoading, setChatLoading] = useState(false);

//   const startTimeRef = useRef<number>(Date.now());

//   const loadOneQuestion = async () => {
//     setLoading(true);
//     setFeedback(null);
//     setUserAnswer("");

//     const { data, error } = await supabase
//       .from("questions")
//       .select("id,question,answer")
//       .order("id", { ascending: true })
//       .limit(1);

//     if (error) {
//       setFeedback("Failed to load question.");
//       setLoading(false);
//       return;
//     }

//     const first = data?.[0] ?? null;
//     setQ(first);
//     startTimeRef.current = Date.now();
//     setLoading(false);
//   };

//   useEffect(() => {
//     loadOneQuestion();
//   }, []);

//   const submit = async () => {
//     if (!q) return;

//     const timeSpentSeconds = Math.max(
//       1,
//       Math.floor((Date.now() - startTimeRef.current) / 1000)
//     );

//     const isCorrect =
//       userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();

//     setLoading(true);

//     const { error } = await supabase.from("attempts").insert({
//       user_id: user.id,
//       question_id: q.id,
//       is_correct: isCorrect,
//       time_spent_seconds: timeSpentSeconds,
//     });

//     if (error) {
//       setFeedback("Saved attempt failed, check RLS and table columns.");
//       setLoading(false);
//       return;
//     }

//     setFeedback(
//       isCorrect ? "Correct, nice." : `Not quite, correct answer is ${q.answer}`
//     );
//     setLoading(false);
//   };

//   const sendChat = async () => {
//     if (!q || !chatInput.trim()) return;

//     setChatLoading(true);
//     setChatError(null);
//     setChatResponse(null);

//     try {
//       const baseUrl =
//         process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

//       const res = await fetch(`${baseUrl}/chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           message: chatInput.trim(),
//           question_id: q.id,
//         }),
//       });

//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         throw new Error(err?.detail || "Chat request failed.");
//       }

//       const data = await res.json();
//       setChatResponse(data?.response || "");
//       setChatInput("");
//     } catch (err: any) {
//       setChatError(err?.message || "Chat request failed.");
//     } finally {
//       setChatLoading(false);
//     }
//   };

//   if (loading && !q) {
//     return <div className="text-gray-500">Loading question.</div>;
//   }

//   if (!q) {
//     return <div className="text-gray-500">No questions found.</div>;
//   }

//   return (
//     <div className="border rounded-lg p-4 space-y-6 text-left">
//       <p className="font-semibold">Current question</p>
//       <p className="text-lg">{q.question}</p>

//       <input
//         className="border rounded px-3 py-2 w-full"
//         placeholder="Type your answer"
//         value={userAnswer}
//         onChange={(e) => setUserAnswer(e.target.value)}
//       />

//       <div className="flex gap-2">
//         <button
//           onClick={submit}
//           disabled={loading}
//           className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
//         >
//           Submit
//         </button>
//         <button
//           onClick={loadOneQuestion}
//           disabled={loading}
//           className="px-4 py-2 rounded bg-gray-200 disabled:opacity-60"
//         >
//           Reload
//         </button>
//       </div>

//       {feedback && <p className="text-sm">{feedback}</p>}

//       <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
//         <p className="font-semibold">Ask the tutor about this question</p>
//         <textarea
//           className="border rounded px-3 py-2 w-full min-h-[90px]"
//           placeholder="Type a question about the concept, steps, or hints..."
//           value={chatInput}
//           onChange={(e) => setChatInput(e.target.value)}
//         />
//         <div className="flex gap-2">
//           <button
//             onClick={sendChat}
//             disabled={chatLoading || !chatInput.trim()}
//             className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
//           >
//             {chatLoading ? "Sending..." : "Ask"}
//           </button>
//         </div>

//         {chatError && <p className="text-sm text-red-600">{chatError}</p>}
//         {chatResponse && (
//           <div className="mt-2 rounded border bg-white p-3 text-sm">
//             {chatResponse}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
/////////////// Version with Chloe's Changes//////////////

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  user: any;
};

type QuestionRow = {
  id: number;
  question: string;
  answer: string;
};

export default function QuizCard({ user }: Props) {
  const [q, setQ] = useState<QuestionRow | null>(null);

  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const baseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  }, []);

  const loadOneQuestion = async () => {
    setLoading(true);
    setFeedback(null);
    setLastCorrect(null);
    setUserAnswer("");
    setChatInput("");
    setChatResponse(null);
    setChatError(null);

    const { data, error } = await supabase
      .from("questions")
      .select("id,question,answer")
      .order("id", { ascending: true })
      .limit(1);

    if (error) {
      setFeedback("Failed to load question.");
      setLoading(false);
      return;
    }

    const first = data?.[0] ?? null;
    setQ(first);
    startTimeRef.current = Date.now();
    setLoading(false);
  };

  useEffect(() => {
    loadOneQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!q) return;

    const timeSpentSeconds = Math.max(
      1,
      Math.floor((Date.now() - startTimeRef.current) / 1000)
    );

    const isCorrect =
      userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();

    setLoading(true);

    const { error } = await supabase.from("attempts").insert({
      user_id: user.id,
      question_id: q.id,
      is_correct: isCorrect,
      time_spent_seconds: timeSpentSeconds,
    });

    if (error) {
      setFeedback("Saved attempt failed, check RLS and table columns.");
      setLastCorrect(null);
      setLoading(false);
      return;
    }

    setLastCorrect(isCorrect);
    setFeedback(
      isCorrect ? "Great job — that’s correct." : `Not quite. Answer: ${q.answer}`
    );
    setLoading(false);
  };

  const sendChat = async () => {
    if (!q || !chatInput.trim()) return;

    setChatLoading(true);
    setChatError(null);
    setChatResponse(null);

    try {
      const res = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput.trim(),
          question_id: q.id,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || "Chat request failed.");
      }

      const data = await res.json();
      setChatResponse(data?.response || "");
      setChatInput("");
    } catch (err: any) {
      setChatError(err?.message || "Chat request failed.");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading && !q) return <div className="text-gray-500">Loading question.</div>;
  if (!q) return <div className="text-gray-500">No questions found.</div>;

  return (
    <div className="min-h-screen w-full bg-[#1e2360] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        {/* Small header line like the Lessons "progress" vibe */}
        <div className="text-sm text-[#EDF2F4] opacity-80">
          Practice · Answer the question, then ask the tutor for help
        </div>

        {/* Main card */}
        <div className="w-full rounded-2xl border-[3px] border-[#3e2073] bg-[#ffdee2] p-8 md:p-10 shadow-sm">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#474c85] opacity-80">
                Current question
              </div>
              <h2 className="mt-2 text-3xl font-bold text-[#474c85]">
                {q.question}
              </h2>
            </div>

            {/* Answer input */}
            <div className="space-y-2">
              <input
                className="w-full rounded-xl border-2 border-[#F48091] bg-white px-4 py-3 text-[#5E503F] outline-none transition focus:border-[#FD4258]"
                placeholder="Type your answer"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={submit}
                  disabled={loading || !userAnswer.trim()}
                  className="rounded-lg bg-[#FD4258] px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>

                <button
                  onClick={loadOneQuestion}
                  disabled={loading}
                  className="rounded-lg bg-[#8C775D] px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  Reload
                </button>
              </div>
            </div>

            {/* Feedback / explanation box */}
            {feedback && (
              <div
                className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
                style={{
                  backgroundColor:
                    lastCorrect === true
                      ? "#dcfce7"
                      : lastCorrect === false
                      ? "#fee2e2"
                      : "#f4f4f5",
                  borderColor:
                    lastCorrect === true
                      ? "#4ade80"
                      : lastCorrect === false
                      ? "#f87171"
                      : "#d4d4d8",
                  color:
                    lastCorrect === true
                      ? "#166534"
                      : lastCorrect === false
                      ? "#991b1b"
                      : "#3f3f46",
                }}
              >
                {feedback}
              </div>
            )}

            {/* Tutor / AI box */}
            <div className="rounded-2xl border-2 border-[#F48091] bg-white/70 p-6">
              <div className="mb-3 text-sm font-semibold text-[#474c85]">
                Ask the tutor about this question
              </div>

              <textarea
                className="min-h-[110px] w-full rounded-xl border-2 border-[#F48091] bg-white px-4 py-3 text-[#5E503F] outline-none transition focus:border-[#FD4258]"
                placeholder="Type a question about the concept, steps, or hints..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={sendChat}
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-lg bg-black px-5 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {chatLoading ? "Sending..." : "Ask"}
                </button>
              </div>

              {chatError && (
                <p className="mt-3 text-sm font-medium text-red-700">
                  {chatError}
                </p>
              )}

              {chatResponse && (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
                  {chatResponse}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tiny footer spacer */}
        <div className="h-2" />
      </div>
    </div>
  );
}
