import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lessonId = Number(searchParams.get("lessonId"));

  if (!Number.isFinite(lessonId)) {
    return NextResponse.json({ error: "Invalid lessonId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,topic,level,content_md,unmodified_content_md,metadata")
    .eq("id", lessonId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lesson: data });
}