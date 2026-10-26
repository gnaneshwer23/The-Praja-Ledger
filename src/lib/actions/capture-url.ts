import { createHash } from "node:crypto";

const MAX_BYTES = 5_000_000;

export class CaptureError extends Error {
  constructor(readonly code: "url" | "fetch" | "size") {
    super(code);
  }
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function isBlockedSourceHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if ([a, b, Number(match[3]), Number(match[4])].some((part) => part > 255)) return true;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export async function readSourceDocument(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new CaptureError("url");
  }
  if (url.protocol !== "https:" || isBlockedSourceHost(url.hostname)) {
    throw new CaptureError("url");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "text/html,application/pdf;q=0.9,*/*;q=0.1" },
    });
  } catch {
    throw new CaptureError("fetch");
  }

  let finalUrl: URL;
  try {
    finalUrl = new URL(response.url);
  } catch {
    throw new CaptureError("url");
  }
  if (finalUrl.protocol !== "https:" || isBlockedSourceHost(finalUrl.hostname) || !response.ok) {
    throw new CaptureError(response.ok ? "url" : "fetch");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new CaptureError("fetch");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new CaptureError("size");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const type = response.headers.get("content-type") ?? "";
  const extension = type.includes("pdf") || finalUrl.pathname.toLowerCase().endsWith(".pdf") ? "pdf" : "html";
  return {
    bytes,
    sha256: sha256Hex(bytes),
    extension,
    contentType: extension === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
  } as const;
}
