export function rpcCode(message: string) {
  const text = message.toLowerCase();
  if (text.includes("forbidden role")) return "forbidden";
  if (text.includes("reason required")) return "reason";
  if (text.includes("tier-1")) return "tier1_url";
  if (text.includes("silence window")) return "silence";
  if (text.includes("self-approval")) return "self";
  if (text.includes("cannot change own role")) return "own_role";
  if (text.includes("cannot remove self")) return "own_remove";
  if (text.includes("personal data")) return "personal";
  if (text.includes("user not found")) return "staff_user";
  if (text.includes("display name")) return "name";
  if (text.includes("not pending")) return "save_failed";
  return "save_failed";
}
