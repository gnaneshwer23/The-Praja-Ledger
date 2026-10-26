import { afterEach, expect, test } from "vitest";
import { readSupabasePublicEnv } from "./env";

const keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const previous = new Map<string, string | undefined>();

afterEach(() => {
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previous.clear();
});

function setEnv(url: string | undefined, anonKey: string | undefined) {
  for (const key of keys) {
    if (!previous.has(key)) previous.set(key, process.env[key]);
  }
  if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  if (anonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
}

test("supabase auth env fails closed when the url or anon key is missing", () => {
  setEnv(undefined, undefined);
  expect(readSupabasePublicEnv()).toBeNull();
  setEnv("https://example.supabase.co", undefined);
  expect(readSupabasePublicEnv()).toBeNull();
});

test("an http supabase url is rejected", () => {
  setEnv("http://example.supabase.co", "anon-key");
  expect(readSupabasePublicEnv()).toBeNull();
});

test("https url and anon key are accepted", () => {
  setEnv("https://example.supabase.co", "anon-key");
  expect(readSupabasePublicEnv()).toEqual({
    url: "https://example.supabase.co",
    anonKey: "anon-key",
  });
});
