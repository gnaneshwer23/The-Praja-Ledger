import { expect, test } from "vitest";
import { SESSION_LIMIT_MS, adminAccess } from "./gate";

const now = Date.UTC(2026, 9, 26, 9, 0, 0);

test("admin access fails closed without supabase auth configuration", () => {
  expect(
    adminAccess({
      configured: false,
      userId: "user",
      currentLevel: "aal2",
      sessionStartedAt: now,
      now,
    }),
  ).toBe("unconfigured");
});

test("a magic link without authenticator assurance does not open the console", () => {
  expect(
    adminAccess({
      configured: true,
      userId: "user",
      currentLevel: "aal1",
      sessionStartedAt: now,
      now,
    }),
  ).toBe("mfa_required");
});

test("aal2 inside twelve hours is allowed", () => {
  expect(
    adminAccess({
      configured: true,
      userId: "user",
      currentLevel: "aal2",
      sessionStartedAt: now - 60_000,
      now,
    }),
  ).toBe("allow");
});

test("a session older than twelve hours is expired", () => {
  expect(
    adminAccess({
      configured: true,
      userId: "user",
      currentLevel: "aal2",
      sessionStartedAt: now - SESSION_LIMIT_MS - 1,
      now,
    }),
  ).toBe("session_expired");
});

test("a missing user is signed out", () => {
  expect(
    adminAccess({
      configured: true,
      userId: null,
      currentLevel: "aal2",
      sessionStartedAt: now,
      now,
    }),
  ).toBe("signed_out");
});
