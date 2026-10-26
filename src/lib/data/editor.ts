import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadRows<T>(supabase: SupabaseClient, view: string, columns: string) {
  const { data, error } = await supabase.from(view).select(columns);
  if (error || !Array.isArray(data)) return { ok: false as const, rows: [] as T[] };
  return { ok: true as const, rows: data as T[] };
}
