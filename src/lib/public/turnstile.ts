import { turnstileAccepted } from "./guards";

export async function verifyTurnstile(
  token: string,
  ip: string,
  fetchImpl: typeof fetch = fetch,
) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  if (!secret || !token.trim()) return false;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  const response = await fetchImpl("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const payload: unknown = await response.json();
  return turnstileAccepted(payload);
}
