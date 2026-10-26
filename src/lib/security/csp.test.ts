import { expect, test } from "vitest";
import { contentSecurityPolicy } from "./csp";

test("the content security policy is enforceable and omits unsafe-eval", () => {
  for (const nodeEnv of ["development", "production", "test"]) {
    const policy = contentSecurityPolicy({
      nodeEnv,
      supabaseUrl: "https://example.supabase.co",
    });
    expect(policy).not.toMatch(/unsafe-eval/i);
    expect(policy).not.toMatch(/report-only/i);
    expect(policy).not.toContain("service_role");
    expect(policy).not.toContain("postgres");
    expect(policy).not.toContain("DATABASE_URL");
    expect(policy).toContain("https://challenges.cloudflare.com");
    expect(policy).toContain("https://example.supabase.co");
    expect(policy).not.toContain("https://*.supabase.co");
  }
});

test("a database url is not added as a browser connect host", () => {
  const policy = contentSecurityPolicy({
    nodeEnv: "production",
    supabaseUrl: "postgresql://owner:secret@db.example/praja",
  });
  expect(policy).not.toContain("db.example");
  expect(policy).not.toContain("secret");
  expect(policy).toContain("upgrade-insecure-requests");
});

test("development keeps the policy enforceable without upgrading localhost", () => {
  const policy = contentSecurityPolicy({ nodeEnv: "development" });
  expect(policy).not.toContain("upgrade-insecure-requests");
  expect(policy).not.toContain("supabase.co");
});
