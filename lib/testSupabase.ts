import supabase from "./supabaseClient";

export async function getQuestions() {
  const { data, error } = await supabase.from("questions").select("*");
  console.log("DATA:", data);
  console.log("ERROR:", error);
}

getQuestions();
