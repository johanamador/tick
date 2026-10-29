"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Film,
  Gamepad2,
  ListChecks,
  NotebookPen,
  PanelsTopLeft,
  Tv,
} from "lucide-react";
import { labels, type Item, type Section, type Workspace } from "@/lib/types";
import { categorySummary, tmdbReference } from "@/lib/overview";
import { demoBackdrops } from "@/lib/demo-backdrops";
import { useLanguage } from "./language-provider";

const icons = {
  movie: Film,
  series: Tv,
  book: BookOpen,
  comic: PanelsTopLeft,
  game: Gamepad2,
};
const mediaKinds = ["movie", "series", "book", "comic", "game"] as const;
const requests = new Map<string, Promise<string | null>>();

function loadBackdrop(
  reference: NonNullable<ReturnType<typeof tmdbReference>>,
) {
  let request = requests.get(reference.key);
  if (!request) {
    request = fetch(`/api/backdrop?kind=${reference.kind}&id=${reference.id}`)
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) =>
        typeof data?.backdrop_url === "string" &&
        /^https:\/\/image\.tmdb\.org\/t\/p\/w780\/[A-Za-z0-9_-]+\.(jpg|png|webp)$/.test(
          data.backdrop_url,
        )
          ? (data.backdrop_url as string)
          : null,
      )
      .catch(() => null);
    requests.set(reference.key, request);
  }
  return request;
}

function MediaShortcut({
  kind,
  count,
  item,
  demo,
  onOpen,
}: {
  kind: (typeof mediaKinds)[number];
  count: number;
  item?: Item;
  demo: boolean;
  onOpen: () => void;
}) {
  const { t } = useLanguage();
  const reference = tmdbReference(item);
  const [backdrop, setBackdrop] = useState<string | null>(
    demo && reference ? (demoBackdrops[reference.key] ?? null) : null,
  );
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => {
    if (demo || !reference) return;
    let mounted = true;
    loadBackdrop(reference).then((url) => {
      if (mounted) setBackdrop(url);
    });
    return () => {
      mounted = false;
    };
  }, [demo, reference?.key]);
  const steamHero =
    item?.source === "steam" && /^[1-9]\d+$/.test(item.external_id ?? "")
      ? `https://cdn.akamai.steamstatic.com/steam/apps/${item!.external_id}/library_hero.jpg`
      : null;
  const image =
    [backdrop, steamHero, item?.cover_url].find(
      (url) => url && !failed.includes(url),
    ) ?? null;
  const portrait =
    !!image &&
    (kind === "book" || kind === "comic" || image === item?.cover_url);
  const Icon = icons[kind];
  const imageError = () => {
    if (image) setFailed((current) => [...new Set([...current, image])]);
  };
  return (
    <button
      type="button"
      className={`shortcut-card shortcut-${kind} ${image ? "has-art" : ""} ${portrait ? "has-cover" : ""}`}
      onClick={onOpen}
      aria-label={t("Open {category}", { category: t(labels[kind]) })}
    >
      {image ? (
        <>
          <img
            className="shortcut-backdrop"
            src={image}
            alt=""
            loading="lazy"
            onError={imageError}
          />
          {portrait && (
            <img
              className="shortcut-cover"
              src={image}
              alt=""
              loading="lazy"
              onError={imageError}
            />
          )}
        </>
      ) : (
        <Icon
          className="shortcut-empty-icon"
          size={88}
          strokeWidth={1}
          aria-hidden="true"
        />
      )}
      <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
      <span className="shortcut-info">
        <span className="shortcut-title">
          <Icon size={18} aria-hidden="true" />
          <span>{t(labels[kind])}</span>
          <span className="shortcut-count">{count}</span>
        </span>
        {item && <span className="shortcut-preview">{item.title}</span>}
      </span>
    </button>
  );
}

export function OverviewShortcuts({
  workspace,
  demo,
  onNavigate,
}: {
  workspace: Workspace;
  demo: boolean;
  onNavigate: (section: Section) => void;
}) {
  const { t } = useLanguage();
  const tasks = categorySummary(workspace.items, "task");
  return (
    <div className="overview-shortcuts" aria-label={t("Category shortcuts")}>
      <div className="shortcut-utilities">
        <button
          type="button"
          className="shortcut-utility"
          aria-label={t("Open {category}", { category: t("Tasks") })}
          onClick={() => onNavigate("task")}
        >
          <ListChecks size={21} aria-hidden="true" />
          <span>
            <span className="utility-title">
              {t("Tasks")}
              <span className="utility-count">{tasks.count}</span>
            </span>
            {tasks.first && (
              <span className="utility-preview">{tasks.first.title}</span>
            )}
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="shortcut-utility"
          aria-label={t("Open {category}", { category: t("Notes") })}
          onClick={() => onNavigate("notes")}
        >
          <NotebookPen size={21} aria-hidden="true" />
          <span>
            <span className="utility-title">
              {t("Notes")}
              <span className="utility-count">{workspace.notes.length}</span>
            </span>
            {workspace.notes[0] && (
              <span className="utility-preview">
                {workspace.notes[0].title}
              </span>
            )}
          </span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="shortcut-media">
        {mediaKinds.map((kind) => {
          const summary = categorySummary(workspace.items, kind);
          return (
            <MediaShortcut
              key={`${kind}:${summary.first?.id ?? "empty"}`}
              kind={kind}
              count={summary.count}
              item={summary.first}
              demo={demo}
              onOpen={() => onNavigate(kind)}
            />
          );
        })}
      </div>
    </div>
  );
}
