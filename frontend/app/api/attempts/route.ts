import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()

  const {
    user_id,
    question_id,
    selected_choice_id,
    is_correct,
    time_spent_seconds
  } = body

  const { error } = await supabase.from("attempts").insert({
    user_id,
    question_id,
    selected_choice_id,
    is_correct,
    time_spent_seconds
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}