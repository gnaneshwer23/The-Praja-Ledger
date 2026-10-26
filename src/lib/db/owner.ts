import pg from "pg";

function withoutChannelBinding(url: string) {
  let next = url
    .replace(/([?&])channel_binding=[^&]*/g, "$1")
    .replace("?&", "?")
    .replace(/&&/g, "&")
    .replace(/[?&]$/, "");
  if (/[?&]sslmode=/.test(next)) {
    next = next.replace(/([?&])sslmode=[^&]*/g, "$1sslmode=require");
  } else {
    next += `${next.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return next;
}

async function open(connectionString: string) {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: true },
  });
  await client.connect();
  return client;
}

/** Owner connection for route handlers. Returns null when the database cannot be reached. */
export async function connectOwner() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) return null;
  try {
    return await open(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (url.includes("channel_binding") && /channel.?binding|password authentication/i.test(message)) {
      try {
        return await open(withoutChannelBinding(url));
      } catch {
        return null;
      }
    }
    return null;
  }
}
