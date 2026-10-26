import {
  formatHashChain,
  publicFileKind,
  registerFile,
  sha256Hex,
  snapshotObjectName,
  toCsv,
} from "./export";
import { readRegister, readSnapshots, readView } from "./register";
import { downloadSnapshot } from "./snapshot-store";

function textFile(body: string, status: number, contentType: string, filename?: string) {
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": "no-store",
  });
  if (filename) headers.set("content-disposition", `attachment; filename="${filename}"`);
  return new Response(body, { status, headers });
}

export function notConfiguredDownload() {
  return textFile("not configured\n", 503, "text/plain; charset=utf-8");
}

export async function publicDownload(file: string) {
  const kind = publicFileKind(file);
  if (kind === null) return textFile("not found\n", 404, "text/plain; charset=utf-8");
  if (kind === "hashes") {
    const rows = await readSnapshots();
    if (!rows) return notConfiguredDownload();
    return textFile(formatHashChain(rows), 200, "text/plain; charset=utf-8");
  }
  if (kind === "register") {
    const register = await readRegister();
    if (!register) return notConfiguredDownload();
    return textFile(registerFile(register).body, 200, "application/json; charset=utf-8", "register.json");
  }
  const rows = await readView(kind);
  if (!rows) return notConfiguredDownload();
  return textFile(toCsv(kind, rows), 200, "text/csv; charset=utf-8", `${kind}.csv`);
}

export async function snapshotDownload(name: string) {
  const objectName = snapshotObjectName(`snapshots/${name}`);
  if (!objectName) return textFile("not found\n", 404, "text/plain; charset=utf-8");
  const rows = await readSnapshots();
  if (!rows) return notConfiguredDownload();
  const row = rows.find((item) => item.storagePath === `snapshots/${objectName}`);
  if (!row) return textFile("Not compiled yet\n", 404, "text/plain; charset=utf-8");
  const body = await downloadSnapshot(objectName);
  if (body === null || sha256Hex(body) !== row.sha256) return notConfiguredDownload();
  return textFile(body, 200, "application/json; charset=utf-8", objectName);
}
