/** Compare the browser origin with the incoming host, not Next's internal URL. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      parsed.host.toLowerCase() === host.toLowerCase() &&
      (process.env.NODE_ENV !== "production" || parsed.protocol === "https:")
    );
  } catch {
    return false;
  }
}
