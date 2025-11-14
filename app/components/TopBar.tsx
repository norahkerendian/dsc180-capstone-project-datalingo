"use client";

import Link from "next/link";
import React from "react";
import { FireSvg, GemSvg } from "./Svgs";

type Language = { name: string; code?: string };

export default function TopBar({
  streak = 0,
  lingots = 0,
  language = { name: "Data Science · Capstone", code: "ds" },
}: {
  streak?: number;
  lingots?: number;
  language?: Language;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        {/* Left: app / course name */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-800"
        >
          {language.name}
        </Link>

        {/* Right: streak + gems */}
        <div className="flex items-center gap-3 text-xs font-medium text-zinc-700 sm:text-sm">
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
            <FireSvg />
            <span>{streak}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
            <GemSvg />
            <span>{lingots}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
