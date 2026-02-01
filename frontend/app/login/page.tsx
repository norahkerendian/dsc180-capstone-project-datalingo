// "use client";

// import { useState } from "react";
// import { supabase } from "@/lib/supabaseClient";
// import { useRouter } from "next/navigation";

// export default function LoginPage() {
//   const router = useRouter();
//   const [email, setEmail] = useState("");
//   const [pw, setPw] = useState("");
//   const [msg, setMsg] = useState<string | null>(null);

//   async function signUp() {
//     setMsg(null);
//     const { error } = await supabase.auth.signUp({ email, password: pw });
//     setMsg(error ? error.message : "Signed up! You can now log in.");
//   }

//   async function signIn() {
//     setMsg(null);
//     const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
//     if (error) setMsg(error.message);
//     else router.push("/levels");
//   }

//   return (
//     <div className="min-h-screen grid place-items-center p-6">
//       <div className="w-full max-w-md border rounded-2xl p-6 space-y-4">
//         <h1 className="text-2xl font-bold">Sign up or Log in to DataLingo</h1>

//         <input
//           className="w-full border rounded-xl p-3"
//           placeholder="Email"
//           value={email}
//           onChange={(e) => setEmail(e.target.value)}
//         />
//         <input
//           className="w-full border rounded-xl p-3"
//           placeholder="Password"
//           type="password"
//           value={pw}
//           onChange={(e) => setPw(e.target.value)}
//         />

//         <div className="flex gap-2">
//           <button className="flex-1 border rounded-xl p-3" onClick={signUp}>
//             Sign up
//           </button>
//           <button className="flex-1 bg-black text-white rounded-xl p-3" onClick={signIn}>
//             Log in
//           </button>
//         </div>

//         {msg && <div className="text-sm text-gray-600">{msg}</div>}
//       </div>
//     </div>
//   );
// }


////////////////////////////////////////////// Implement UI design changes ///////////////////////////////
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function signUp() {
    setMsg(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setMsg(error ? error.message : "🎉 Signed up! You can now log in.");
    setIsLoading(false);
  }

  async function signIn() {
    setMsg(null);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) {
      setMsg(error.message);
      setIsLoading(false);
    } else {
      router.push("/levels");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-green-600 font-semibold mb-6 hover:text-green-700 transition-colors"
        >
          <span>←</span>
          <span>Back to home</span>
        </Link>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6 transform hover:scale-[1.01] transition-transform duration-200">
          {/* Header with icon */}
          <div className="text-center space-y-2">
            <div className="inline-block text-5xl mb-2">🚀</div>
            <h1 className="text-3xl font-black text-gray-800">
              Welcome to <span className="text-green-600">DataLingo</span>
            </h1>
            <p className="text-gray-600">Sign up or log in to start learning!</p>
          </div>

          {/* Input fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 focus:outline-none transition-colors"
                placeholder="your@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-green-500 focus:outline-none transition-colors"
                placeholder="••••••••"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              className="flex-1 bg-white border-2 border-green-600 text-green-600 font-bold rounded-xl p-3 hover:bg-green-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={signUp}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Sign up"}
            </button>
            <button 
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl p-3 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={signIn}
              disabled={isLoading}
            >
              {isLoading ? "..." : "Log in"}
            </button>
          </div>

          {/* Message display */}
          {msg && (
            <div className={`text-sm p-3 rounded-xl ${
              msg.includes("🎉") 
                ? "bg-green-100 text-green-800 border border-green-200" 
                : "bg-red-100 text-red-800 border border-red-200"
            }`}>
              {msg}
            </div>
          )}
        </div>

        {/* Fun decorative elements */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex justify-center gap-4 text-3xl">
            <span className="animate-bounce">📊</span>
            <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>🐍</span>
            <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>💡</span>
          </div>
          <p className="text-gray-600 text-sm">
            Join thousands learning Python & Data Science! 🎮
          </p>
        </div>
      </div>
    </div>
  );
}