import type { Item, Section, Sort } from "./types.ts";

export function selectItems(
  items: Item[],
  section: Section,
  query: string,
  sort: Sort,
  listId?: string,
  tags: string[] = [],
) {
  const search = query.trim().toLocaleLowerCase("es");
  const filtered = items.filter((item) => {
    if (section === "completed" ? !item.completed_at : !!item.completed_at)
      return false;
    if (!["all", "completed"].includes(section) && item.kind !== section)
      return false;
    if (section === "task" && listId && item.list_id !== listId) return false;
    if (
      !tags.every((tag) =>
        (item.tags ?? []).some(
          (value) =>
            value.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"),
        ),
      )
    )
      return false;
    return (
      !search ||
      `${item.title} ${item.subtitle} ${(item.tags ?? []).join(" ")}`
        .toLocaleLowerCase("es")
        .includes(search)
    );
  });
  return filtered.sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title, "es")
      : sort === "newest"
        ? b.created_at.localeCompare(a.created_at)
        : sort === "oldest"
          ? a.created_at.localeCompare(b.created_at)
          : a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
}

export function moveItems(
  items: Item[],
  visible: Item[],
  fromId: string,
  toId: string,
): Item[] {
  const from = visible.findIndex((item) => item.id === fromId);
  const to = visible.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const ordered = [...items].sort((a, b) => a.position - b.position);
  const slots = ordered
    .map((item, index) => (visible.some((v) => v.id === item.id) ? index : -1))
    .filter((index) => index >= 0);
  const reordered = [...visible];
  reordered.splice(to, 0, reordered.splice(from, 1)[0]);
  slots.forEach((slot, index) => {
    ordered[slot] = reordered[index];
  });
  return ordered.map((item, position) => ({ ...item, position }));
}
