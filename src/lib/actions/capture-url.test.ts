import { expect, test } from "vitest";
import { isBlockedSourceHost, sha256Hex } from "./capture-url";

test("sha256 of abc matches the known digest", () => {
  expect(sha256Hex(new TextEncoder().encode("abc"))).toBe(
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("source capture rejects local and private hosts", () => {
  expect(isBlockedSourceHost("localhost")).toBe(true);
  expect(isBlockedSourceHost("127.0.0.1")).toBe(true);
  expect(isBlockedSourceHost("10.1.1.1")).toBe(true);
  expect(isBlockedSourceHost("192.168.0.8")).toBe(true);
  expect(isBlockedSourceHost("169.254.169.254")).toBe(true);
  expect(isBlockedSourceHost("eci.gov.in")).toBe(false);
});
