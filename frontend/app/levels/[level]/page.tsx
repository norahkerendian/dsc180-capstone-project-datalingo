"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TopicRow = {
  topic: string;
  count: number;
};

export default function LevelPage() {
  const params = useParams();

  // params.level can be string | string[] | undefined
  const levelRaw = params?.level;
  const levelStr = Array.isArray(levelRaw) ? levelRaw[0] : levelRaw;

  const levelNum = useMemo(() => {
    const n = Number(levelStr);
    return Number.isFinite(n) ? n : null;
  }, [levelStr]);

  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (levelNum === null) return;

    setLoading(true);
    setErr(null);

    fetch(`/api/topics?level=${levelNum}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setTopics(data.topics ?? []))
      .catch((e) => setErr(e.message ?? "Failed to load topics"))
      .finally(() => setLoading(false));
  }, [levelNum]);

  if (levelNum === null) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">Invalid level</h1>
        <p className="text-gray-600">
          URL param <span className="font-mono">{String(levelStr)}</span> is not a number. Try{" "}
          <Link className="underline" href="/levels/1">
            /levels/1
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Level {levelNum}</h1>
          <Link href="/levels" className="underline text-sm text-gray-600">
            ← Back to Levels
          </Link>
        </div>

        {loading && <p className="text-gray-600">Loading topics…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}

        {!loading && !err && (
          <div className="grid gap-3">
            {topics.length === 0 ? (
              <p className="text-gray-600">No topics found for this level.</p>
            ) : (
              topics.map((t) => (
                <Link
                  key={t.topic}
                  href={`/levels/${levelNum}/topics/${encodeURIComponent(t.topic)}`}
                  className="rounded-xl border p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.topic}</span>
                    <span className="text-sm text-gray-600">{t.count} titles</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}