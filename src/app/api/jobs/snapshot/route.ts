import { revalidateTag } from "next/cache";
import { connectOwner } from "@/lib/db/owner";
import { cronAuthorized } from "@/lib/data/export";
import { queryRegister } from "@/lib/data/register";
import { runSnapshotJob, SNAPSHOT_REASON } from "@/lib/data/snapshot-job";
import { removeSnapshot, uploadSnapshot } from "@/lib/data/snapshot-store";

function refused() {
  return Response.json({ ok: false }, { status: 503 });
}

async function handle(request: Request) {
  if (!cronAuthorized(process.env.CRON_SECRET, request.headers.get("authorization"))) return refused();
  const client = await connectOwner();
  if (!client) return refused();
  try {
    const ready = await client.query<{ fn: string | null }>(
      "select to_regprocedure('public.rpc_record_snapshot(text,text,text)')::text as fn",
    );
    if (!ready.rows[0]?.fn) return refused();
    const ok = await runSnapshotJob({
      authorized: true,
      load: async () => {
        try {
          return await queryRegister(client);
        } catch {
          return null;
        }
      },
      upload: uploadSnapshot,
      record: async (storagePath, sha256) => {
        await client.query("select public.rpc_record_snapshot($1, $2, $3)", [
          storagePath,
          sha256,
          SNAPSHOT_REASON,
        ]);
      },
      remove: removeSnapshot,
    });
    if (!ok) return refused();
    revalidateTag("data", { expire: 0 });
    return Response.json({ ok: true });
  } catch {
    return refused();
  } finally {
    await client.end();
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
