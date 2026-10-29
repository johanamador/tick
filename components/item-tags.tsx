"use client";
import { useLanguage } from "./language-provider";
export function ItemTags({
  tags = [],
  selected = [],
  onSelect,
}: {
  tags?: string[];
  selected?: string[];
  onSelect: (tag: string) => void;
}) {
  const { t, locale } = useLanguage();
  if (!tags.length) return null;
  return (
    <div className="item-tags">
      {tags.map((tag) => (
        <button
          key={tag}
          type="button"
          className={`tag-chip ${selected.some((value) => value.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es")) ? "active" : ""}`}
          aria-label={t("Filter by {tag}", { tag: tag })}
          onClick={() => onSelect(tag)}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
