import { reportFailure, scrubError } from "./report";

export async function notifySnapshotFailure(input: {
  authorized: boolean;
  detail: string;
  alertUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean }> {
  if (!input.authorized) return { ok: false };
  const detail = scrubError(input.detail);
  await reportFailure("cron", detail);
  const url = input.alertUrl?.trim() ?? "";
  if (!url.startsWith("https://")) return { ok: false };
  try {
    const response = await (input.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "snapshot_failed", detail }),
    });
    return { ok: response.ok };
  } catch (error) {
    await reportFailure("cron", error);
    return { ok: false };
  }
}
