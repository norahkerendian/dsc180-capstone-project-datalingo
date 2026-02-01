"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LevelsPage() {
  const [levels, setLevels] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("level")
        .order("level", { ascending: true });

      if (error) return;

      const uniq = Array.from(new Set((data ?? []).map((x: any) => x.level).filter(Boolean)));
      setLevels(uniq);
    })();
  }, []);

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Choose a Level</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {levels.map((lvl) => (
          <Link
            key={lvl}
            href={`/levels/${lvl}`}
            className="border rounded-2xl p-8 text-xl font-semibold hover:bg-gray-50"
          >
            Level {lvl}
          </Link>
        ))}
      </div>
    </div>
  );
}