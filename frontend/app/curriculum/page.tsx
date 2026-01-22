"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Level = {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  locked: boolean;
};

export default function CurriculumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Protect page: only logged-in users can see curriculum
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/");
        return;
      }
      setLoading(false);
      setIsVisible(true);
    });
  }, [router]);

  if (loading) return null;

  const levels: Level[] = [
    {
      id: 1,
      name: "Level 1",
      description: "Introduction to data science fundamentals",
      completed: false,
      locked: false,
    },
    {
      id: 2,
      name: "Level 2",
      description: "Advanced data analysis techniques",
      completed: false,
      locked: false,
    },
    {
      id: 3,
      name: "Level 3",
      description: "Machine learning basics",
      completed: false,
      locked: true,
    },
    {
      id: 4,
      name: "Level 4",
      description: "Advanced machine learning",
      completed: false,
      locked: true,
    },
    {
      id: 5,
      name: "Level 5",
      description: "Data science mastery",
      completed: false,
      locked: true,
    },
  ];

  const levelColors = ["#ffb2bb", "#f48091", "#eb566e", "#e12646", "#d90429"];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#1e2360" }}
    >
      <div
        className="text-center"
        style={{
          padding: "2rem",
          maxWidth: "90%",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.6s ease-in-out",
        }}
      >
        <h2
          className="text-6xl font-bold mb-16"
          style={{ color: "#edf2f4" }}
        >
          What Would You Like to Learn Today?
        </h2>

        <div className="flex flex-col items-center gap-6">
          {/* Top row */}
          <div className="flex gap-6">
            {levels.slice(0, 3).map((level, index) => (
              <Link
                key={level.id}
                href={level.locked ? "#" : `/quiz?level=${level.id}`}
                onClick={(e) => level.locked && e.preventDefault()}
                className={`flex flex-col items-center justify-center transition-all duration-300 ${
                  level.locked
                    ? "cursor-not-allowed opacity-50"
                    : "hover:scale-110 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: levelColors[index],
                  border: level.completed
                    ? "3px solid #49111C"
                    : "2px solid #8C775D",
                  width: "200px",
                  height: "200px",
                  borderRadius: "1rem",
                  textDecoration: "none",
                }}
              >
                <div className="px-4 text-center">
                  <div
                    className="text-2xl mb-2 font-black"
                    style={{ color: "#474c85" }}
                  >
                    {level.name}
                  </div>
                  <div className="text-sm text-white">
                    {level.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom row */}
          <div className="flex gap-6">
            {levels.slice(3).map((level, index) => (
              <Link
                key={level.id}
                href={level.locked ? "#" : `/quiz?level=${level.id}`}
                onClick={(e) => level.locked && e.preventDefault()}
                className={`flex flex-col items-center justify-center transition-all duration-300 ${
                  level.locked
                    ? "cursor-not-allowed opacity-50"
                    : "hover:scale-110 hover:opacity-90"
                }`}
                style={{
                  backgroundColor: levelColors[index + 3],
                  border: level.completed
                    ? "3px solid #49111C"
                    : "2px solid #8C775D",
                  width: "200px",
                  height: "200px",
                  borderRadius: "1rem",
                  textDecoration: "none",
                }}
              >
                <div className="px-4 text-center">
                  <div
                    className="text-2xl mb-2 font-black"
                    style={{ color: "#474c85" }}
                  >
                    {level.name}
                  </div>
                  <div className="text-sm text-[#989dd0]">
                    {level.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
