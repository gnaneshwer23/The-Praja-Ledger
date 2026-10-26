import { expect, test } from "vitest";
import { rpcCode } from "./rpc-error";

test("database errors map to form codes", () => {
  expect(rpcCode("forbidden role")).toBe("forbidden");
  expect(rpcCode("tier-1 source requires a url")).toBe("tier1_url");
  expect(rpcCode("self-approval")).toBe("self");
  expect(rpcCode("silence window")).toBe("silence");
  expect(rpcCode("rate limit")).toBe("rate");
  expect(rpcCode("correction queue full")).toBe("queue");
  expect(rpcCode("office domain refused")).toBe("domain");
  expect(rpcCode("something else")).toBe("save_failed");
});
