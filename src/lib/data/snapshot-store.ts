import { createServiceClient } from "@/lib/auth/service";

function bucket() {
  const service = createServiceClient();
  if (!service) return null;
  return service.storage.from("snapshots");
}

export async function uploadSnapshot(objectName: string, body: string) {
  const storage = bucket();
  if (!storage) return false;
  const uploaded = await storage.upload(objectName, Buffer.from(body, "utf8"), {
    contentType: "application/json; charset=utf-8",
    upsert: false,
  });
  return !uploaded.error;
}

export async function removeSnapshot(objectName: string) {
  const storage = bucket();
  if (!storage) return;
  await storage.remove([objectName]);
}

export async function downloadSnapshot(objectName: string) {
  const storage = bucket();
  if (!storage) return null;
  const downloaded = await storage.download(objectName);
  if (downloaded.error || !downloaded.data) return null;
  return downloaded.data.text();
}
