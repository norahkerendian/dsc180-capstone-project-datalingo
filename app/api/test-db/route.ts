import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data, error } = await supabase
    .from("questions")
    .select("*");

  return NextResponse.json({ data, error });
}
