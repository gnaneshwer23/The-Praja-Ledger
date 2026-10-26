import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabasePublicEnv } from "./env";

/** Server-only. Do not import this from a client component. */
export function createServiceClient(): SupabaseClient | null {
  const env = readSupabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!env || !serviceKey) return null;
  return createClient(env.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
