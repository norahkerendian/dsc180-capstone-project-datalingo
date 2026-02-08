"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Choice = { id: number; choice_text: string };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  response: string;
  lesson_title?: string | null;
  topic?: string | null;
  level?: number | null;
  token_estimate: number;
  session_id?: string | null;
  usage_input_tokens?: number | null;
  usage_output_tokens?: number | null;
  usage_total_tokens?: number | null;
  scoping_mode: string;
  topic_cache_hit: boolean;
};

type TopicSessionResponse = {
  session_id: string;
  token_estimate: number;
};

type Props = {
  topic?: string | null;
  level?: number | null;
  questionText?: string | null;
  choices?: Choice[];
  wrongChoiceId?: number | null;
};

export default function TutorChatWidget({
  topic,
  level,
  questionText,
  choices = [],
  wrongChoiceId = null,
}: Props) {
  const baseUrl = useMemo(() => {
    const raw = (
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
    ).trim();
    const noTrailingSlash = raw.endsWith("/") ? raw.slice(0, -1) : raw;
    // Browsers can't fetch from 0.0.0.0; that's a bind-all address.
    return noTrailingSlash.replace("0.0.0.0", "127.0.0.1");
  }, []);

  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [usageTotalTokens, setUsageTotalTokens] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  function humanizeFetchError(e: unknown, fallback: string) {
    if (e instanceof Error) {
      if (e.message === "Failed to fetch") {
        return `Failed to fetch (backend: ${baseUrl}). Is the backend running and reachable from the browser?`;
      }
      return e.message;
    }
    return fallback;
  }

  // Pin topic context once when topic/level becomes available.
  useEffect(() => {
    async function initSession() {
      if (!open) return;
      if (!topic || !topic.trim()) return;

      setInitLoading(true);
      setError(null);

      try {
        const res = await fetch(`${baseUrl}/chat/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            level: level ?? undefined,
            session_id: sessionId ?? undefined,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            json?.detail || "Failed to initialize tutor session.",
          );
        }

        const data = json as TopicSessionResponse;
        setSessionId(data.session_id);
      } catch (e: unknown) {
        setError(humanizeFetchError(e, "Failed to initialize tutor session."));
      } finally {
        setInitLoading(false);
      }
    }

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, topic, level, open]);

  function buildUserMessage(studentText: string) {
    const parts: string[] = [];
    if (questionText && questionText.trim()) {
      parts.push(`Current quiz question: ${questionText.trim()}`);
    }
    if (choices.length > 0) {
      parts.push(
        "Choices:\n" +
          choices
            .map((c, i) => {
              const label = String.fromCharCode("A".charCodeAt(0) + i);
              return `${label}. ${c.choice_text}`;
            })
            .join("\n"),
      );
    }

    parts.push(`Student: ${studentText.trim()}`);
    return parts.join("\n\n");
  }

  async function sendMessage(studentText: string) {
    if (!topic || !topic.trim()) {
      setError("Tutor not ready (missing topic).");
      return;
    }
    if (!studentText.trim()) return;

    setInput("");
    setError(null);
    setLoading(true);

    setMessages((m) => [...m, { role: "user", content: studentText.trim() }]);

    try {
      const res = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: buildUserMessage(studentText),
          topic: topic.trim(),
          level: level ?? undefined,
          session_id: sessionId ?? undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || "Chat request failed.");
      }

      const data = json as ChatResponse;

      if (data.session_id) setSessionId(data.session_id);
      setUsageTotalTokens(
        typeof data.usage_total_tokens === "number"
          ? data.usage_total_tokens
          : null,
      );

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.response || "" },
      ]);
    } catch (e: unknown) {
      setError(humanizeFetchError(e, "Chat request failed."));
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    if (!input.trim()) return;
    await sendMessage(input);
  }

  async function sendQuickAction(text: string) {
    if (!text.trim()) return;
    await sendMessage(text);
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open tutor"
        onClick={() => setOpen(true)}
        className="h-14 w-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 active:bg-green-800"
      >
        <span className="text-sm font-bold">AI</span>
      </button>
    );
  }

  return (
    <div className="w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">Tutor</div>
          <div className="text-xs text-gray-600 truncate">
            {topic ? `Topic: ${topic}` : "Topic: (loading…)"}
          </div>
          <div className="text-xs text-gray-500">
            {initLoading
              ? "Initializing…"
              : usageTotalTokens != null
                ? `Last response tokens: ${usageTotalTokens}`
                : ""}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading && (
            <div className="text-xs font-medium text-gray-600 whitespace-nowrap">
              AI is Responding…
            </div>
          )}
          <button
            type="button"
            aria-label="Close tutor"
            onClick={() => setOpen(false)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <div className="text-xs text-gray-500">
            Ask a question about this quiz item.
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-xl bg-gray-900 px-3 py-2 text-xs text-white"
                  : "mr-auto max-w-[85%] rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-900"
              }
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-3">
        {/* Quick Action Buttons */}
        {questionText && choices.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              onClick={() =>
                void sendQuickAction(
                  "Can you explain the context of each answer choice without telling me which one is correct?",
                )
              }
              disabled={loading}
              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Explain all answer choices"
            >
              💡 Explain Each Choice
            </button>

            {wrongChoiceId !== null &&
              (() => {
                const wrongIndex = choices.findIndex(
                  (c) => c.id === wrongChoiceId,
                );
                const wrongLetter =
                  wrongIndex >= 0
                    ? String.fromCharCode("A".charCodeAt(0) + wrongIndex)
                    : "that option";
                return (
                  <button
                    onClick={() =>
                      void sendQuickAction(
                        `Can you explain why ${wrongLetter} is wrong?`,
                      )
                    }
                    disabled={loading}
                    className="rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Explain why your wrong answer is incorrect"
                  >
                    ❌ Why Was I Wrong?
                  </button>
                );
              })()}

            <button
              onClick={() =>
                void sendQuickAction(
                  "Can you give me a hint about the key concept being tested in this question?",
                )
              }
              disabled={loading}
              className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Get a conceptual hint"
            >
              🎯 Give Me a Hint
            </button>
          </div>
        )}

        {/* Input Field */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (!loading) void send();
              }
            }}
            placeholder="Ask the tutor…"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
            disabled={loading}
          />
          <button
            onClick={() => void send()}
            disabled={loading || !input.trim() || !topic}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
