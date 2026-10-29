"use client";
import { useLanguage } from "./language-provider";
import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
export function TagInput({
  value,
  onChange,
  suggestions = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const { t, locale } = useLanguage();
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const candidates = suggestions
    .filter(
      (tag) =>
        !value.some(
          (existing) =>
            existing.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"),
        ) &&
        (!draft ||
          tag.toLocaleLowerCase("es").includes(draft.toLocaleLowerCase("es"))),
    )
    .slice(0, 6);
  function add(text = draft) {
    const tag = text.trim();
    if (!tag) return;
    if (tag.length > 32) {
      setError(t("Use up to 32 characters per tag."));
      return;
    }
    if (
      value.some(
        (existing) =>
          existing.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"),
      )
    ) {
      setDraft("");
      setError("");
      return;
    }
    if (value.length >= 8) {
      setError(t("You can add up to 8 tags."));
      return;
    }
    onChange([...value, tag]);
    setDraft("");
    setError("");
    setHighlighted(-1);
  }
  return (
    <div className="tag-editor">
      <label htmlFor={id}>{t("Tags")}</label>
      <div className="tag-input-box">
        {value.map((tag) => (
          <span className="tag-chip" key={tag}>
            {tag}
            <button
              type="button"
              aria-label={t("Remove tag {tag}", { tag: tag })}
              onClick={() =>
                onChange(value.filter((existing) => existing !== tag))
              }
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          id={id}
          role="combobox"
          aria-expanded={focused && !!candidates.length}
          aria-controls={
            focused && candidates.length ? `${id}-options` : undefined
          }
          aria-autocomplete="list"
          aria-activedescendant={
            focused && candidates[highlighted]
              ? `${id}-option-${highlighted}`
              : undefined
          }
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
          value={draft}
          placeholder={
            value.length >= 8
              ? t("Maximum 8 tags")
              : value.length
                ? t("Another tag…")
                : t("New tag, then Enter")
          }
          disabled={value.length >= 8}
          maxLength={32}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
            setHighlighted(-1);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            add();
            setFocused(false);
          }}
          onKeyDown={(event) => {
            if (
              (event.key === "ArrowDown" || event.key === "ArrowUp") &&
              candidates.length
            ) {
              event.preventDefault();
              setFocused(true);
              setHighlighted((current) =>
                current < 0
                  ? event.key === "ArrowDown"
                    ? 0
                    : candidates.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : candidates.length - 1)) %
                    candidates.length,
              );
            }
            if (event.key === "Escape") {
              if (focused && candidates.length) {
                event.preventDefault();
                event.stopPropagation();
              }
              setFocused(false);
              setHighlighted(-1);
            }
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              event.stopPropagation();
              add(
                highlighted >= 0 && candidates[highlighted]
                  ? candidates[highlighted]
                  : draft,
              );
            }
            if (event.key === "Backspace" && !draft && value.length)
              onChange(value.slice(0, -1));
          }}
        />
        {draft && (
          <button
            className="icon-button"
            type="button"
            aria-label={t("Add tag")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => add()}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {focused && !!candidates.length && (
        <div
          className="tag-suggestions"
          role="listbox"
          id={`${id}-options`}
          aria-label={t("Existing tags")}
        >
          {candidates.map((tag, index) => (
            <button
              key={tag}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={highlighted === index}
              tabIndex={-1}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(tag)}
            >
              <Plus size={11} />
              {tag}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="error-text">
          {error}
        </p>
      )}
    </div>
  );
}
