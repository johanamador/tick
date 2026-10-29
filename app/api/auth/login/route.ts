import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security";
export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return NextResponse.json(
      { error: "Request not allowed." },
      { status: 403 },
    );
  if (!isConfigured())
    return NextResponse.json(
      { error: "Your account has not been set up yet." },
      { status: 503 },
    );
  const parsed = z
    .object({
      username: z.string().trim().min(1).max(120),
      password: z.string().min(1).max(200),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Check your username and password." },
      { status: 400 },
    );
  const client = await createClient();
  const validUsername =
    parsed.data.username.toLowerCase() ===
    (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const { data, error } = await client.auth.signInWithPassword({
    email: validUsername
      ? process.env.ADMIN_LOGIN_EMAIL!
      : "invalid-login@tick.invalid",
    password: parsed.data.password,
  });
  if (error || !data.user || data.user.id !== process.env.ADMIN_USER_ID) {
    if (data.session) await client.auth.signOut();
    return NextResponse.json(
      { error: "Incorrect username or password. Try again." },
      { status: 401 },
    );
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
