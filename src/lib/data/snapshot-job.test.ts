import { expect, test } from "vitest";
import { sha256Hex, snapshotBody } from "./export";
import { runSnapshotJob } from "./snapshot-job";

const person = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "sample",
  name: "Sample person",
};

test("a public field change changes the recorded snapshot hash", async () => {
  const hashes: string[] = [];
  for (const name of ["Sample person", "Sample person renamed"]) {
    const ok = await runSnapshotJob({
      authorized: true,
      now: new Date("2026-10-26T18:30:00.000Z"),
      load: async () => ({ people: [{ ...person, name }] }),
      upload: async () => true,
      record: async (_path, sha256) => {
        hashes.push(sha256);
      },
      remove: async () => {},
    });
    expect(ok).toBe(true);
  }
  expect(hashes[0]).not.toBe(hashes[1]);
});

test("private fields are left out of the uploaded snapshot", async () => {
  let uploaded = "";
  let recorded = "";
  const ok = await runSnapshotJob({
    authorized: true,
    now: new Date("2026-10-26T18:30:00.000Z"),
    load: async () => ({
      people: [{
        ...person,
        contact_email: "hidden@example.com",
        phone: "9000000000",
        address: "secret road",
        family: "a child",
      }],
      corrections: [{ contact_email: "queue@example.com" }],
    }),
    upload: async (_name, body) => {
      uploaded = body;
      return true;
    },
    record: async (path, sha256) => {
      recorded = `${sha256}  ${path}`;
    },
    remove: async () => {},
  });
  const clean = snapshotBody({ people: [person] });
  expect(ok).toBe(true);
  expect(uploaded).toBe(clean);
  expect(uploaded).not.toContain("hidden@example.com");
  expect(uploaded).not.toContain("9000000000");
  expect(uploaded).not.toContain("queue@example.com");
  expect(recorded).toBe(`${sha256Hex(clean)}  snapshots/2026-10-26.json`);
});

test("the snapshot job does not upload when it is not authorized or the register is missing", async () => {
  let calls = 0;
  const touch = async () => {
    calls += 1;
    return true;
  };
  expect(await runSnapshotJob({
    authorized: false,
    load: async () => {
      calls += 1;
      return {};
    },
    upload: touch,
    record: async () => {
      calls += 1;
    },
    remove: async () => {
      calls += 1;
    },
  })).toBe(false);
  expect(await runSnapshotJob({
    authorized: true,
    load: async () => null,
    upload: touch,
    record: async () => {
      calls += 1;
    },
    remove: async () => {
      calls += 1;
    },
  })).toBe(false);
  expect(calls).toBe(0);
});

test("a failed snapshot record removes the upload and does not report success", async () => {
  const removed: string[] = [];
  const ok = await runSnapshotJob({
    authorized: true,
    now: new Date("2026-10-26T18:30:00.000Z"),
    load: async () => ({ people: [person] }),
    upload: async () => true,
    record: async () => {
      throw new Error("snapshot exists");
    },
    remove: async (name) => {
      removed.push(name);
    },
  });
  expect(ok).toBe(false);
  expect(removed).toEqual(["2026-10-26.json"]);
});
