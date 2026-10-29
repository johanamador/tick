"use client";
import { useLanguage } from "./language-provider";
import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Check,
  ArrowLeft,
  LoaderCircle,
  Film,
  Tv,
  BookOpen,
  PanelsTopLeft,
  ListChecks,
  Gamepad2,
} from "lucide-react";
import { Modal } from "./modal";
import { CompactSelect } from "./compact-select";
import { TagInput } from "./tag-input";
import { demoWorkspace } from "@/lib/demo";
import {
  kinds,
  labels,
  singular,
  priorities,
  priorityLabels,
  type Priority,
  type Kind,
  type MetadataResult,
  type Item,
  type TaskList,
  type ItemDraft,
} from "@/lib/types";
const icons = {
  movie: Film,
  series: Tv,
  book: BookOpen,
  comic: PanelsTopLeft,
  game: Gamepad2,
  task: ListChecks,
};
export function AddDialog({
  defaultKind,
  items,
  lists,
  listId,
  demo,
  editing,
  onSave,
  onClose,
}: {
  defaultKind: Kind;
  items: Item[];
  lists: TaskList[];
  listId: string;
  demo: boolean;
  editing?: Item;
  onSave: (result: ItemDraft, id?: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const [kind, setKind] = useState<Kind>(editing?.kind || defaultKind);
  const [manual, setManual] = useState(!!editing || defaultKind === "task");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState(editing?.title || "");
  const [subtitle, setSubtitle] = useState(editing?.subtitle || "");
  const [year, setYear] = useState(editing?.year || "");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [priority, setPriority] = useState<Priority>(
    editing?.priority ?? "normal",
  );
  const availableTags = [...new Set(items.flatMap((item) => item.tags ?? []))];
  const [selectedList, setSelectedList] = useState(
    editing?.list_id || listId || "",
  );
  useEffect(() => {
    if (manual || query.trim().length < 2) {
      setResults([]);
      setBusy(false);
      setNotice("");
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setNotice("");
    const timer = setTimeout(async () => {
      try {
        if (demo) {
          setResults(
            demoWorkspace.items.filter(
              (item) =>
                item.kind === kind &&
                item.title.toLowerCase().includes(query.toLowerCase()),
            ),
          );
          setNotice(
            t(
              "The demo uses sample titles. Live search is available in your own installation.",
            ),
          );
        } else {
          const response = await fetch(
            `/api/search?kind=${kind}&q=${encodeURIComponent(query)}&lang=${locale}`,
            { signal: controller.signal },
          );
          const data = await response.json();
          setResults(data.results || []);
          setNotice(data.error || data.notice || "");
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError")
          setNotice(t("Search failed. You can add the title manually."));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, kind, manual, demo, locale]);
  async function save(result: MetadataResult, key: string) {
    setSaving(key);
    setNotice("");
    try {
      await onSave(
        {
          ...result,
          tags,
          priority: kind === "task" ? priority : "normal",
          list_id: kind === "task" ? selectedList || null : null,
        },
        editing?.id,
      );
      if (manual) onClose();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setSaving(null);
    }
  }
  return (
    <Modal
      wide
      title={editing ? t("Edit item") : t("New item")}
      onClose={onClose}
    >
      {!editing && (
        <div className="add-kinds">
          {kinds.map((value) => {
            const Icon = icons[value];
            return (
              <button
                key={value}
                className={kind === value ? "active" : ""}
                onClick={() => {
                  setKind(value);
                  setManual(value === "task");
                  setQuery("");
                  setNotice("");
                }}
              >
                <Icon size={16} />
                {t(labels[value])}
              </button>
            );
          })}
        </div>
      )}
      {manual ? (
        <form
          noValidate
          className="manual-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              {
                kind,
                title: title.trim(),
                subtitle: subtitle.trim(),
                year: year.trim(),
                cover_url: editing?.cover_url || null,
                source: editing?.source || null,
                external_id: editing?.external_id || null,
              },
              "manual",
            );
          }}
        >
          {kind !== "task" && !editing && (
            <button
              type="button"
              className="text-button"
              onClick={() => setManual(false)}
            >
              <ArrowLeft size={14} />
              {t("Back to search")}
            </button>
          )}
          <label htmlFor="item-title">
            {kind === "task" ? t("What needs doing?") : t("Title")}
          </label>
          <input
            id="item-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={240}
            placeholder={
              kind === "task"
                ? t("Something to do…")
                : kind === "game"
                  ? t("Game title")
                  : t("Title of {kind}", {
                      kind:
                        kind === "movie" || kind === "series"
                          ? t(singular[kind]).toLowerCase()
                          : "obra",
                    })
            }
          />
          <label htmlFor="item-subtitle">
            {kind === "task"
              ? t("Details (optional)")
              : t("Author or details (optional)")}
          </label>
          <input
            id="item-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={500}
            placeholder={
              kind === "task"
                ? t("A little context")
                : kind === "game"
                  ? t("Studio, platform…")
                  : t("Director, author, publisher…")
            }
          />
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={availableTags}
          />
          {kind !== "task" && (
            <>
              <label htmlFor="item-year">{t("Year (optional)")}</label>
              <input
                id="item-year"
                className="year-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                maxLength={20}
                placeholder="2026"
              />
            </>
          )}
          {kind === "task" && (
            <>
              <label htmlFor="item-priority">{t("Priority")}</label>
              <CompactSelect
                id="item-priority"
                label={t("Priority")}
                value={priority}
                onValueChange={(value) => setPriority(value as Priority)}
                className={`priority-select priority-${priority}`}
                options={priorities.map((value) => ({
                  value,
                  label: t(priorityLabels[value]),
                }))}
              />
              <label htmlFor="item-list">{t("List")}</label>
              <CompactSelect
                id="item-list"
                label={t("List")}
                value={selectedList}
                onValueChange={setSelectedList}
                options={[
                  { value: "", label: t("No list") },
                  ...lists.map((list) => ({
                    value: list.id,
                    label: list.title,
                  })),
                ]}
              />
            </>
          )}
          {notice && (
            <p role="alert" className="error-text">
              {t(notice)}
            </p>
          )}
          <div className="modal-actions">
            <button type="button" className="button" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button
              className="button primary"
              disabled={!!saving || !title.trim()}
            >
              {saving ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Plus size={16} />
              )}
              {editing ? t("Save changes") : t("Add to list")}
            </button>
          </div>
        </form>
      ) : (
        <div className="catalog-search">
          <p className="modal-description">{t("Search for a title to add.")}</p>
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              aria-label={t("Search the catalog")}
              placeholder={
                kind === "game"
                  ? t("Search Steam games…")
                  : t("Search {category}…", {
                      category: t(labels[kind]).toLowerCase(),
                    })
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {busy && <LoaderCircle size={17} className="spin" />}
          </div>
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={availableTags}
          />
          <div className="search-results" aria-live="polite">
            {notice && <p className="catalog-notice">{t(notice)}</p>}
            {!busy &&
              query.trim().length >= 2 &&
              !results.length &&
              !notice && (
                <div className="search-empty">
                  <Search size={25} />
                  <p>{t("No titles found.")}</p>
                  <span>{t("Try another name or add it manually.")}</span>
                </div>
              )}
            {query.trim().length < 2 && (
              <div className="search-empty">
                <Search size={27} />
                <p>{t("What are you looking for?")}</p>
                <span>{t("Enter at least two characters to search.")}</span>
              </div>
            )}
            {results.map((result, i) => {
              const exists = items.some(
                (item) =>
                  item.kind === result.kind &&
                  item.source === result.source &&
                  item.external_id === result.external_id,
              );
              const key = `${result.source}-${result.external_id}-${i}`;
              const Icon = icons[kind];
              return (
                <div className="search-result" key={key}>
                  <div className="result-cover">
                    {result.cover_url ? (
                      <img
                        src={result.cover_url}
                        alt=""
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Icon size={21} />
                    )}
                  </div>
                  <div className="result-info">
                    <strong>{result.title}</strong>
                    <span>
                      {[result.year, result.subtitle]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <button
                    className={`button small ${exists ? "added" : ""}`}
                    disabled={!!saving || exists}
                    onClick={() => void save(result, key)}
                  >
                    {saving === key ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : exists ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                    {exists ? t("Added") : t("Add")}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="catalog-footer">
            <span>{t("Can't find it?")}</span>
            <button
              className="text-button"
              onClick={() => {
                setTitle(query);
                setManual(true);
              }}
            >
              <Plus size={14} />
              {t("Add manually")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
