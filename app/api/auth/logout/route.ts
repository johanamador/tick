import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const client = await createClient();
  await client.auth.signOut();
  return NextResponse.json({ ok: true });
}
