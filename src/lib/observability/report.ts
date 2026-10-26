const secretLike =
  /(?:postgres(?:ql)?:\/\/\S+|bearer\s+\S+|service[_-]?role|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/gi;

export function scrubError(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value ?? "");
  return raw.replace(secretLike, "[redacted]").slice(0, 400);
}

export async function reportFailure(scope: "server_action" | "cron", error: unknown): Promise<void> {
  const message = scrubError(error);
  console.error(JSON.stringify({ scope, message }));
}
