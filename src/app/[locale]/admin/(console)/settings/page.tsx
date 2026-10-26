import { getTranslations } from "next-intl/server";
import { FormAlerts } from "@/components/admin/form-alerts";
import {
  removeStaff,
  saveConstituency,
  saveParty,
  saveSilenceWindow,
  saveStaff,
  takeFormError,
} from "@/lib/actions/editorial";
import { formatLedgerDate } from "@/lib/admin/format";
import { requireConsole } from "@/lib/auth/console";
import { loadRows } from "@/lib/data/editor";
import { staffRoles } from "@/lib/schemas/editorial";

type Staff = { user_id: string; role: string; display_name: string };
type Party = { id: string; name: string };
type Seat = { id: string; kind: string; number: number; name: string };
type WindowRow = {
  id: string;
  constituency_ids: string[];
  starts_at: string;
  ends_at: string;
  note: string | null;
  live: boolean;
};

export const instant = false;

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const { staff, supabase } = await requireConsole(locale);
  const t = await getTranslations("Admin");
  const codes = await takeFormError();
  if (staff.role !== "admin") return <p>{t("forbidden")}</p>;

  const [people, parties, seats, windows] = await Promise.all([
    loadRows<Staff>(supabase, "v_editor_staff", "user_id, role, display_name"),
    loadRows<Party>(supabase, "v_parties", "id, name"),
    loadRows<Seat>(supabase, "v_constituencies", "id, kind, number, name"),
    loadRows<WindowRow>(supabase, "v_editor_silence", "id, constituency_ids, starts_at, ends_at, note, live"),
  ]);

  return (
    <>
      <h2>{t("settingsTitle")}</h2>
      <FormAlerts codes={codes} saved={query.saved === "1" && codes.length === 0} />

      <h3>{t("staffTitle")}</h3>
      {!people.ok ? <p className="empty">{t("readFailed")}</p> : null}
      <ul>
        {people.rows.map((row) => (
          <li key={row.user_id}>
            {row.display_name} · {t(`roles.${row.role}`)}
            {row.user_id === staff.user_id ? null : (
              <form action={removeStaff}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="userId" value={row.user_id} />
                <label htmlFor={`remove-${row.user_id}`}>
                  {t("reason")}
                  <input id={`remove-${row.user_id}`} name="reason" required />
                </label>
                <button className="text-button" type="submit">
                  {t("remove")}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={saveStaff}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="userId">
          {t("userId")}
          <input id="userId" name="userId" required />
        </label>
        <label htmlFor="displayName">
          {t("displayName")}
          <input id="displayName" name="displayName" required />
        </label>
        <label htmlFor="role">
          {t("role")}
          <select id="role" name="role" defaultValue="editor">
            {staffRoles.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="staff-reason">
          {t("reason")}
          <input id="staff-reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("setRole")}
        </button>
      </form>

      <h3>{t("partyTitle")}</h3>
      <ul>
        {parties.rows.map((party) => (
          <li key={party.id}>
            {party.name} · {party.id}
          </li>
        ))}
      </ul>
      <form action={saveParty}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="party-id">
          {t("partyId")}
          <input id="party-id" name="id" required />
        </label>
        <label htmlFor="party-name">
          {t("partyName")}
          <input id="party-name" name="name" required />
        </label>
        <label htmlFor="party-name-te">
          {t("partyNameTe")} ({t("optional")})
          <input id="party-name-te" name="nameTe" />
        </label>
        <label htmlFor="party-reason">
          {t("reason")}
          <input id="party-reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("saveParty")}
        </button>
      </form>

      <h3>{t("seatTitle")}</h3>
      {!seats.ok ? <p className="empty">{t("readFailed")}</p> : null}
      <ul>
        {seats.rows.map((seat) => (
          <li key={seat.id}>
            {seat.name} · {seat.kind}-{seat.number} · {seat.id}
          </li>
        ))}
      </ul>
      <form action={saveConstituency}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="seat-id">
          {t("seatId")}
          <input id="seat-id" name="id" required />
        </label>
        <label htmlFor="seat-kind">
          {t("seatKind")}
          <select id="seat-kind" name="kind" defaultValue="AC">
            <option value="AC">AC</option>
            <option value="PC">PC</option>
          </select>
        </label>
        <label htmlFor="seat-number">
          {t("seatNumber")}
          <input id="seat-number" name="number" inputMode="numeric" required />
        </label>
        <label htmlFor="seat-name">
          {t("seatName")}
          <input id="seat-name" name="name" required />
        </label>
        <label htmlFor="seat-name-te">
          {t("seatNameTe")} ({t("optional")})
          <input id="seat-name-te" name="nameTe" />
        </label>
        <label htmlFor="district">
          {t("district")} ({t("optional")})
          <input id="district" name="district" />
        </label>
        <label htmlFor="seat-reason">
          {t("reason")}
          <input id="seat-reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("saveSeat")}
        </button>
      </form>

      <h3>{t("windowTitle")}</h3>
      {windows.ok && windows.rows.length === 0 ? <p className="empty">{t("emptySilence")}</p> : null}
      <ul>
        {windows.rows.map((row) => (
          <li key={row.id}>
            {row.constituency_ids.join(", ")} · {formatLedgerDate(row.starts_at)} – {formatLedgerDate(row.ends_at)}
            {row.live ? ` · ${t("silenceLive")}` : ""}
          </li>
        ))}
      </ul>
      <form action={saveSilenceWindow}>
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="window-seats">
          {t("windowConstituencies")}
          <input id="window-seats" name="constituencyIds" required />
        </label>
        <label htmlFor="window-start">
          {t("windowStart")}
          <input id="window-start" name="startsAt" type="datetime-local" required />
        </label>
        <label htmlFor="window-end">
          {t("windowEnd")}
          <input id="window-end" name="endsAt" type="datetime-local" required />
        </label>
        <label htmlFor="window-note">
          {t("windowNote")} ({t("optional")})
          <input id="window-note" name="note" />
        </label>
        <label htmlFor="window-reason">
          {t("reason")}
          <input id="window-reason" name="reason" required />
        </label>
        <button className="ink-button" type="submit">
          {t("saveWindow")}
        </button>
      </form>
    </>
  );
}
