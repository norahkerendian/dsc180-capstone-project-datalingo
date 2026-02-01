import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = Number(searchParams.get("level"));

  if (!Number.isFinite(level)) {
    return NextResponse.json({ error: "Invalid level" }, { status: 400 });
  }

  // lessons table has: level (int), topic (text), title (text)
  const { data, error } = await supabase
    .from("lessons")
    .select("topic")
    .eq("level", level);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count titles per topic
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const topic = row.topic ?? "Untitled";
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }

  const topics = Array.from(counts.entries()).map(([topic, count]) => ({ topic, count }));
  topics.sort((a, b) => a.topic.localeCompare(b.topic));

  return NextResponse.json({ topics });
}