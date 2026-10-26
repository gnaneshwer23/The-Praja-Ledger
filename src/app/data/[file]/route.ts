import { publicDownload } from "@/lib/data/download";

export async function GET(
  request: Request,
  context: { params: Promise<{ file: string }> },
) {
  request.headers.get("accept");
  const { file } = await context.params;
  return publicDownload(decodeURIComponent(file));
}
