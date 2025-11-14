// "use client";

// import React, { useState } from "react";
// import { sampleQuestions } from "../data/sampleQuestions";

// export default function LessonsPage() {
//   // for now just take the first question in the list
//   const question = sampleQuestions[0];

//   const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
//   const [hasAnswered, setHasAnswered] = useState(false);

//   const handleChoice = (index: number) => {
//     if (hasAnswered) return; // lock after first click
//     setSelectedIndex(index);
//     setHasAnswered(true);
//   };

//   const selectedOption =
//     selectedIndex !== null ? question.options[selectedIndex] : null;
//   const isCorrect = selectedOption?.isCorrect ?? false;

//   return (
//     <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-3xl flex-col gap-6 px-4 py-8">
//       <header className="space-y-1">
//         {/* <p className="text-xs font-medium uppercase text-zinc-500">
//           {question.topic}
//         </p> */}
//         <h1 className="text-2xl font-semibold">Lessons</h1>
//         <p className="text-sm text-zinc-600">
//           This is the lessons page.

//         </p>
//       </header>

//       <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
//         <p className="text-lg font-semibold">
//           Example question: {question.prompt}
//         </p>

//         <div className="mt-4 grid gap-3">
//           {question.options.map((option, idx) => {
//             const isSelected = idx === selectedIndex;

//             let extraClass = "";
//             if (!hasAnswered) {
//               // nothing yet
//             } else if (isSelected && option.isCorrect) {
//               extraClass = "correct answered";
//             } else if (isSelected && !option.isCorrect) {
//               extraClass = "wrong answered";
//             } else if (!isSelected && option.isCorrect) {
//               extraClass = "correct-hint answered";
//             } else {
//               extraClass = "answered";
//             }

//             return (
//               <button
//                 key={option.id}
//                 type="button"
//                 onClick={() => handleChoice(idx)}
//                 className={`quiz-option ${extraClass}`}
//               >
//                 {option.text}
//               </button>
//             );
//           })}
//         </div>

//         {hasAnswered && (
//           <p className="mt-4 text-sm font-medium">
//             {isCorrect
//               ? question.explanationCorrect
//               : question.explanationIncorrect}
//           </p>
//         )}
//       </section>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useState } from "react";

type RawQuestion = {
  id: number;
  prompt: string;
  choices: string[];
  answerIndex: number;
  hint?: string;
};

type NormalizedOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type NormalizedQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: NormalizedOption[];
  explanationCorrect: string;
  explanationIncorrect: string;
};

export default function LessonsPage() {
  const [questions, setQuestions] = useState<NormalizedQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  // ⭐ Load JSON at runtime:
    useEffect(() => {
    async function load() {
        try {
            
        const res = await fetch("/questions/lessons_level1.json");

        if (!res.ok) {
            throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
        }

        const raw: RawQuestion[] = await res.json();

        const normalized = raw.map((q) => {
            const options = q.choices.map((choice, idx) => ({
            id: String(idx),
            text: choice,
            isCorrect: idx === q.answerIndex,
            }));

            return {
            id: String(q.id),
            topic: "Level 1",
            prompt: q.prompt,
            options,
            explanationCorrect: "Correct!",
            explanationIncorrect: q.hint || "Not quite.",
            };
        });

        setQuestions(normalized);
        } catch (err) {
        console.error("Error loading lessons JSON:", err);
        } finally {
        setLoading(false);
        }
    }

    load();
    }, []);


  // ⭐ Still loading?
  if (loading) return <p className="p-6">Loading lessons…</p>;

  // ⭐ Use normalized questions from JSON
  const question = questions[currentIndex];
  const total = questions.length;

  const handleChoice = (index: number) => {
    if (hasAnswered) return;
    setSelectedIndex(index);
    setHasAnswered(true);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedIndex(null);
      setHasAnswered(false);
    }
  };

  const selectedOption =
    selectedIndex !== null ? question.options[selectedIndex] : null;

  const isCorrect = selectedOption?.isCorrect ?? false;
  const isLast = currentIndex === total - 1;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold mb-4">Lessons</h1>

      <p className="text-sm text-zinc-600">
        Question {currentIndex + 1} of {total}
      </p>

      <section className="mt-4 rounded-xl border p-4 bg-white shadow">
        <p className="text-lg font-semibold">{question.prompt}</p>

        <div className="mt-4 flex flex-col gap-2">
          {question.options.map((option, idx) => {
            const isSelected = idx === selectedIndex;

            return (
              <button
                key={option.id}
                onClick={() => handleChoice(idx)}
                className={`quiz-option ${
                  hasAnswered
                    ? isSelected
                      ? isCorrect
                        ? "correct answered"
                        : "wrong answered"
                      : option.isCorrect
                      ? "correct-hint answered"
                      : "answered"
                    : ""
                }`}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        {hasAnswered && (
          <p className="mt-3 font-medium">
            {isCorrect
              ? question.explanationCorrect
              : question.explanationIncorrect}
          </p>
        )}

        {hasAnswered && !isLast && (
          <button
            onClick={handleNext}
            className="mt-4 rounded bg-black px-4 py-2 text-white"
          >
            Next →
          </button>
        )}

        {hasAnswered && isLast && (
          <p className="mt-4 text-emerald-600 font-semibold">
            You completed this level!
          </p>
        )}
      </section>
    </div>
  );
}


