import { connectOwner } from "../db/owner";

export type LiveSilence = {
  id: string;
  constituencyIds: string[];
  endsAt: string;
};

export function silenceSeatLabels(ids: readonly string[], names: ReadonlyMap<string, string>): string {
  return ids.map((id) => names.get(id) ?? id).join(", ");
}

export async function readLiveSilence(): Promise<LiveSilence[]> {
  const client = await connectOwner();
  if (!client) return [];
  try {
    const result = await client.query<{
      id: string;
      constituency_ids: string[] | null;
      ends_at: Date | string;
    }>("select id::text, constituency_ids, ends_at from public.v_live_silence order by ends_at asc");
    return result.rows.flatMap((row) => {
      const constituencyIds = Array.isArray(row.constituency_ids)
        ? row.constituency_ids.filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];
      if (!row.id || constituencyIds.length === 0) return [];
      const endsAt = row.ends_at instanceof Date ? row.ends_at.toISOString() : String(row.ends_at ?? "");
      if (!endsAt) return [];
      return [{ id: row.id, constituencyIds, endsAt }];
    });
  } catch {
    return [];
  } finally {
    await client.end();
  }
}
