import { expect, test } from "vitest";
import {
  canonicalJson,
  cronAuthorized,
  formatHashChain,
  labelFromSnapshotPath,
  PUBLIC_COLUMNS,
  publicFileKind,
  sha256Hex,
  snapshotBody,
  toCsv,
  utcSnapshotPath,
} from "./export";

const person = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "sample",
  name: "Sample person",
  name_te: null,
  party_id: null,
  role: null,
  constituency_id: null,
  status_note: null,
  created_at: "2026-10-26T00:00:00.000000Z",
  updated_at: "2026-10-26T00:00:00.000000Z",
};

test("a public field change changes the snapshot hash", () => {
  const first = snapshotBody({ people: [person] });
  const second = snapshotBody({ people: [{ ...person, name: "Sample person renamed" }] });
  expect(sha256Hex(first)).not.toBe(sha256Hex(second));
  expect(first).toContain("Sample person");
  expect(second).toContain("Sample person renamed");
});

test("private fields stay out of the snapshot and do not change the hash", () => {
  const clean = snapshotBody({ people: [person] });
  const leaked = snapshotBody({
    people: [{
      ...person,
      contact_email: "hidden@example.com",
      office_email: "office@example.com",
      ip_hash: "abc123",
      address: "secret road",
      phone: "9000000000",
      phone_number: "9000000001",
      family: "a child",
      family_details: "names",
    }],
    corrections: [{ contact_email: "queue@example.com", body: "not public" }],
  });
  expect(leaked).toBe(clean);
  expect(leaked).not.toContain("hidden@example.com");
  expect(leaked).not.toContain("office@example.com");
  expect(leaked).not.toContain("secret road");
  expect(leaked).not.toContain("9000000000");
  expect(leaked).not.toContain("queue@example.com");
  expect(leaked).not.toContain("not public");
  expect(sha256Hex(leaked)).toBe(sha256Hex(clean));
});

test("draft rows and audit payloads are left out of the snapshot", () => {
  const body = snapshotBody({
    entries: [
      { id: "1", body: "Public line", status: "published", contact_email: "hidden@example.com" },
      { id: "2", body: "Draft line", status: "draft", contact_email: "draft@example.com" },
    ],
    cases: [{
      id: "case-1",
      slug: "sample-case",
      title: "Sample case",
      summary: null,
      party_id: null,
      state: "pending",
      events: [
        { id: "event-1", stage_idx: 0, event_date: "2026-10-01", note: "Public event", source_id: "source-1", created_at: "2026-10-01T00:00:00.000000Z", status: "published" },
        { id: "event-2", note: "Draft event", status: "draft", contact_email: "event@example.com" },
      ],
    }],
    changelog: [{
      id: "9",
      at: "2026-10-26T00:00:00.000000Z",
      actor_name: "Editor",
      table_name: "entries",
      row_id: "1",
      action: "update",
      reason: "Fix a date",
      before: { contact_email: "before@example.com" },
      after: { phone: "9000000000", body: "Public line" },
    }],
    datasets: [{
      key: "finance",
      data: { note: "Debt figure", contact_email: "data@example.com" },
      source_ids: [],
      updated_at: "2026-10-26T00:00:00.000000Z",
    }],
  });
  expect(body).toContain("Public line");
  expect(body).toContain("Public event");
  expect(body).toContain("Fix a date");
  expect(body).toContain("Debt figure");
  expect(body).not.toContain("Draft line");
  expect(body).not.toContain("Draft event");
  expect(body).not.toContain("hidden@example.com");
  expect(body).not.toContain("draft@example.com");
  expect(body).not.toContain("event@example.com");
  expect(body).not.toContain("before@example.com");
  expect(body).not.toContain("9000000000");
  expect(body).not.toContain("data@example.com");
});

test("the hash chain is a sha256sum text file", () => {
  const chain = formatHashChain([
    { sha256: "ab".repeat(32), storagePath: "snapshots/2026-10-26.json" },
  ]);
  expect(chain).toBe(`${"ab".repeat(32)}  snapshots/2026-10-26.json\n`);
  expect(labelFromSnapshotPath("snapshots/2026-10-26.json")).toBe("26 Oct 2026");
  expect(labelFromSnapshotPath("snapshots/2026-13-01.json")).toBeNull();
  expect(utcSnapshotPath(new Date("2026-10-26T18:30:00.000Z"))).toBe("snapshots/2026-10-26.json");
});

test("csv keeps public columns and escapes commas", () => {
  const csv = toCsv("people", [{ ...person, name: 'A, "Bee"' }]);
  expect(csv.split("\n")[0]).toBe("id,slug,name,name_te,party_id,role,constituency_id,status_note,created_at,updated_at");
  expect(csv).toContain('"A, ""Bee"""');
  expect(csv).not.toContain("contact_email");
});

test("canonical json sorts keys and ends with a newline", () => {
  expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}\n');
});

test("download names are limited to public files", () => {
  expect(publicFileKind("hashes.txt")).toBe("hashes");
  expect(publicFileKind("register.json")).toBe("register");
  expect(publicFileKind("people.csv")).toBe("people");
  expect(publicFileKind("case_stages.csv")).toBe("case_stages");
  expect(publicFileKind("corrections.csv")).toBeNull();
  expect(publicFileKind("people.csv.txt")).toBeNull();
  expect(publicFileKind("../people.csv")).toBeNull();
  const columns = Object.values(PUBLIC_COLUMNS).flat();
  for (const key of ["contact_email", "office_email", "ip_hash", "address", "phone", "before", "after"]) {
    expect(columns).not.toContain(key);
  }
});

test("an affidavit row without a url or page stays out of the register", () => {
  const body = snapshotBody({
    affidavits: [
      {
        id: "1",
        constituency_id: "ac-kodangal",
        year: 2023,
        page_number: 4,
        source_url: "https://eci.gov.in/kept.pdf",
        assets_inr: 10,
      },
      {
        id: "2",
        constituency_id: "ac-kodangal",
        year: 2024,
        page_number: null,
        source_url: "https://eci.gov.in/missing-page.pdf",
        assets_inr: 99,
      },
    ],
    affidavit_changes: [
      { id: "c1", label: "Imported change", formula: "1 - 0 = 1", constituency_id: "ac-kodangal" },
    ],
  });
  expect(body).toContain("https://eci.gov.in/kept.pdf");
  expect(body).not.toContain("missing-page.pdf");
  expect(body).not.toContain("Imported change");
});

test("the snapshot job fails closed without a cron secret", () => {
  expect(cronAuthorized(undefined, "Bearer secret")).toBe(false);
  expect(cronAuthorized("  ", "Bearer secret")).toBe(false);
  expect(cronAuthorized("secret", null)).toBe(false);
  expect(cronAuthorized("secret", "Bearer other")).toBe(false);
  expect(cronAuthorized(" secret ", "Bearer secret")).toBe(true);
});
