import { cronAuthorized } from "@/lib/data/export";
import { notifySnapshotFailure } from "@/lib/observability/alert";

function refused() {
  return Response.json({ ok: false }, { status: 503 });
}

async function handle(request: Request) {
  if (!cronAuthorized(process.env.CRON_SECRET, request.headers.get("authorization"))) return refused();
  const sent = await notifySnapshotFailure({
    authorized: true,
    detail: "Nightly snapshot failed",
    alertUrl: process.env.SNAPSHOT_ALERT_URL,
  });
  if (!sent.ok) return refused();
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
