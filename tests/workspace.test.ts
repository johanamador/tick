import test from "node:test";
import assert from "node:assert/strict";
import { selectItems, moveItems } from "../lib/workspace.ts";
import {
  itemInput,
  noteInput,
  reorderInput,
  profileInput,
  listIconInput,
} from "../lib/validation.ts";
import { isSameOrigin } from "../lib/security.ts";
import { steamResults } from "../lib/games.ts";
import {
  categorySummary,
  tmdbBackdrop,
  tmdbReference,
} from "../lib/overview.ts";
import type { Item } from "../lib/types.ts";

const fixture = (
  id: string,
  kind: Item["kind"],
  position: number,
  title = id,
): Item => ({
  id,
  kind,
  position,
  title,
  subtitle: "",
  year: "",
  cover_url: null,
  source: null,
  external_id: null,
  completed_at: null,
  created_at: "2026-10-28T00:00:00Z",
  list_id: null,
  tags: [],
  priority: "normal",
});

test("shortcut summaries use the first pending item in manual order", () => {
  const first = fixture("first", "movie", 2);
  const later = fixture("later", "movie", 7);
  const completed = {
    ...fixture("done", "movie", 0),
    completed_at: "2026-10-29T00:00:00Z",
  };
  const items = [later, completed, fixture("show", "series", 1), first];
  assert.deepEqual(categorySummary(items, "movie"), { count: 2, first });
  assert.deepEqual(categorySummary(items, "book"), {
    count: 0,
    first: undefined,
  });
  assert.equal(items[0], later);
});

test("TMDB artwork uses valid landscape images and prefers art without text", () => {
  const image = (
    file_path: string,
    iso_639_1: string | null,
    aspect_ratio = 1.78,
  ) => ({ file_path, iso_639_1, aspect_ratio });
  assert.equal(
    tmdbBackdrop({
      backdrops: [image("/english.jpg", "en"), image("/art.webp", null)],
    }),
    "https://image.tmdb.org/t/p/w780/art.webp",
  );
  assert.equal(
    tmdbBackdrop({
      backdrops: [
        image("/portrait.jpg", null, 0.67),
        image("https://untrusted.example/art.jpg", null),
        image("/../art.jpg", null),
      ],
    }),
    null,
  );
  assert.equal(
    tmdbBackdrop({ backdrops: [image("/english.jpg", "en")] }),
    "https://image.tmdb.org/t/p/w780/english.jpg",
  );
  assert.equal(tmdbBackdrop(null), null);
  assert.equal(tmdbBackdrop({ backdrops: "invalid" }), null);
  assert.deepEqual(
    tmdbReference({ kind: "series", source: "tmdb", external_id: "66732" }),
    { kind: "series", id: 66732, key: "series:66732" },
  );
  for (const external_id of ["0", "-1", "1/../2", "9999999999"])
    assert.equal(
      tmdbReference({ kind: "movie", source: "tmdb", external_id }),
      null,
    );
  assert.equal(
    tmdbReference({ kind: "game", source: "steam", external_id: "1903340" }),
    null,
  );
});
test("profile images are bounded raster data and list icons use the supported names", () => {
  assert.equal(
    profileInput.safeParse({ display_name: "Taylor", avatar_data: null })
      .success,
    true,
  );
  assert.equal(
    profileInput.safeParse({
      display_name: "Taylor",
      avatar_data: "data:image/webp;base64,UklGRg==",
    }).success,
    true,
  );
  assert.equal(
    profileInput.safeParse({
      display_name: "Taylor",
      avatar_data: "data:image/svg+xml;base64,PHN2Zz4=",
    }).success,
    false,
  );
  assert.equal(
    profileInput.safeParse({ display_name: "", avatar_data: null }).success,
    false,
  );
  assert.equal(
    profileInput.safeParse({
      display_name: "Taylor",
      avatar_data: "data:image/png;base64," + "A".repeat(150000),
    }).success,
    false,
  );
  assert.equal(listIconInput.safeParse("heart").success, true);
  assert.equal(listIconInput.safeParse("arbitrary-icon").success, false);
});
test("priority and note formats default safely for existing API clients", () => {
  assert.equal(
    itemInput.parse({ kind: "task", title: "Test" }).priority,
    "normal",
  );
  assert.equal(
    itemInput.parse({ kind: "task", title: "Test", priority: "urgent" })
      .priority,
    "urgent",
  );
  assert.equal(
    itemInput.safeParse({ kind: "task", title: "Test", priority: "invalid" })
      .success,
    false,
  );
  assert.equal(
    noteInput.parse({ title: "Test", content: "# Literal" }).format,
    "plain",
  );
  assert.equal(
    noteInput.parse({ title: "Test", content: "# Heading", format: "markdown" })
      .format,
    "markdown",
  );
  assert.equal(
    noteInput.safeParse({ title: "Test", content: "", format: "html" }).success,
    false,
  );
});
test("checking removes an item from every pending view, and keeps it restorable", () => {
  const item = {
    ...fixture("one", "movie", 0),
    completed_at: "2026-10-28T01:00:00Z",
  };
  assert.equal(selectItems([item], "all", "", "manual").length, 0);
  assert.equal(selectItems([item], "movie", "", "manual").length, 0);
  assert.equal(selectItems([item], "completed", "", "manual").length, 1);
  assert.equal(
    selectItems([{ ...item, completed_at: null }], "all", "", "manual").length,
    1,
  );
});
test("manual reordering within a category preserves hidden items and assigns unique positions", () => {
  const a = fixture("a", "movie", 0);
  const b = fixture("b", "book", 1);
  const c = fixture("c", "movie", 2);
  const ordered = moveItems([a, b, c], [a, c], "c", "a");
  assert.deepEqual(
    ordered.map((item) => item.id),
    ["c", "b", "a"],
  );
  assert.deepEqual(
    ordered.map((item) => item.position),
    [0, 1, 2],
  );
});
test("task list selection and title search work together", () => {
  const a = {
    ...fixture("a", "task", 0, "Comprar libros"),
    list_id: "personal",
  };
  const b = { ...fixture("b", "task", 1, "Comprar libros"), list_id: "work" };
  assert.deepEqual(
    selectItems([a, b], "task", "LIBROS", "manual", "personal").map(
      (item) => item.id,
    ),
    ["a"],
  );
});
test("metadata input rejects unsafe covers, overlong titles, and unknown media types", () => {
  assert.equal(
    itemInput.safeParse({
      kind: "movie",
      title: "Test",
      cover_url: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    itemInput.safeParse({
      kind: "movie",
      title: "Test",
      cover_url: "https://evil.example/image.jpg",
    }).success,
    false,
  );
  assert.equal(
    itemInput.safeParse({ kind: "movie", title: "x".repeat(241) }).success,
    false,
  );
  assert.equal(
    itemInput.safeParse({ kind: "unknown", title: "Test" }).success,
    false,
  );
  assert.equal(
    itemInput.safeParse({
      kind: "movie",
      title: "Test",
      cover_url: "https://image.tmdb.org/t/p/w342/test.jpg",
    }).success,
    true,
  );
});
test("empty notes are valid and duplicate reorder identifiers are rejected", () => {
  assert.equal(
    noteInput.safeParse({ title: "Ideas", content: "" }).success,
    true,
  );
  const id = "65049aa6-c678-4416-9b89-cbd884833b57";
  assert.equal(reorderInput.safeParse([id, id]).success, false);
});
test("origin validation uses the incoming host and rejects foreign or missing origins", () => {
  assert.equal(
    isSameOrigin(
      new Request("http://localhost:3006/api/workspace", {
        headers: { Host: "127.0.0.1:3006", Origin: "http://127.0.0.1:3006" },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOrigin(
      new Request("http://localhost:3006/api/workspace", {
        headers: {
          Host: "127.0.0.1:3006",
          Origin: "https://untrusted.example",
        },
      }),
    ),
    false,
  );
  assert.equal(
    isSameOrigin(
      new Request("http://localhost:3006/api/workspace", {
        headers: { Host: "127.0.0.1:3006" },
      }),
    ),
    false,
  );
});

test("labels filter across media and combine with AND while preserving completion state", () => {
  const a = {
    ...fixture("a", "movie", 0, "Iron Man"),
    tags: ["Con mi novia", "Marvel"],
  };
  const b = { ...fixture("b", "series", 1, "Loki"), tags: ["Marvel"] };
  const c = {
    ...fixture("c", "game", 2, "Marvel game"),
    tags: ["Con mi novia"],
  };
  const done = { ...a, id: "done", completed_at: "2026-10-29T00:00:00Z" };
  assert.deepEqual(
    selectItems([a, b, c, done], "all", "", "manual", undefined, [
      "con mi novia",
      "MARVEL",
    ]).map((item) => item.id),
    ["a"],
  );
  assert.deepEqual(
    selectItems([a, b, c, done], "completed", "", "manual", undefined, [
      "Marvel",
    ]).map((item) => item.id),
    ["done"],
  );
  assert.deepEqual(
    selectItems([a, b, c], "all", "con mi novia", "manual").map(
      (item) => item.id,
    ),
    ["a", "c"],
  );
});

test("game metadata and bounded unique labels pass validation", () => {
  const result = itemInput.parse({
    kind: "game",
    title: "Hollow Knight",
    source: "steam",
    external_id: "367520",
    cover_url:
      "https://cdn.akamai.steamstatic.com/steam/apps/367520/library_600x900.jpg",
    tags: [" Marvel ", "marvel", "Con mi novia"],
  });
  assert.deepEqual(result.tags, ["marvel", "Con mi novia"]);
  assert.equal(
    itemInput.safeParse({
      kind: "movie",
      title: "Test",
      tags: Array.from({ length: 9 }, (_, i) => `tag ${i}`),
    }).success,
    false,
  );
  assert.equal(
    itemInput.safeParse({
      kind: "movie",
      title: "Test",
      tags: ["x".repeat(33)],
    }).success,
    false,
  );
});

test("Steam search excludes bundles and malformed application IDs", () => {
  const result = steamResults([
    { type: "app", id: 367520, name: "Hollow Knight" },
    { type: "bundle", id: 123, name: "Bundle" },
    { type: "app", id: -1, name: "Invalid" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, "game");
  assert.equal(result[0].source, "steam");
  assert.equal(result[0].title, "Hollow Knight");
});
