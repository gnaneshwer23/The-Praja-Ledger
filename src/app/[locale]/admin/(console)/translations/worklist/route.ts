import { readFileSync } from "node:fs";
import path from "node:path";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";
import { gapRows, messageReviewRows, worklistCsv } from "@/lib/import/translation";

export const instant = false;

type GapRow = {
  kind: string;
  entity_key: string;
  field: string;
  english: string | null;
};

export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;
  const { supabase } = await requireConsole(locale);
  const english = JSON.parse(readFileSync(path.join(process.cwd(), "messages/en.json"), "utf8")) as unknown;
  const telugu = JSON.parse(readFileSync(path.join(process.cwd(), "messages/te.json"), "utf8")) as unknown;
  const gaps = await loadRows<GapRow>(
    supabase,
    "v_editor_translation_gaps",
    "kind, entity_key, field, english",
  );
  const csv = worklistCsv([
    ...messageReviewRows(english, telugu),
    ...(gaps.ok ? gapRows(gaps.rows) : []),
  ]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"praja-ledger-telugu-review.csv\"",
      "cache-control": "no-store",
    },
  });
}
