"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TitleRow = {
  id: number;
  title: string;
  slug: string | null;
  level: number;
  topic: string;
};

export default function TopicPage() {
  const params = useParams();

  const levelRaw = params?.level;
  const levelStr = Array.isArray(levelRaw) ? levelRaw[0] : levelRaw;
  const topicRaw = params?.topic;
  const topicStr = Array.isArray(topicRaw) ? topicRaw[0] : topicRaw;

  const levelNum = useMemo(() => {
    const n = Number(levelStr);
    return Number.isFinite(n) ? n : null;
  }, [levelStr]);

  const decodedTopic = useMemo(() => {
    try {
      return topicStr ? decodeURIComponent(topicStr) : "";
    } catch {
      return topicStr ? String(topicStr) : "";
    }
  }, [topicStr]);

  const [titles, setTitles] = useState<TitleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (levelNum === null || !decodedTopic) return;

    setLoading(true);
    setErr(null);

    fetch(`/api/titles?level=${levelNum}&topic=${encodeURIComponent(decodedTopic)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((data) => setTitles(data.titles ?? []))
      .catch((e) => setErr(e.message ?? "Failed to load titles"))
      .finally(() => setLoading(false));
  }, [levelNum, decodedTopic]);

  if (levelNum === null) {
    return (
      <div className="p-10">
        <h1 className="text-2xl font-semibold">Invalid level</h1>
        <p className="text-gray-600">Try /levels/1</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{decodedTopic}</h1>
          <p className="text-gray-600">Level {levelNum}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="underline text-sm text-gray-600" href={`/levels/${levelNum}`}>
            ← Back to Topics
          </Link>
        </div>

        {loading && <p className="text-gray-600">Loading titles…</p>}
        {err && <p className="text-red-600">Error: {err}</p>}

        {!loading && !err && (
          <div className="grid gap-3">
            {titles.map((t) => (
              <Link
                key={t.id}
                href={`/levels/${levelNum}/topics/${encodeURIComponent(decodedTopic)}/${t.id}`}
                className="rounded-xl border p-4 hover:bg-gray-50 transition"
              >
                <div className="font-semibold">{t.title}</div>
                <div className="text-sm text-gray-600">Tap to view lesson → quiz</div>
              </Link>
            ))}
            {titles.length === 0 && (
              <p className="text-gray-600">No titles found under this topic.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}