// import supabase from "./supabaseClient";

// export async function getQuestions() {
//   const { data, error } = await supabase
//     .from("questions")
//     .select("*");

//   if (error) {
//     console.error("ERROR:", error);
//     return null;
//   }

//   console.log("DATA:", data);
//   return data;
// }

// getQuestions();

import supabase from "./supabaseClient";

export async function getQuestions() {
  const { data, error } = await supabase.from("questions").select("*");

  if (error) {
    console.error("ERROR:", error);
    return null;
  }

  console.log("DATA:", data);
  return data;
}

getQuestions();
