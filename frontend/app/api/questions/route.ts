// import { NextResponse } from "next/server";
// import { supabase } from "@/lib/supabaseClient";

// export async function GET() {
//   const { data, error } = await supabase
//     .from("questions")
//     .select("*");

//   return NextResponse.json({ data, error });
// }
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only
)

export async function GET() {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("id", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}