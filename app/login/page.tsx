"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp() {
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setMsg(error ? error.message : "Signed up! You can now log in.");
  }

  async function signIn() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setMsg(error.message);
    else router.push("/levels");
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md border rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Sign up or Log in to DataLingo</h1>

        <input
          className="w-full border rounded-xl p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded-xl p-3"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />

        <div className="flex gap-2">
          <button className="flex-1 border rounded-xl p-3" onClick={signUp}>
            Sign up
          </button>
          <button className="flex-1 bg-black text-white rounded-xl p-3" onClick={signIn}>
            Log in
          </button>
        </div>

        {msg && <div className="text-sm text-gray-600">{msg}</div>}
      </div>
    </div>
  );
}