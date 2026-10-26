export type LaunchItemId =
  | "backups"
  | "mfa"
  | "rls"
  | "legal"
  | "publisher"
  | "domain"
  | "telugu";

export type LaunchItem = {
  id: LaunchItemId;
  met: boolean;
};

const openDecisions = new Set<LaunchItemId>(["legal", "publisher", "domain", "telugu"]);

/**
 * Legal sign-off, the publisher of record, the domain, and the Telugu review
 * stay unmet. Env flags cannot close them.
 */
export function launchChecklist(signals: {
  backupsConfirmed: boolean;
  everyStaffHasMfa: boolean;
  rlsTestsRecorded: boolean;
}): LaunchItem[] {
  const items: LaunchItem[] = [
    { id: "backups", met: signals.backupsConfirmed },
    { id: "mfa", met: signals.everyStaffHasMfa },
    { id: "rls", met: signals.rlsTestsRecorded },
    { id: "legal", met: false },
    { id: "publisher", met: false },
    { id: "domain", met: false },
    { id: "telugu", met: false },
  ];
  return items.map((item) => (openDecisions.has(item.id) ? { ...item, met: false } : item));
}

export function launchStatusKey(item: LaunchItem): "launchOpen" | "launchUnconfirmed" | "launchMet" {
  if (openDecisions.has(item.id)) return "launchOpen";
  return item.met ? "launchMet" : "launchUnconfirmed";
}
