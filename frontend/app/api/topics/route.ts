//////////////////////////// fixed topic ordering ////////////////////////////////////////
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

  // Fetch lessons with topic_order for sorting
  const { data, error } = await supabase
    .from("lessons")
    .select("topic, topic_order")
    .eq("level", level)
    .order("topic_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count titles per topic and keep the minimum topic_order for each
  const topicMap = new Map<string, { count: number; order: number }>();
  
  for (const row of data ?? []) {
    const topic = row.topic ?? "Untitled";
    const order = row.topic_order ?? 999;
    
    if (topicMap.has(topic)) {
      const existing = topicMap.get(topic)!;
      topicMap.set(topic, {
        count: existing.count + 1,
        order: Math.min(existing.order, order), // Keep the smallest order
      });
    } else {
      topicMap.set(topic, { count: 1, order });
    }
  }

  // Convert to array and sort by topic_order
  const topics = Array.from(topicMap.entries())
    .map(([topic, { count, order }]) => ({ topic, count, order }))
    .sort((a, b) => a.order - b.order);

  return NextResponse.json({ topics });
}