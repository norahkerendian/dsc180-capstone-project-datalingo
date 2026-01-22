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

"use client";

import { useEffect, useRef, useState } from "react";
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
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const startTimeRef = useRef<number>(Date.now());

  const loadOneQuestion = async () => {
    setLoading(true);
    setFeedback(null);
    setUserAnswer("");

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
      setLoading(false);
      return;
    }

    setFeedback(
      isCorrect ? "Correct, nice." : `Not quite, correct answer is ${q.answer}`
    );
    setLoading(false);
  };

  const sendChat = async () => {
    if (!q || !chatInput.trim()) return;

    setChatLoading(true);
    setChatError(null);
    setChatResponse(null);

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

  if (loading && !q) {
    return <div className="text-gray-500">Loading question.</div>;
  }

  if (!q) {
    return <div className="text-gray-500">No questions found.</div>;
  }

  return (
    <div className="border rounded-lg p-4 space-y-6 text-left">
      <p className="font-semibold">Current question</p>
      <p className="text-lg">{q.question}</p>

      <input
        className="border rounded px-3 py-2 w-full"
        placeholder="Type your answer"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
      />

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          Submit
        </button>
        <button
          onClick={loadOneQuestion}
          disabled={loading}
          className="px-4 py-2 rounded bg-gray-200 disabled:opacity-60"
        >
          Reload
        </button>
      </div>

      {feedback && <p className="text-sm">{feedback}</p>}

      <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
        <p className="font-semibold">Ask the tutor about this question</p>
        <textarea
          className="border rounded px-3 py-2 w-full min-h-[90px]"
          placeholder="Type a question about the concept, steps, or hints..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={sendChat}
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          >
            {chatLoading ? "Sending..." : "Ask"}
          </button>
        </div>

        {chatError && <p className="text-sm text-red-600">{chatError}</p>}
        {chatResponse && (
          <div className="mt-2 rounded border bg-white p-3 text-sm">
            {chatResponse}
          </div>
        )}
      </div>
    </div>
  );
}
