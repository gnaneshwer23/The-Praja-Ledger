import { buildRegister, registerFile, snapshotObjectName, utcSnapshotPath } from "./export";

export const SNAPSHOT_REASON = "Nightly hash of the public register";

export type SnapshotJob = {
  authorized: boolean;
  now?: Date;
  load: () => Promise<unknown>;
  upload: (objectName: string, body: string) => Promise<boolean>;
  record: (storagePath: string, sha256: string) => Promise<void>;
  remove: (objectName: string) => Promise<void>;
};

/** Writes one public snapshot. A failed record deletes the upload and does not report success. */
export async function runSnapshotJob(job: SnapshotJob): Promise<boolean> {
  if (!job.authorized) return false;
  const storagePath = utcSnapshotPath(job.now ?? new Date());
  const objectName = snapshotObjectName(storagePath);
  if (!objectName) return false;

  const loaded = await job.load();
  if (loaded === null || loaded === undefined) return false;
  const file = registerFile(buildRegister(loaded));

  const uploaded = await job.upload(objectName, file.body);
  if (!uploaded) return false;

  try {
    await job.record(storagePath, file.sha256);
    return true;
  } catch {
    await job.remove(objectName);
    return false;
  }
}
