import { expect, test } from "vitest";
import { verifyTurnstile } from "./turnstile";

test("Turnstile fails closed without a secret or a passing check", async () => {
  const previous = process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  expect(await verifyTurnstile("token", "203.0.113.8", fetch)).toBe(false);

  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  const fetchImpl = (async () =>
    new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch;
  expect(await verifyTurnstile("token", "203.0.113.8", fetchImpl)).toBe(false);

  const pass = (async (_url: string | URL | Request, init?: RequestInit) => {
    const body = String(init?.body ?? "");
    expect(body.includes("server-secret")).toBe(true);
    expect(body.includes("token")).toBe(true);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as typeof fetch;
  expect(await verifyTurnstile("token", "203.0.113.8", pass)).toBe(true);
  expect(await verifyTurnstile("", "203.0.113.8", pass)).toBe(false);

  if (previous === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = previous;
});
