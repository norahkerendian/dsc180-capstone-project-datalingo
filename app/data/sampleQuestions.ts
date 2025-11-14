// app/data/sampleQuestions.ts

export type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  topic: string;
  prompt: string;
  explanationCorrect: string;
  explanationIncorrect: string;
  options: Option[];
};

export const sampleQuestions: Question[] = [
  {
    id: "df-basic-1",
    topic: "Python / Pandas",
    prompt: "What is a data frame in Python?",
    explanationCorrect:
      "Nice job! that is the correct definition of a data frame.",
    explanationIncorrect:
      "Not quite. A data frame is a 2D labeled data structure in pandas.",
    options: [
      {
        id: "a",
        text: "A 2D labeled data structure in pandas",
        isCorrect: true,
      },
      { id: "b", text: "A type of SQL query", isCorrect: false },
      { id: "c", text: "A visualization library", isCorrect: false },
    ],
  },
  // later: add more questions here
];
