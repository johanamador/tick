import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/server";
import { tmdbBackdrop } from "@/lib/overview";
import { z } from "zod";

const requestInput = z.object({
  kind: z.enum(["movie", "series"]),
  id: z.coerce.number().int().min(1).max(2147483647),
});

export async function GET(request: Request) {
  if (!(await getAdmin()))
    return NextResponse.json({ error: "Sign in to search." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const parsed = requestInput.safeParse({
    kind: params.get("kind"),
    id: params.get("id"),
  });
  if (!parsed.success)
    return NextResponse.json({ backdrop_url: null }, { status: 400 });
  if (!process.env.TMDB_READ_TOKEN)
    return NextResponse.json({ backdrop_url: null });
  const { kind, id } = parsed.data;
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/${kind === "movie" ? "movie" : "tv"}/${id}/images?include_image_language=null,en`,
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
        signal: AbortSignal.timeout(7000),
        next: { revalidate: 86400 },
      },
    );
    const backdrop_url = response.ok
      ? tmdbBackdrop(await response.json())
      : null;
    return NextResponse.json(
      { backdrop_url },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch {
    return NextResponse.json({ backdrop_url: null });
  }
}
