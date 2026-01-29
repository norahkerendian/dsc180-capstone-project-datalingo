// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabaseClient";
// import AuthPanel from "./components/AuthPanel";

// export default function Home() {
//   const router = useRouter();
//   const [user, setUser] = useState<any>(null);

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data }) => {
//       const u = data.session?.user ?? null;
//       setUser(u);
//       if (u) router.replace("/curriculum"); // only redirect if logged in
//     });

//     const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
//       const u = session?.user ?? null;
//       setUser(u);
//       if (u) router.replace("/curriculum"); // redirect right after sign in/up
//     });

//     return () => {
//       listener.subscription.unsubscribe();
//     };
//   }, [router]);

//   return (
//     <div className="min-h-screen grid place-items-center">
//       <div className="text-center space-y-6 max-w-xl w-full">
//         <h1 className="text-3xl font-bold">Capstone - Gamified Learning Platform 🚀</h1>
//         <AuthPanel user={user} onAuthChange={setUser} />
//         {!user && <p className="text-gray-500">Sign in to start learning and save your progress!</p>}
//       </div>
//     </div>
//   );
// }

///////////////////////// Start of Claire's 'changes' version 1 //////////////////////////////////////////////


// import Link from "next/link";

// export default function Home() {
//   return (
//     <div className="min-h-screen grid place-items-center">
//       <div className="text-center space-y-6">
//         <h1 className="text-3xl font-bold">DataLingo 🚀</h1>
//         <p className="text-gray-600 max-w-md">
//           Learn Python + Data Science with guided lessons and gamified MCQs.
//         </p>
//         <div className="flex gap-3 justify-center">
//           <Link href="/login" className="border rounded-xl px-5 py-3">
//             Login
//           </Link>
//           <Link href="/levels" className="bg-black text-white rounded-xl px-5 py-3">
//             Start learning
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

/////////////////////////////// Claude pls help ////////////////// //////////////////////////////
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50">
      {/* Header */}
      <header className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">📊</span>
          <span className="text-2xl font-bold text-green-600">DataLingo</span>
        </div>
        <Link 
          href="/login"
          className="px-6 py-2.5 border-2 border-green-600 text-green-600 font-bold rounded-xl hover:bg-green-50 transition-all duration-200"
        >
          Login
        </Link>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Text content */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-black text-gray-800 leading-tight">
              Learn Python & Data Science,
              <span className="text-green-600"> one lesson at a time</span>
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              Master Python and Data Science through fun, bite-sized lessons and gamified challenges. 
              Level up your skills with interactive MCQs! 🎮
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                href="/login"
                className="group bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg px-8 py-4 rounded-2xl hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 transform text-center"
              >
                🚀 Start Learning Free
              </Link>
              
              <Link 
                href="/login"
                className="bg-white text-green-600 font-bold text-lg px-8 py-4 rounded-2xl border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-center"
              >
                I already have an account
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-6">
              <div>
                <div className="text-3xl font-bold text-green-600">500+</div>
                <div className="text-sm text-gray-600">Lessons</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">1000+</div>
                <div className="text-sm text-gray-600">Practice MCQs</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">Free</div>
                <div className="text-sm text-gray-600">Forever</div>
              </div>
            </div>
          </div>

          {/* Right side - Visual element */}
          <div className="relative">
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-4">
              <div className="flex items-center gap-3 pb-2">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                  🐍
                </div>
                <div>
                  <div className="font-bold text-gray-800">Python Basics</div>
                  <div className="text-sm text-gray-500">Level 1 - Beginner</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-700">Variables & Types</div>
                    <div className="text-xs text-gray-500">Completed</div>
                  </div>
                  <div className="text-2xl">🏆</div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-700">Lists & Loops</div>
                    <div className="text-xs text-gray-500">In Progress</div>
                  </div>
                  <div className="text-2xl">⭐</div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl opacity-60">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold">
                    🔒
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-700">Functions</div>
                    <div className="text-xs text-gray-500">Locked</div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Daily Goal Progress</span>
                  <span className="font-bold text-green-600">3/5 lessons</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" style={{width: '60%'}}></div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-white font-bold px-4 py-2 rounded-full shadow-lg transform rotate-12">
              🔥 7 Day Streak!
            </div>
            <div className="absolute -bottom-4 -left-4 bg-purple-500 text-white font-bold px-4 py-2 rounded-full shadow-lg">
              ⚡ +50 XP
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center space-y-3 p-6">
            <div className="text-5xl mb-2">🎯</div>
            <h3 className="text-xl font-bold text-gray-800">Gamified Learning</h3>
            <p className="text-gray-600">Earn XP, unlock levels, and compete with friends while learning</p>
          </div>
          
          <div className="text-center space-y-3 p-6">
            <div className="text-5xl mb-2">💡</div>
            <h3 className="text-xl font-bold text-gray-800">Bite-Sized Lessons</h3>
            <p className="text-gray-600">Quick 5-minute lessons that fit into your busy schedule</p>
          </div>
          
          <div className="text-center space-y-3 p-6">
            <div className="text-5xl mb-2">📈</div>
            <h3 className="text-xl font-bold text-gray-800">Track Progress</h3>
            <p className="text-gray-600">See your improvement with detailed analytics and achievements</p>
          </div>
        </div>
      </main>
    </div>
  );
}

////////////////////////////////////// chatgpt langing page //////////////////////////////

// import Link from "next/link";

// export default function Home() {
//   return (
//     <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600">
//       {/* Top bar */}
//       <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
//         <div className="flex items-center gap-3">
//           <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
//             <span className="text-xl">🚀</span>
//           </div>
//           <div className="text-white">
//             <div className="text-lg font-semibold leading-tight">DataLingo</div>
//             <div className="text-xs text-white/80">AI-powered learning for Python & Data Science</div>
//           </div>
//         </div>

//         <Link
//           href="/login"
//           className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
//         >
//           Sign in
//         </Link>
//       </header>

//       {/* Hero */}
//       <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-8 md:grid-cols-2">
//         <div className="space-y-6">
//           <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl">
//             Learn Python & Data Science <span className="text-white/90">the fun way</span>.
//           </h1>

//           <p className="max-w-xl text-lg leading-relaxed text-white/90">
//             Guided lessons, multiple-choice checkpoints, and instant feedback—so you
//             build confidence fast and actually remember what you learn.
//           </p>

//           <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
//             <Link
//               href="/login"
//               className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-base font-semibold text-indigo-700 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-xl"
//             >
//               Get started — Sign in
//               <span className="ml-2">→</span>
//             </Link>

//             <div className="text-sm text-white/80">
//               Already have an account?{" "}
//               <Link href="/login" className="font-semibold text-white underline underline-offset-4">
//                 Log in
//               </Link>
//             </div>
//           </div>

//           {/* Feature chips */}
//           <div className="flex flex-wrap gap-2 pt-4">
//             {[
//               "Personalized practice",
//               "Context-aware explanations",
//               "Progress tracking",
//               "Multiple-choice quizzes",
//             ].map((label) => (
//               <span
//                 key={label}
//                 className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur"
//               >
//                 {label}
//               </span>
//             ))}
//           </div>
//         </div>

//         {/* Right-side card mock */}
//         <div className="relative">
//           <div className="absolute -inset-4 rounded-3xl bg-white/10 blur-2xl" />
//           <div className="relative rounded-3xl bg-white/10 p-6 ring-1 ring-white/25 backdrop-blur">
//             <div className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-semibold text-white/90">Today’s lesson</span>
//                 <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white ring-1 ring-white/25">
//                   Level 1
//                 </span>
//               </div>

//               <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
//                 <div className="text-sm text-white/70">Topic</div>
//                 <div className="text-lg font-semibold text-white">What is Data Science?</div>
//                 <div className="mt-3 text-sm text-white/85">
//                   Quick explanation, then a checkpoint question to confirm understanding.
//                 </div>
//               </div>

//               <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
//                 <div className="text-sm font-semibold text-white/90">Checkpoint</div>
//                 <div className="mt-2 text-sm text-white/85">
//                   Data Science involves…
//                 </div>

//                 <div className="mt-3 grid gap-2">
//                   {[
//                     "Exploration, prediction, and inference",
//                     "Only building hardware systems",
//                     "Writing code without data",
//                     "Creating new internet protocols",
//                   ].map((opt, i) => (
//                     <div
//                       key={opt}
//                       className={`rounded-xl px-3 py-2 text-sm text-white ring-1 ring-white/20 ${
//                         i === 0 ? "bg-emerald-400/20" : "bg-white/5"
//                       }`}
//                     >
//                       {opt}
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="flex items-center justify-between pt-2">
//                 <span className="text-xs text-white/70">Instant feedback • Smart review</span>
//                 <span className="text-xs text-white/70">⏱️ ~2 min</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-white/70">
//         © {new Date().getFullYear()} DataLingo. All rights reserved.
//       </footer>
//     </main>
//   );
// }