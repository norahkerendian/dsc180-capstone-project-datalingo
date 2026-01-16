"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  user: any;
  onAuthChange: (u: any) => void;
};

export default function AuthPanel({ user, onAuthChange }: Props) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const signUp = async () => {
    setMsg(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
    });
    if (error) return setMsg(error.message);
    onAuthChange(data.user);
    setMsg("Signed up, you can now sign in.");
  };

  const signIn = async () => {
    setMsg(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) return setMsg(error.message);
    onAuthChange(data.user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    onAuthChange(null);
  };

  if (user) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Signed in as {user.email}</p>
        <button
          onClick={signOut}
          className="px-4 py-2 rounded bg-black text-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={signIn}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Sign in
        </button>
        <button
          onClick={signUp}
          className="px-4 py-2 rounded bg-gray-200"
        >
          Sign up
        </button>
      </div>

      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}