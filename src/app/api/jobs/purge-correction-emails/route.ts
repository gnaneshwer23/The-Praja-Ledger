import { connectOwner } from "@/lib/db/owner";
import { reportFailure } from "@/lib/observability/report";

const reason = "Null contact emails 90 days after a decision";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const header = request.headers.get("authorization") ?? "";
  if (!secret || header !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 503 });
  }
  const client = await connectOwner();
  if (!client) return Response.json({ ok: false }, { status: 503 });
  try {
    await client.query("select public.rpc_purge_correction_emails($1)", [reason]);
    return Response.json({ ok: true });
  } catch (error) {
    await reportFailure("cron", error);
    return Response.json({ ok: false }, { status: 503 });
  } finally {
    await client.end();
  }
}
