import { snapshotDownload } from "@/lib/data/download";

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  request.headers.get("accept");
  const { name } = await context.params;
  return snapshotDownload(decodeURIComponent(name));
}
