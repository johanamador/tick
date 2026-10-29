import type { MetadataResult } from "./types";

type SteamSearchResult = {
  type: string;
  id: number;
  name: string;
  tiny_image?: string;
};

export function steamResults(items: SteamSearchResult[]): MetadataResult[] {
  return items
    .filter(
      (item) =>
        item.type === "app" && Number.isSafeInteger(item.id) && item.id > 0,
    )
    .slice(0, 12)
    .map((item) => ({
      kind: "game",
      title: item.name,
      subtitle: "Steam",
      year: "",
      cover_url: `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/library_600x900.jpg`,
      source: "steam",
      external_id: String(item.id),
    }));
}
