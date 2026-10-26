export function rpcCode(message: string) {
  const text = message.toLowerCase();
  if (text.includes("password authentication") || text.includes("econnrefused") || text.includes("getaddrinfo")) {
    return "not_configured";
  }
  if (text.includes("forbidden role")) return "forbidden";
  if (text.includes("reason required")) return "reason";
  if (text.includes("page number")) return "page";
  if (text.includes("tier-1")) return "tier1_url";
  if (text.includes("https url")) return "url";
  if (text.includes("email refused")) return "email";
  if (text.includes("rate limit")) return "rate";
  if (text.includes("correction queue")) return "queue";
  if (text.includes("record not found")) return "record";
  if (text.includes("office domain")) return "domain";
  if (text.includes("signed letter")) return "letter";
  if (text.includes("reply is published unedited")) return "unedited";
  if (text.includes("ip hash required")) return "not_configured";
  if (text.includes("silence window")) return "silence";
  if (text.includes("telugu required")) return "telugu";
  if (text.includes("blocked wording")) return "wording";
  if (text.includes("already staged")) return "staged";
  if (text.includes("invalid translation")) return "record";
  if (text.includes("self-approval")) return "self";
  if (text.includes("cannot change own role")) return "own_role";
  if (text.includes("cannot remove self")) return "own_remove";
  if (text.includes("personal data")) return "personal";
  if (text.includes("user not found")) return "staff_user";
  if (text.includes("display name")) return "name";
  if (text.includes("not pending")) return "save_failed";
  return "save_failed";
}
