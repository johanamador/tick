import type { Item, Kind } from "./types";

export function categorySummary(items: Item[], kind: Kind) {
  let first: Item | undefined;
  let count = 0;
  for (const item of items) {
    if (item.kind !== kind || item.completed_at) continue;
    count++;
    if (!first || item.position < first.position) first = item;
  }
  return { count, first };
}

export function tmdbReference(
  item?: Pick<Item, "kind" | "source" | "external_id">,
) {
  if (
    !item ||
    item.source !== "tmdb" ||
    !["movie", "series"].includes(item.kind) ||
    !/^[1-9]\d{0,9}$/.test(item.external_id ?? "")
  )
    return null;
  const id = Number(item.external_id);
  if (id > 2147483647) return null;
  return {
    kind: item.kind as "movie" | "series",
    id,
    key: `${item.kind}:${id}`,
  };
}

export function tmdbBackdrop(data: unknown): string | null {
  const images = (data as { backdrops?: unknown[] } | null)?.backdrops;
  if (!Array.isArray(images)) return null;
  const valid = images.filter(
    (
      image,
    ): image is {
      file_path: string;
      iso_639_1?: string | null;
      aspect_ratio: number;
    } => {
      if (!image || typeof image !== "object") return false;
      const value = image as Record<string, unknown>;
      return (
        typeof value.file_path === "string" &&
        /^\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(value.file_path) &&
        typeof value.aspect_ratio === "number" &&
        value.aspect_ratio >= 1.4
      );
    },
  );
  const image = valid.find((image) => image.iso_639_1 === null) ?? valid[0];
  return image ? `https://image.tmdb.org/t/p/w780${image.file_path}` : null;
}
