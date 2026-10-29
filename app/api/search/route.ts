import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabase/server";
import { kindSchema } from "@/lib/validation";
import type { MetadataResult } from "@/lib/types";
import { steamResults } from "@/lib/games";
export async function GET(request: Request) {
  if (!(await getAdmin()))
    return NextResponse.json({ error: "Sign in to search." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const locale = params.get("lang") === "es" ? "es" : "en";
  const query = (params.get("q") || "").trim().slice(0, 180);
  const parsed = kindSchema.safeParse(params.get("kind"));
  if (!parsed.success || query.length < 2)
    return NextResponse.json({ results: [] });
  const kind = parsed.data;
  const options = {
    signal: AbortSignal.timeout(9000),
    next: { revalidate: 86400 },
  };
  try {
    let results: MetadataResult[] = [];
    if (kind === "movie" || kind === "series") {
      if (!process.env.TMDB_READ_TOKEN)
        return NextResponse.json({
          results: [],
          notice:
            "Movie and TV search is not configured. You can add titles manually.",
        });
      const response = await fetch(
        `https://api.themoviedb.org/3/search/${kind === "movie" ? "movie" : "tv"}?query=${encodeURIComponent(query)}&language=${locale === "es" ? "es-ES" : "en-US"}&include_adult=false`,
        {
          ...options,
          headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
        },
      );
      if (!response.ok) throw new Error("provider");
      const data = await response.json();
      results = (data.results || [])
        .slice(0, 12)
        .map((item: Record<string, unknown>) => ({
          kind,
          title: String(item.title || item.name),
          year: String(item.release_date || item.first_air_date || "").slice(
            0,
            4,
          ),
          subtitle: String(item.original_title || item.original_name || ""),
          cover_url: item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : null,
          source: "tmdb",
          external_id: String(item.id),
        }));
    } else if (kind === "game") {
      const response = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=${locale === "es" ? "spanish" : "english"}&cc=US`,
        options,
      );
      if (!response.ok) throw new Error("provider");
      const data = await response.json();
      results = steamResults(data.items || []);
    } else if (kind === "book" || kind === "comic") {
      if (kind === "comic" && process.env.COMIC_VINE_API_KEY) {
        const response = await fetch(
          `https://comicvine.gamespot.com/api/search/?api_key=${encodeURIComponent(process.env.COMIC_VINE_API_KEY)}&format=json&resources=volume&limit=12&query=${encodeURIComponent(query)}&field_list=id,name,start_year,publisher,image`,
          options,
        );
        if (!response.ok) throw new Error("provider");
        const data = await response.json();
        if (data.status_code !== 1) throw new Error("provider");
        results = (data.results || []).map(
          (item: {
            id: number;
            name: string;
            start_year: string;
            publisher?: {
              name: string;
            };
            image?: {
              small_url: string;
            };
          }) => ({
            kind,
            title: item.name,
            year: item.start_year || "",
            subtitle: item.publisher?.name || "",
            cover_url: item.image?.small_url || null,
            source: "comicvine",
            external_id: String(item.id),
          }),
        );
      } else {
        const response = await fetch(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i`,
          {
            ...options,
            headers: {
              "User-Agent": "Tick/0.1 (personal media checklist)",
            },
          },
        );
        if (!response.ok) throw new Error("provider");
        const data = await response.json();
        results = (data.docs || []).map(
          (item: {
            key: string;
            title: string;
            first_publish_year?: number;
            author_name?: string[];
            cover_i?: number;
          }) => ({
            kind,
            title: item.title,
            year: String(item.first_publish_year || ""),
            subtitle: item.author_name?.slice(0, 2).join(", ") || "",
            cover_url: item.cover_i
              ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`
              : null,
            source: "openlibrary",
            external_id: item.key,
          }),
        );
      }
    }
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "The catalog did not respond. Try again or add the title manually.",
      },
      { status: 502 },
    );
  }
}
