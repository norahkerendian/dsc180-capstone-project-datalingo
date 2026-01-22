"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QuizCard from "../components/QuizCard";

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const level = searchParams.get("level"); // optional, but useful later
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/");
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, [router]);

  if (loading) return null;

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-full max-w-3xl px-4">
        {level && <p className="text-sm text-gray-500 mb-4">Selected level: {level}</p>}
        <QuizCard user={user} />
      </div>
    </div>
  );
}
