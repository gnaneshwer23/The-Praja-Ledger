import { expect, test } from "vitest";
import { notifySnapshotFailure } from "./alert";
import { scrubError } from "./report";

test("a snapshot alert does nothing successful without authorization", async () => {
  let called = 0;
  const result = await notifySnapshotFailure({
    authorized: false,
    detail: "snapshot failed",
    alertUrl: "https://alerts.example/hook",
    fetchImpl: async () => {
      called += 1;
      return new Response("ok");
    },
  });
  expect(result.ok).toBe(false);
  expect(called).toBe(0);
});

test("a snapshot alert refuses a non-https destination", async () => {
  let called = 0;
  const result = await notifySnapshotFailure({
    authorized: true,
    detail: "snapshot failed",
    alertUrl: "http://alerts.example/hook",
    fetchImpl: async () => {
      called += 1;
      return new Response("ok");
    },
  });
  expect(result.ok).toBe(false);
  expect(called).toBe(0);
});

test("a snapshot alert sends a scrubbed notice", async () => {
  let body = "";
  const result = await notifySnapshotFailure({
    authorized: true,
    detail: "postgres://owner:secret@db.example/praja Bearer abc.def.ghi",
    alertUrl: "https://alerts.example/hook",
    fetchImpl: async (_url, init) => {
      body = String(init?.body ?? "");
      return new Response(null, { status: 204 });
    },
  });
  expect(result.ok).toBe(true);
  expect(body).toContain("snapshot_failed");
  expect(body).not.toContain("secret");
  expect(body).not.toContain("postgres://");
  expect(body).not.toContain("Bearer");
  expect(scrubError("service_role key")).toBe("[redacted] key");
});
