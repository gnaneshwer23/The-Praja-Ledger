export const SESSION_COOKIE = "pl_session_started";
export const SESSION_LIMIT_MS = 12 * 60 * 60 * 1000;

export type AccessDecision =
  | "allow"
  | "unconfigured"
  | "signed_out"
  | "mfa_required"
  | "session_expired";

export function adminAccess(input: {
  configured: boolean;
  userId: string | null;
  currentLevel: string | null;
  sessionStartedAt: number | null;
  now: number;
}): AccessDecision {
  if (!input.configured) return "unconfigured";
  if (!input.userId) return "signed_out";
  if (
    input.sessionStartedAt == null ||
    !Number.isFinite(input.sessionStartedAt) ||
    input.sessionStartedAt > input.now ||
    input.now - input.sessionStartedAt > SESSION_LIMIT_MS
  ) {
    return "session_expired";
  }
  if (input.currentLevel !== "aal2") return "mfa_required";
  return "allow";
}

export function isAdminPath(pathname: string) {
  return /^\/(en|te)\/admin(\/|$)/.test(pathname);
}

export function isAdminPublicPath(pathname: string) {
  return /^\/(en|te)\/admin\/(sign-in|auth)(\/|$)/.test(pathname);
}
