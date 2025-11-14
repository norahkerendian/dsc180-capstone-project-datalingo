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

import Link from "next/link";

export default function Home() {
  return (
    <div className="h-[calc(100vh-56px)] mt-14 grid place-items-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">
          Capstone - Gamified Learning Platform 🚀
        </h1>

        <Link href="/lessons" className="text-blue-600 underline">
          Start learning
        </Link>
      </div>
    </div>
  );
}
