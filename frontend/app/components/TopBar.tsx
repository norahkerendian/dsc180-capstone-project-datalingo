///////////////////////////////////// working version increments topbar fire and gem icon///////////////////////////////////////////////
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FireSvg, GemSvg } from "./Svgs";
import Image from "next/image"; // added this 

type Language = { name: string; code?: string };

// helper, YYYY-MM-DD in local time
function toLocalYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TopBar({
  streak: streakProp,
  lingots: lingotsProp,
  language = { name: "Data Science · Capstone", code: "ds" },
}: {
  streak?: number;
  lingots?: number;
  language?: Language;
}) {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(streakProp ?? 0);
  const [lingots, setLingots] = useState<number>(lingotsProp ?? 0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // keep props optional, but prefer live values when logged in
  const streakDisplay = useMemo(() => streakProp ?? streak, [streakProp, streak]);
  const lingotsDisplay = useMemo(() => lingotsProp ?? lingots, [lingotsProp, lingots]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  // 1, get logged in user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2, function that recomputes streak and gem count
  async function refreshStats() {
    if (!userId) return;

    // total questions in dataset
    const qCountRes = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true });

    const total = qCountRes.count ?? 0;
    setTotalQuestions(total);

    // unique questions answered correctly by this user
    // uses user_responses table, assumes it has question_id, user_id, is_correct, created_at
    const correctRes = await supabase
      .from("user_responses")
      .select("question_id, created_at")
      .eq("user_id", userId)
      .eq("is_correct", true);

    const rows = correctRes.data ?? [];

    // unique correct questions
    const uniqueCorrect = new Set<number>();
    for (const r of rows) {
      if (typeof r.question_id === "number") uniqueCorrect.add(r.question_id);
    }
    setLingots(uniqueCorrect.size);

    // streak: consecutive days where user has at least 1 response (any correctness)
    // we should query all responses but only need created_at
    const respRes = await supabase
      .from("user_responses")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5000);

    const dates = (respRes.data ?? [])
      .map((r: any) => (r?.created_at ? toLocalYMD(new Date(r.created_at)) : null))
      .filter(Boolean) as string[];

    const uniqueDays = Array.from(new Set(dates)); // already in desc order because query desc

    if (uniqueDays.length === 0) {
      setStreak(0);
      return;
    }

    const today = toLocalYMD(new Date());
    // allow streak to start from today OR yesterday depending on whether they did anything today
    let streakCount = 0;
    let cursor = new Date();
    // if user has no activity today, streak starts at yesterday only if yesterday exists
    if (uniqueDays[0] !== today) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (true) {
      const ymd = toLocalYMD(cursor);
      if (uniqueDays.includes(ymd)) {
        streakCount += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    setStreak(streakCount);
  }

  // initial load
  useEffect(() => {
    refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // 3, listen for a custom event that tells TopBar to refresh immediately
  useEffect(() => {
    const handler = () => refreshStats();
    window.addEventListener("user-stats-updated", handler);
    return () => window.removeEventListener("user-stats-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        {/* <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl">📊</span>
          <span className="text-xl font-bold text-green-600">DataLingo</span>
        </Link> */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/datalingo-mascot.png"
            alt="DataLingo mascot"
            width={33}
            height={33}
            className="object-contain"
          />
          <span className="text-xl font-bold text-green-600">DataLingo</span>
        </Link> 
        {/* added this ^ */}

        <div className="flex items-center gap-3 text-xs font-medium text-zinc-700 sm:text-sm">
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
            <FireSvg />
            <span>{streakDisplay}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
            <GemSvg />
            <span>
              {lingotsDisplay}
              {totalQuestions ? `/${totalQuestions}` : ""}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="rounded-full bg-zinc-100 px-3 py-1 hover:bg-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}