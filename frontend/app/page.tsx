// import Link from "next/link";

// export default function Home() {
//   return (
//     <div className="min-h-screen grid place-items-center">
//       <div className="text-center space-y-6">
//         <h1 className="text-3xl font-bold">Capstone - Gamified Learning Platform 🚀</h1>
//         <Link href="/lessons" className="text-blue-600 underline">Start learning</Link>
//       </div>
//     </div>
//   );
// }
////////////////START OF LANDING PAGE///////////////////////////
// import Link from "next/link";
// import { supabase } from "../lib/supabaseClient";

// async function getQuestions() {
//   const { data, error } = await supabase.from("questions").select("*");
//   return { data, error };
// }

// export default function Home() {
//   return (
//     <div className="h-[calc(100vh-56px)] mt-14 grid place-items-center">
//       <div className="text-center space-y-6">
//         <h1 className="text-3xl font-bold">
//           Capstone - Gamified Learning Platform 🚀
//         </h1>

//         <Link href="/lessons" className="text-blue-600 underline">
//           Start learning
//         </Link>
//       </div>
//     </div>
//   );
// }

// Claire's try

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthPanel from "./components/AuthPanel";
import QuizCard from "./components/QuizCard";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center space-y-6 max-w-xl w-full">
        <h1 className="text-3xl font-bold">
          Capstone - Gamified Learning Platform 🚀
        </h1>

        <AuthPanel user={user} onAuthChange={setUser} />

        {user && (
          <div className="mt-8">
            <QuizCard user={user} />
          </div>
        )}

        {!user && (
          <p className="text-gray-500">
            Sign in to start learning and save your progress
          </p>
        )}
      </div>
    </div>
  );
}
