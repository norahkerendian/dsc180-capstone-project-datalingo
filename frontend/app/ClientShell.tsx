// "use client";

// import type { ReactNode } from "react";
// import { useEffect, useState } from "react";
// import TopBar from "./components/TopBar";

// export default function ClientShell({ children }: { children: ReactNode }) {
//   const STORAGE_KEY = "capstone-progress";

//   const [streak, setStreak] = useState(0);
//   const [lingots, setLingots] = useState(0);
//   const language = { name: "Data Science", code: "ds" };

//   // optional restore from localStorage
//   useEffect(() => {
//     try {
//       const saved = localStorage.getItem(STORAGE_KEY);
//       if (!saved) return;
//       const parsed = JSON.parse(saved);
//       if (typeof parsed.streak === "number") setStreak(parsed.streak);
//       if (typeof parsed.lingots === "number") setLingots(parsed.lingots);
//     } catch {
//       // ignore bad JSON
//     }
//   }, []);

//   // optional persist to localStorage
//   useEffect(() => {
//     localStorage.setItem(
//       STORAGE_KEY,
//       JSON.stringify({ streak, lingots })
//     );
//   }, [streak, lingots]);

//   return (
//     <>
//       <TopBar streak={streak} lingots={lingots} language={language} />
//       {/* 56px navbar height => pt-14 */}
//       <main className="pt-14">{children}</main>
//     </>
//   );
// }
// "use client";

// import React from "react";
// import TopBar from "./components/TopBar";

// export default function ClientShell({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <>
//       <TopBar />
//       <main className="min-h-screen bg-zinc-50 pt-16">
//         {children}
//       </main>
//     </>
//   );
// }
//////////////////////////////// start of working version //////////////////////////////

// "use client";

// import React, { useEffect, useState } from "react";
// import TopBar from "./components/TopBar";

// export default function ClientShell({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     setReady(true);
//   }, []);

//   if (!ready) return null;

//   return (
//     <>
//       <TopBar />
//       {/* Push all page content below the fixed TopBar */}
//       <main
//         style={{ paddingTop: "80px" }}   // <-- this is the key change
//         className="px-4 sm:px-6 lg:px-8"
//       >
//         {children}
//       </main>
//     </>
//   );
// }
///////////////////////////////////////////// calude v1//////////////////////////////////////////

// "use client";

// import React, { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import TopBar from "./components/TopBar";

// export default function ClientShell({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [ready, setReady] = useState(false);
//   const pathname = usePathname();
  
//   // Don't show TopBar on landing page
//   const isLandingPage = pathname === "/";

//   useEffect(() => {
//     setReady(true);
//   }, []);

//   if (!ready) return null;

//   return (
//     <>
//       {!isLandingPage && <TopBar />}
//       <main
//         style={!isLandingPage ? { paddingTop: "80px" } : {}}
//         className={!isLandingPage ? "px-4 sm:px-6 lg:px-8" : ""}
//       >
//         {children}
//       </main>
//     </>
//   );
// }


//////////////////////// Hide TopBar ////////////////////////////
"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "./components/TopBar";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  
  // Don't show TopBar on landing page or login page
  const hideTopBar = pathname === "/" || pathname === "/login";

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  // If hiding TopBar, render children directly without wrapper
  if (hideTopBar) {
    return <>{children}</>;
  }

  // Otherwise, render with TopBar and padding
  return (
    <>
      <TopBar />
      <main
        style={{ paddingTop: "80px" }}
        className="px-4 sm:px-6 lg:px-8"
      >
        {children}
      </main>
    </>
  );
}