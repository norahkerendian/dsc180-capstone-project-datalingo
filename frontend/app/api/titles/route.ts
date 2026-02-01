import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = Number(searchParams.get("level"));
  const topic = searchParams.get("topic") || "";

  if (!Number.isFinite(level) || !topic) {
    return NextResponse.json({ error: "Missing/invalid level or topic" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,slug,level,topic")
    .eq("level", level)
    .eq("topic", topic)
    .order("title", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ titles: data ?? [] });
}