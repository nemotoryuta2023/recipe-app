import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Recipe } from "./types";

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function listRecipes(): Promise<Recipe[]> {
  const { data, error } = await db().from("recipes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await db().from("recipes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Recipe) ?? null;
}

export async function insertRecipe(r: Omit<Recipe, "id" | "created_at">): Promise<Recipe> {
  const { data, error } = await db().from("recipes").insert(r).select("*").single();
  if (error) throw new Error(error.message);
  return data as Recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await db().from("recipes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
