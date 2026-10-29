import { z } from "zod";
import { listIconNames } from "./list-icons";
export const listIconInput = z.enum(listIconNames).default("list");
export const profileInput = z.object({
  display_name: z.string().trim().min(1).max(80),
  avatar_data: z
    .string()
    .max(150000)
    .regex(/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/)
    .nullable()
    .default(null),
});
export const kindSchema = z.enum([
  "movie",
  "series",
  "book",
  "comic",
  "game",
  "task",
]);
export const tagsInput = z
  .array(z.string().trim().min(1).max(32))
  .max(8)
  .transform((tags) => [
    ...new Map(tags.map((tag) => [tag.toLocaleLowerCase("es"), tag])).values(),
  ]);
const safeCover = z
  .string()
  .url()
  .max(1600)
  .refine((value) => {
    const url = new URL(value);
    return (
      (url.protocol === "https:" &&
        [
          "image.tmdb.org",
          "covers.openlibrary.org",
          "comicvine.gamespot.com",
          "www.comicvine.com",
          "comicvine.gamespot.com",
          "comicvine1.cbsistatic.com",
          "comicvine.gamespot.com",
        ].includes(url.hostname)) ||
      (url.protocol === "https:" && url.hostname.endsWith(".steamstatic.com"))
    );
  }, "Cover image not allowed")
  .nullable();
export const itemInput = z.object({
  kind: kindSchema,
  title: z.string().trim().min(1).max(240),
  subtitle: z.string().max(500).default(""),
  year: z.string().max(20).default(""),
  cover_url: safeCover.default(null),
  source: z
    .enum(["tmdb", "openlibrary", "comicvine", "steam"])
    .nullable()
    .default(null),
  external_id: z.string().max(150).nullable().default(null),
  list_id: z.uuid().nullable().default(null),
  tags: tagsInput.default([]),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});
export const noteInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(250000),
  format: z.enum(["plain", "markdown"]).default("plain"),
  position: z.number().int().min(0).max(100000).optional(),
});
export const reorderInput = z
  .array(z.uuid())
  .min(1)
  .max(2000)
  .refine((ids) => new Set(ids).size === ids.length);
