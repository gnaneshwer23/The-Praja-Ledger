import { afterEach, expect, test } from "vitest";
import { hashIp, publicFormConfigured, readClientIp, turnstileAccepted } from "./guards";

const previous = {
  site: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  secret: process.env.TURNSTILE_SECRET_KEY,
  salt: process.env.FORM_IP_SALT,
  database: process.env.DATABASE_URL,
};

afterEach(() => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = previous.site;
  process.env.TURNSTILE_SECRET_KEY = previous.secret;
  process.env.FORM_IP_SALT = previous.salt;
  process.env.DATABASE_URL = previous.database;
});

test("the IP hash is stable and does not keep the address", () => {
  const hash = hashIp("203.0.113.8", "salt-value");
  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  expect(hash).toBe(hashIp("203.0.113.8", "salt-value"));
  expect(hash).not.toBe(hashIp("203.0.113.9", "salt-value"));
  expect(hash.includes("203.0.113.8")).toBe(false);
});

test("the client address is the first forwarded hop", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" });
  expect(readClientIp(headers)).toBe("198.51.100.4");
  expect(readClientIp(new Headers())).toBeNull();
});

test("public forms stay closed until the bot check and database are set", () => {
  delete process.env.TURNSTILE_SECRET_KEY;
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site";
  process.env.FORM_IP_SALT = "salt";
  process.env.DATABASE_URL = "postgres://local";
  expect(publicFormConfigured()).toBe(false);
  process.env.TURNSTILE_SECRET_KEY = "secret";
  expect(publicFormConfigured()).toBe(true);
});

test("a Turnstile payload counts only when success is true", () => {
  expect(turnstileAccepted({ success: true })).toBe(true);
  expect(turnstileAccepted({ success: false })).toBe(false);
  expect(turnstileAccepted(null)).toBe(false);
});
