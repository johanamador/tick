"use client";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  CircleCheck,
  Film,
  Gamepad2,
  GripVertical,
  Grid2X2,
  Inbox,
  Info,
  ListChecks,
  ListFilter,
  List,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  NotebookPen,
  PanelsTopLeft,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Tv,
  X,
  FileText,
  Download,
  Tag,
} from "lucide-react";
import { AddDialog } from "./add-dialog";
import { Modal } from "./modal";
import { CompactSelect } from "./compact-select";
import { TickLogo } from "./tick-logo";
import { OverviewShortcuts } from "./overview-shortcuts";
import { LanguageSwitch } from "./language-switch";
import { useLanguage } from "./language-provider";
import { Avatar, ProfileDialog } from "./profile-dialog";
import { ListIcon, ListIconPicker } from "./list-icon";
import { ItemTags } from "./item-tags";
import { readPreference, writePreference } from "@/lib/preferences";
import {
  labels,
  priorityLabels,
  singular,
  type Item,
  type Kind,
  type MetadataResult,
  type Note,
  type Section,
  type Sort,
  type TaskList,
  type Workspace,
  type ItemDraft,
  type Profile,
} from "@/lib/types";
import { moveItems, selectItems } from "@/lib/workspace";
const NoteEditor = lazy(() => import("./note-editor"));
const iconMap = {
  all: Inbox,
  movie: Film,
  series: Tv,
  book: BookOpen,
  comic: PanelsTopLeft,
  game: Gamepad2,
  task: ListChecks,
  notes: NotebookPen,
  completed: CircleCheck,
};
const sectionNames: Record<Section, string> = {
  all: "All items",
  ...labels,
  notes: "Notes",
  completed: "Completed",
};
type Toast = {
  message: string;
  undo?: () => void;
  error?: boolean;
};
type NameDialog = {
  type: "note" | "list";
  id?: string;
  title: string;
  icon?: string;
};
type DeleteDialog = {
  type: "item" | "note" | "list";
  id: string;
  title: string;
};
export function WorkspaceApp({
  initial,
  email,
  demo = false,
  initialProfile,
}: {
  initial: Workspace;
  email: string;
  demo?: boolean;
  initialProfile?: Profile;
}) {
  const { t, locale } = useLanguage();
  const [profile, setProfile] = useState<Profile>(
    initialProfile ?? {
      display_name: demo ? "Alex Morgan" : email.split("@")[0],
      avatar_data: null,
    },
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [notesMaximized, setNotesMaximized] = useState(false);
  const notepadRef = useRef<HTMLDivElement>(null);
  const [workspace, setWorkspace] = useState(initial);
  const [section, setSection] = useState<Section>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("manual");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [overviewLayout, setOverviewLayout] = useState<"items" | "shortcuts">(
    "items",
  );
  const [listId, setListId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noteId, setNoteId] = useState(initial.notes[0]?.id || "");
  const [add, setAdd] = useState(false);
  const [editing, setEditing] = useState<Item>();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState(0);
  const [dirtyNotes, setDirtyNotes] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [info, setInfo] = useState(false);
  const [nameDialog, setNameDialog] = useState<NameDialog>();
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog>();
  const [dialogBusy, setDialogBusy] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const dirty = useRef(new Map<string, Note>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const noteQueue = useRef(Promise.resolve());
  const noteError = useRef(false);
  const busyIds = useRef(new Set<string>());
  const workspaceRef = useRef(workspace);
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);
  const notify = useCallback(
    (message: string, undo?: () => void, error = false) =>
      setToast({ message: t(message), undo, error }),
    [t],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 10000 : 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    try {
      const storedTheme = readPreference("theme");
      if (storedTheme === "light") {
        setTheme("light");
        document.documentElement.dataset.theme = "light";
      }
      const storedOverview = readPreference("overview-layout");
      if (storedOverview === "shortcuts") setOverviewLayout("shortcuts");
      const storedView = readPreference("view");
      if (storedView === "list") setView("list");
      if (demo) {
        const saved = readPreference("demo-v3");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (
            Array.isArray(parsed.items) &&
            Array.isArray(parsed.notes) &&
            Array.isArray(parsed.lists)
          ) {
            setWorkspace(parsed);
            setNoteId(parsed.notes[0]?.id || "");
          }
        }
      }
    } catch {
      /* Storage is optional. */
    }
  }, [demo]);
  useEffect(() => {
    if (demo) {
      const saved = readPreference("demo-profile");
      if (saved) {
        try {
          const value = JSON.parse(saved);
          if (
            typeof value.display_name === "string" &&
            (value.avatar_data === null ||
              /^data:image\/(webp|png|jpeg);base64,/.test(value.avatar_data))
          )
            setProfile(value);
        } catch {}
      }
    }
  }, [demo]);
  useEffect(() => {
    if (!notesMaximized) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    notepadRef.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setNotesMaximized(false);
      }
      if (event.key === "Tab" && !event.defaultPrevented) {
        const nodes = Array.from(
          notepadRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([tabindex="-1"]), [contenteditable="true"], a[href], input:not([disabled])',
          ) ?? [],
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === notepadRef.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === notepadRef.current)
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
      else {
        const target =
          notepadRef.current?.querySelector<HTMLButtonElement>(
            "[data-note-maximize]",
          ) ?? notepadRef.current?.querySelector<HTMLButtonElement>(".new-tab");
        target?.focus();
      }
    };
  }, [notesMaximized]);
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (demo) {
      try {
        writePreference("demo-v3", JSON.stringify(workspace));
      } catch {
        notify(t("Your browser could not save the demo."), undefined, true);
      }
    }
  }, [workspace, demo, notify]);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('[role="combobox"], [role="listbox"], [role="menu"]') ||
        document.querySelector("dialog[open]")
      )
        return;
      if (event.key === "/") {
        event.preventDefault();
        filterRef.current?.focus();
      }
      if (event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        section === "notes"
          ? setNameDialog({ type: "note", title: t("Untitled") })
          : setAdd(true);
      }
      if (event.key === "Escape") setMenuId(null);
    }
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("keydown", key);
    window.addEventListener("beforeunload", warn);
    return () => {
      document.removeEventListener("keydown", key);
      window.removeEventListener("beforeunload", warn);
    };
  }, [section]);
  useEffect(() => {
    if (!menuId) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest(".item-menu")) setMenuId(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuId]);
  async function api<T>(
    action: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    setPending((count) => count + 1);
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("Could not save."));
      return result.data as T;
    } finally {
      setPending((count) => count - 1);
    }
  }
  async function addItem(result: ItemDraft, id?: string) {
    if (
      !id &&
      result.external_id &&
      workspace.items.some(
        (item) =>
          item.kind === result.kind &&
          item.source === result.source &&
          item.external_id === result.external_id,
      )
    )
      throw new Error(
        t("This title is already in your workspace. Check Completed too."),
      );
    const item: Item = demo
      ? {
          ...result,
          id: id || crypto.randomUUID(),
          position: id
            ? workspace.items.find((item) => item.id === id)!.position
            : Math.max(-1, ...workspace.items.map((item) => item.position)) + 1,
          created_at: new Date().toISOString(),
          completed_at: id
            ? workspace.items.find((item) => item.id === id)!.completed_at
            : null,
        }
      : await api<Item>(id ? "update_item" : "create_item", {
          item: result,
          ...(id ? { id } : {}),
        });
    setWorkspace((current) => ({
      ...current,
      items: id
        ? current.items.map((existing) =>
            existing.id === id ? item : existing,
          )
        : [...current.items, item],
    }));
    notify(
      id
        ? t("Changes saved.")
        : t("“{title}” added to your list.", { title: item.title }),
    );
  }
  async function complete(item: Item, completed: boolean) {
    if (busyIds.current.has(item.id)) return;
    busyIds.current.add(item.id);
    const date = completed ? new Date().toISOString() : null;
    setWorkspace((current) => ({
      ...current,
      items: current.items.map((value) =>
        value.id === item.id ? { ...value, completed_at: date } : value,
      ),
    }));
    try {
      if (!demo) await api("complete_item", { id: item.id, completed });
      notify(
        completed
          ? t("“{title}” completed.", { title: item.title })
          : t("“{title}” restored.", { title: item.title }),
        () => void complete({ ...item, completed_at: date }, !completed),
      );
    } catch (error) {
      setWorkspace((current) => ({
        ...current,
        items: current.items.map((value) =>
          value.id === item.id
            ? { ...value, completed_at: item.completed_at }
            : value,
        ),
      }));
      notify((error as Error).message, undefined, true);
    } finally {
      busyIds.current.delete(item.id);
    }
  }
  async function reorder(fromId: string, toId: string, visible: Item[]) {
    if (fromId === toId) return;
    const before = workspace.items;
    const next = moveItems(before, visible, fromId, toId);
    setSort("manual");
    setWorkspace((current) => ({ ...current, items: next }));
    try {
      if (!demo)
        await api("reorder", {
          ids: [...next]
            .sort((a, b) => a.position - b.position)
            .map((item) => item.id),
        });
    } catch (error) {
      setWorkspace((current) => ({
        ...current,
        items: current.items.map((item) => ({
          ...item,
          position:
            before.find((old) => old.id === item.id)?.position ?? item.position,
        })),
      }));
      notify((error as Error).message, undefined, true);
    }
  }
  function queueSave(note: Note) {
    noteQueue.current = noteQueue.current.then(async () => {
      const latest = dirty.current.get(note.id);
      if (!latest || latest !== note) return;
      try {
        if (!demo)
          await api("save_note", {
            note: {
              id: note.id,
              title: note.title,
              content: note.content,
              format: note.format ?? "plain",
            },
          });
        if (dirty.current.get(note.id) === note) dirty.current.delete(note.id);
        noteError.current = false;
        setSaveFailed(false);
      } catch (error) {
        noteError.current = true;
        setSaveFailed(true);
        notify((error as Error).message, undefined, true);
      }
      setDirtyNotes(dirty.current.size > 0);
    });
  }
  function editNote(note: Note, content: string) {
    const next: Note = {
      ...note,
      content,
      format: "markdown",
      updated_at: new Date().toISOString(),
    };
    setWorkspace((current) => ({
      ...current,
      notes: current.notes.map((value) =>
        value.id === note.id ? next : value,
      ),
    }));
    if (demo) return;
    dirty.current.set(note.id, next);
    setDirtyNotes(true);
    clearTimeout(timers.current.get(note.id));
    timers.current.set(
      note.id,
      setTimeout(() => queueSave(next), 700),
    );
  }
  async function flushNotes() {
    for (const note of dirty.current.values()) {
      clearTimeout(timers.current.get(note.id));
      queueSave(note);
    }
    await noteQueue.current;
  }
  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameDialog || !nameDialog.title.trim()) return;
    setDialogBusy(true);
    try {
      const title = nameDialog.title.trim();
      if (nameDialog.type === "note") {
        const old = workspace.notes.find((note) => note.id === nameDialog.id);
        if (old) {
          clearTimeout(timers.current.get(old.id));
          await flushNotes();
          if (noteError.current)
            throw new Error(t("Save your note changes first."));
        }
        const note = demo
          ? {
              id: old?.id || crypto.randomUUID(),
              title,
              content: old?.content || "",
              format: old ? (old.format ?? "plain") : ("markdown" as const),
              position: old?.position ?? workspace.notes.length,
              updated_at: new Date().toISOString(),
            }
          : await api<Note>("save_note", {
              note: {
                ...(old ? { id: old.id } : {}),
                title,
                content: old?.content || "",
                format: old ? (old.format ?? "plain") : ("markdown" as const),
                position: old?.position ?? workspace.notes.length,
              },
            });
        setWorkspace((current) => ({
          ...current,
          notes: old
            ? current.notes.map((value) =>
                value.id === old.id ? { ...value, title } : value,
              )
            : [...current.notes, note],
        }));
        setNoteId(note.id);
      } else {
        const list = demo
          ? {
              id: nameDialog.id || crypto.randomUUID(),
              title,
              icon:
                nameDialog.icon ??
                workspace.lists.find((list) => list.id === nameDialog.id)
                  ?.icon ??
                "list",
              position:
                workspace.lists.find((list) => list.id === nameDialog.id)
                  ?.position ?? workspace.lists.length,
            }
          : await api<TaskList>("save_list", {
              id: nameDialog.id,
              title,
              icon:
                nameDialog.icon ??
                workspace.lists.find((list) => list.id === nameDialog.id)
                  ?.icon ??
                "list",
              position:
                workspace.lists.find((list) => list.id === nameDialog.id)
                  ?.position ?? workspace.lists.length,
            });
        setWorkspace((current) => ({
          ...current,
          lists: nameDialog.id
            ? current.lists.map((value) =>
                value.id === nameDialog.id ? list : value,
              )
            : [...current.lists, list],
        }));
        setListId(list.id);
      }
      setNameDialog(undefined);
    } catch (error) {
      notify((error as Error).message, undefined, true);
    } finally {
      setDialogBusy(false);
    }
  }
  async function deleteEntry() {
    if (!deleteDialog) return;
    const { type, id } = deleteDialog;
    setDialogBusy(true);
    try {
      if (type === "note") {
        clearTimeout(timers.current.get(id));
        await flushNotes();
        if (noteError.current)
          throw new Error(t("Save your changes before deleting this note."));
      }
      if (!demo) await api(`delete_${type}`, { id });
      setWorkspace((current) => ({
        ...current,
        items:
          type === "item"
            ? current.items.filter((value) => value.id !== id)
            : type === "list"
              ? current.items.map((item) =>
                  item.list_id === id ? { ...item, list_id: null } : item,
                )
              : current.items,
        notes:
          type === "note"
            ? current.notes.filter((value) => value.id !== id)
            : current.notes,
        lists:
          type === "list"
            ? current.lists.filter((value) => value.id !== id)
            : current.lists,
      }));
      if (type === "note" && noteId === id)
        setNoteId(workspace.notes.find((note) => note.id !== id)?.id || "");
      if (type === "list") setListId("");
      setDeleteDialog(undefined);
      notify(
        type === "list"
          ? t("List deleted. Its tasks are still in All tasks.")
          : t("Deleted."),
      );
    } catch (error) {
      notify((error as Error).message, undefined, true);
    } finally {
      setDialogBusy(false);
    }
  }
  async function logout() {
    await flushNotes();
    if (dirty.current.size) {
      notify(
        t("Some notes have unsaved changes. Retry saving before signing out."),
        undefined,
        true,
      );
      return;
    }
    if (demo) {
      window.location.assign("/login");
      return;
    }
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.assign("/login");
    } catch {
      notify(t("Could not sign out. Try again."), undefined, true);
    }
  }
  function navigate(next: Section) {
    setSection(next);
    setQuery("");
    setMenuId(null);
    setSidebar(false);
  }
  const availableTags = [
    ...new Map(
      workspace.items
        .flatMap((item) => item.tags ?? [])
        .map((tag) => [tag.toLocaleLowerCase("es"), tag]),
    ).values(),
  ].sort((a, b) => a.localeCompare(b, "es"));
  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.some(
        (value) =>
          value.toLocaleLowerCase("es") === tag.toLocaleLowerCase("es"),
      )
        ? current.filter(
            (value) =>
              value.toLocaleLowerCase("es") !== tag.toLocaleLowerCase("es"),
          )
        : [...current, tag],
    );
  }
  const visible = selectItems(
    workspace.items,
    section,
    query,
    sort,
    listId,
    selectedTags,
  );
  const media = visible.filter((item) => item.kind !== "task");
  const tasks = visible.filter((item) => item.kind === "task");
  const activeNote =
    workspace.notes.find((note) => note.id === noteId) || workspace.notes[0];
  const pendingCount = workspace.items.filter(
    (item) => !item.completed_at,
  ).length;
  const completedCount = workspace.items.length - pendingCount;
  const countFor = (key: Section) =>
    key === "all"
      ? pendingCount
      : key === "notes"
        ? workspace.notes.length
        : key === "completed"
          ? completedCount
          : workspace.items.filter(
              (item) => item.kind === key && !item.completed_at,
            ).length;
  const currentCount = countFor(section);
  const SectionIcon = iconMap[section];
  function itemActions(item: Item, collection: Item[]) {
    const index = collection.findIndex((value) => value.id === item.id);
    return (
      <div className="item-menu">
        <button
          className="icon-button more-button"
          aria-label={t("Options for {title}", { title: item.title })}
          aria-expanded={menuId === item.id}
          onClick={() => setMenuId(menuId === item.id ? null : item.id)}
        >
          <MoreHorizontal size={19} />
        </button>
        {menuId === item.id && (
          <div className="context-menu">
            <button
              onClick={() => {
                setEditing(item);
                setMenuId(null);
              }}
            >
              <Pencil size={14} />
              {t("Edit")}
            </button>
            <button
              disabled={index < 1}
              onClick={() => {
                void reorder(item.id, collection[index - 1].id, collection);
                setMenuId(null);
              }}
            >
              <ArrowUp size={14} />
              {t("Move up")}
            </button>
            <button
              disabled={index === collection.length - 1}
              onClick={() => {
                void reorder(item.id, collection[index + 1].id, collection);
                setMenuId(null);
              }}
            >
              <ArrowDown size={14} />
              {t("Move down")}
            </button>
            <button
              className="danger-text"
              onClick={() => {
                setDeleteDialog({
                  type: "item",
                  id: item.id,
                  title: item.title,
                });
                setMenuId(null);
              }}
            >
              <Trash2 size={14} />
              {t("Delete")}
            </button>
          </div>
        )}
      </div>
    );
  }
  function checkButton(item: Item) {
    return (
      <button
        className={`check-button ${item.completed_at ? "checked" : ""}`}
        aria-label={
          item.completed_at
            ? t("Restore: {title}", { title: item.title })
            : t("Complete: {title}", { title: item.title })
        }
        data-tooltip={item.completed_at ? t("Restore item") : t("Mark as done")}
        onClick={() => void complete(item, !item.completed_at)}
      >
        {item.completed_at ? <RotateCcw size={15} /> : <Check size={15} />}
      </button>
    );
  }
  function dragProps(item: Item, collection: Item[]) {
    return {
      draggable: sort === "manual" && section !== "completed",
      onDragStart: (event: React.DragEvent) => {
        event.dataTransfer.setData("text/tick", item.id);
        event.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (event: React.DragEvent) => {
        if (sort === "manual") {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        const id = event.dataTransfer.getData("text/tick");
        if (id) void reorder(id, item.id, collection);
      },
    };
  }
  return (
    <div className="app-shell">
      {sidebar && (
        <button
          className="sidebar-overlay"
          aria-label={t("Close navigation")}
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a
          className="app-brand"
          href={demo ? "/demo" : "/"}
          aria-label={t("tick — home")}
        >
          <TickLogo />
        </a>
        <div className="sidebar-content">
          <nav aria-label={t("Overview")}>
            <button
              className={`nav-item ${section === "all" ? "active" : ""}`}
              aria-current={section === "all" ? "page" : undefined}
              onClick={() => navigate("all")}
            >
              <Inbox size={18} />
              <span>{t("All items")}</span>
              <span className="nav-count">{pendingCount}</span>
            </button>
          </nav>
          <div className="nav-divider overview-divider" />
          <span className="nav-label">{t("DAY TO DAY")}</span>
          <nav aria-label={t("Organization")}>
            {(["task", "notes"] as Section[]).map((key) => {
              const Icon = iconMap[key];
              return (
                <button
                  key={key}
                  className={`nav-item ${section === key ? "active" : ""}`}
                  aria-current={section === key ? "page" : undefined}
                  onClick={() => navigate(key)}
                >
                  <Icon size={18} />
                  <span>{t(sectionNames[key])}</span>
                  <span className="nav-count">{countFor(key)}</span>
                </button>
              );
            })}
          </nav>
          <span className="nav-label second">{t("LIBRARY")}</span>
          <nav aria-label={t("Library")}>
            {(["movie", "series", "book", "comic", "game"] as Section[]).map(
              (key) => {
                const Icon = iconMap[key];
                return (
                  <button
                    key={key}
                    className={`nav-item ${section === key ? "active" : ""}`}
                    aria-current={section === key ? "page" : undefined}
                    onClick={() => navigate(key)}
                  >
                    <Icon size={18} />
                    <span>
                      {key === "all" ? t("All items") : t(sectionNames[key])}
                    </span>
                    <span className="nav-count">{countFor(key)}</span>
                  </button>
                );
              },
            )}
          </nav>
          <div className="nav-divider" />
          <button
            className={`nav-item ${section === "completed" ? "active" : ""}`}
            onClick={() => navigate("completed")}
          >
            <CircleCheck size={18} />
            <span>{t("Completed")}</span>
            <span className="nav-count">{completedCount}</span>
          </button>
        </div>
        <div className="sidebar-account">
          <button
            className="account-trigger"
            onClick={() => setProfileOpen(true)}
            aria-label={t("Edit profile")}
          >
            <Avatar profile={profile} />
            <span className="account-details">
              <strong>{profile.display_name}</strong>
            </span>
          </button>
          <button
            className="icon-button"
            data-tooltip={t("Sign out")}
            aria-label={t("Sign out")}
            onClick={() => void logout()}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div
        className={
          section === "notes" ? "main-shell notes-layout" : "main-shell"
        }
      >
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button sidebar-toggle"
              aria-label={t("Open navigation")}
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={19} />
            </button>
            <span>{t("Workspace")}</span>
            <span className="breadcrumb-slash">/</span>
            <SectionIcon size={14} />
            <strong>{t(sectionNames[section])}</strong>
          </div>
          <div className="topbar-tools">
            <LanguageSwitch />
            <button
              className={`sync-status ${saveFailed ? "sync-error" : ""}`}
              onClick={() => {
                if (saveFailed) void flushNotes();
              }}
              disabled={!saveFailed}
              data-tooltip={saveFailed ? t("Retry saving") : undefined}
            >
              {pending || (dirtyNotes && !saveFailed) ? (
                <>
                  <LoaderCircle size={13} className="spin" />
                  {t("Saving")}
                </>
              ) : saveFailed ? (
                <>{t("Unsaved changes · Retry")}</>
              ) : (
                <>
                  <span className="status-dot" />
                  {demo ? t("Demo") : t("All changes saved")}
                </>
              )}
            </button>
            <span className="tool-separator" />
            <button
              className="icon-button"
              data-tooltip={
                theme === "dark"
                  ? t("Switch to light theme")
                  : t("Switch to dark theme")
              }
              aria-label={
                theme === "dark"
                  ? t("Switch to light theme")
                  : t("Switch to dark theme")
              }
              onClick={() => {
                const next = theme === "dark" ? "light" : "dark";
                setTheme(next);
                document.documentElement.dataset.theme = next;
                try {
                  writePreference("theme", next);
                } catch {
                  /* Optional. */
                }
              }}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              className="icon-button"
              data-tooltip={t("About tick")}
              aria-label={t("About tick")}
              onClick={() => setInfo(true)}
            >
              <Info size={17} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <Info size={14} />
              {t("Demo. Changes stay in this browser.")}
            </span>
            <a href="/login">
              {t("Sign in")}
              <ArrowUpRight size={13} />
            </a>
          </div>
        )}
        <main
          id="main-content"
          className={`workspace-content ${section === "notes" ? "notes-page" : ""}`}
        >
          <div className="page-heading">
            <div>
              <h1>
                {t(sectionNames[section])}
                <span className="heading-count">{currentCount}</span>
              </h1>
            </div>
            <div className="page-actions">
              {section === "all" && (
                <div
                  className="overview-switch"
                  role="group"
                  aria-label={t("Overview layout")}
                >
                  {(["items", "shortcuts"] as const).map((layout) => (
                    <button
                      type="button"
                      key={layout}
                      aria-pressed={overviewLayout === layout}
                      onClick={() => {
                        setOverviewLayout(layout);
                        try {
                          writePreference("overview-layout", layout);
                        } catch {}
                      }}
                    >
                      {layout === "items" ? (
                        <List size={14} />
                      ) : (
                        <Grid2X2 size={14} />
                      )}{" "}
                      {t(layout === "items" ? "Items" : "Shortcuts")}
                    </button>
                  ))}
                </div>
              )}
              {section !== "completed" && (
                <button
                  className="button primary add-button"
                  onClick={() =>
                    section === "notes"
                      ? setNameDialog({ type: "note", title: t("Untitled") })
                      : setAdd(true)
                  }
                >
                  <Plus size={17} />
                  {section === "notes"
                    ? t("New note")
                    : section === "task"
                      ? t("New task")
                      : t("Add item")}
                  <kbd>N</kbd>
                </button>
              )}
            </div>
          </div>
          {section === "notes" ? (
            <div
              className={`notepad ${notesMaximized ? "maximized" : ""}`}
              ref={notepadRef}
              tabIndex={-1}
              role={notesMaximized ? "dialog" : undefined}
              aria-modal={notesMaximized || undefined}
              aria-label={notesMaximized ? t("Notes") : undefined}
            >
              <div className="note-tabs" role="tablist" aria-label={t("Notes")}>
                {workspace.notes.map((note) => (
                  <div
                    className={`note-tab ${activeNote?.id === note.id ? "active" : ""}`}
                    key={note.id}
                  >
                    <button
                      role="tab"
                      aria-selected={activeNote?.id === note.id}
                      aria-controls="note-panel"
                      id={`note-tab-${note.id}`}
                      tabIndex={activeNote?.id === note.id ? 0 : -1}
                      onClick={() => setNoteId(note.id)}
                      onDoubleClick={() =>
                        setNameDialog({
                          type: "note",
                          id: note.id,
                          title: note.title,
                        })
                      }
                      onKeyDown={(event) => {
                        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                          event.preventDefault();
                          const index = workspace.notes.findIndex(
                            (value) => value.id === note.id,
                          );
                          const next =
                            workspace.notes[
                              (index +
                                (event.key === "ArrowRight"
                                  ? 1
                                  : workspace.notes.length - 1)) %
                                workspace.notes.length
                            ];
                          setNoteId(next.id);
                          document
                            .getElementById(`note-tab-${next.id}`)
                            ?.focus();
                        }
                      }}
                    >
                      <FileText size={14} />
                      <span>{note.title}</span>
                    </button>
                    <button
                      className="close-tab"
                      aria-label={t("Close note {title}", {
                        title: note.title,
                      })}
                      onClick={() =>
                        setDeleteDialog({
                          type: "note",
                          id: note.id,
                          title: note.title,
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button
                  className="icon-button new-tab"
                  aria-label={t("New note tab")}
                  onClick={() =>
                    setNameDialog({ type: "note", title: t("Untitled") })
                  }
                >
                  <Plus size={17} />
                </button>
                {notesMaximized && !activeNote && (
                  <button
                    className="icon-button"
                    aria-label={t("Restore notes")}
                    data-tooltip={t("Restore notes")}
                    onClick={() => setNotesMaximized(false)}
                  >
                    <Minimize2 size={16} />
                  </button>
                )}
              </div>
              {activeNote ? (
                <>
                  <div
                    role="tabpanel"
                    id="note-panel"
                    aria-labelledby={`note-tab-${activeNote.id}`}
                    className="note-panel"
                  >
                    <Suspense
                      fallback={
                        <div className="note-editor-loading">
                          {t("Loading editor…")}
                        </div>
                      }
                    >
                      <NoteEditor
                        key={activeNote.id}
                        note={activeNote}
                        onChange={(content) => editNote(activeNote, content)}
                        actions={
                          <div className="note-document-tools">
                            <span className="note-filename">
                              {activeNote.title}.
                              {activeNote.format === "markdown" ? "md" : "txt"}
                            </span>
                            <button
                              className="icon-button"
                              data-tooltip={t("Rename note")}
                              aria-label={t("Rename note")}
                              onClick={() =>
                                setNameDialog({
                                  type: "note",
                                  id: activeNote.id,
                                  title: activeNote.title,
                                })
                              }
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button"
                              data-tooltip={t("Download note")}
                              aria-label={t("Download note")}
                              onClick={() =>
                                download(
                                  activeNote.content,
                                  activeNote.title +
                                    "." +
                                    (activeNote.format === "markdown"
                                      ? "md"
                                      : "txt"),
                                  "text/plain;charset=utf-8",
                                )
                              }
                            >
                              <Download size={15} />
                            </button>
                            <button
                              data-note-maximize
                              className="icon-button"
                              data-tooltip={t(
                                notesMaximized
                                  ? "Restore notes"
                                  : "Maximize notes",
                              )}
                              aria-label={t(
                                notesMaximized
                                  ? "Restore notes"
                                  : "Maximize notes",
                              )}
                              onClick={() =>
                                setNotesMaximized((value) => !value)
                              }
                            >
                              {notesMaximized ? (
                                <Minimize2 size={15} />
                              ) : (
                                <Maximize2 size={15} />
                              )}
                            </button>
                          </div>
                        }
                      />
                    </Suspense>
                  </div>
                  <div className="notepad-status">
                    <span>
                      {activeNote.content.length.toLocaleString(locale)}{" "}
                      {t("characters")}
                      <span className="status-divider">|</span>
                      {activeNote.content.split("\n").length}
                      {t("lines")}
                    </span>
                    <span>
                      {saveFailed
                        ? t("Not saved")
                        : pending || dirtyNotes
                          ? t("Saving…")
                          : t("Saved automatically")}
                      <span className="status-divider">|</span>UTF-8
                    </span>
                  </div>
                </>
              ) : (
                <div className="empty-state note-empty">
                  <NotebookPen size={32} />
                  <h2>{t("No notes yet.")}</h2>
                  <p>{t("Create your first note.")}</p>
                  <button
                    className="button primary"
                    onClick={() =>
                      setNameDialog({ type: "note", title: t("Untitled") })
                    }
                  >
                    <Plus size={16} />
                    {t("Create a note")}
                  </button>
                </div>
              )}
            </div>
          ) : section === "all" && overviewLayout === "shortcuts" ? (
            <OverviewShortcuts
              workspace={workspace}
              demo={demo}
              onNavigate={(next) => {
                setSelectedTags([]);
                setListId("");
                navigate(next);
              }}
            />
          ) : (
            <>
              {section === "task" && (
                <div
                  className="task-tabs"
                  role="tablist"
                  aria-label={t("Task lists")}
                >
                  <button
                    role="tab"
                    aria-selected={!listId}
                    className={!listId ? "active" : ""}
                    onClick={() => setListId("")}
                  >
                    {t("All")}
                    <span>{countFor("task")}</span>
                  </button>
                  {workspace.lists.map((list) => (
                    <button
                      key={list.id}
                      role="tab"
                      aria-selected={listId === list.id}
                      className={listId === list.id ? "active" : ""}
                      onClick={() => setListId(list.id)}
                      onDoubleClick={() =>
                        setNameDialog({
                          type: "list",
                          id: list.id,
                          title: list.title,
                        })
                      }
                    >
                      <ListIcon name={list.icon} size={14} />
                      {list.title}
                      <span>
                        {
                          workspace.items.filter(
                            (item) =>
                              item.kind === "task" &&
                              item.list_id === list.id &&
                              !item.completed_at,
                          ).length
                        }
                      </span>
                    </button>
                  ))}
                  <button
                    className="text-button"
                    onClick={() => setNameDialog({ type: "list", title: "" })}
                  >
                    <Plus size={14} />
                    {t("New list")}
                  </button>
                  {listId && (
                    <div className="list-tools">
                      <button
                        className="icon-button"
                        aria-label={t("Edit list")}
                        data-tooltip={t("Edit list")}
                        onClick={() =>
                          setNameDialog({
                            type: "list",
                            id: listId,
                            title:
                              workspace.lists.find((list) => list.id === listId)
                                ?.title || "",
                          })
                        }
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={t("Delete list")}
                        data-tooltip={t("Delete list")}
                        onClick={() =>
                          setDeleteDialog({
                            type: "list",
                            id: listId,
                            title:
                              workspace.lists.find((list) => list.id === listId)
                                ?.title || "",
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="filter-bar">
                <div className="search-field filter-search">
                  <Search size={16} />
                  <input
                    ref={filterRef}
                    aria-label={t("Search your items")}
                    placeholder={
                      section === "completed"
                        ? t("Search completed items…")
                        : t("Search your items…")
                    }
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      aria-label={t("Clear search")}
                      onClick={() => setQuery("")}
                    >
                      <X size={13} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <div className="filter-controls">
                  {!!availableTags.length && (
                    <CompactSelect
                      multiple
                      label={t("Filter by tags")}
                      value={selectedTags}
                      onValueChange={setSelectedTags}
                      icon={<Tag size={15} />}
                      className="tag-filter-select"
                      options={availableTags.map((tag) => ({
                        value: tag,
                        label: tag,
                      }))}
                    />
                  )}
                  <CompactSelect
                    label={t("Sort items")}
                    value={sort}
                    onValueChange={(value) => setSort(value as Sort)}
                    icon={<ListFilter size={15} />}
                    className="sort-select"
                    options={[
                      { value: "manual", label: t("Manual order") },
                      { value: "newest", label: t("Newest first") },
                      { value: "oldest", label: t("Oldest first") },
                      { value: "title", label: t("Title: A–Z") },
                    ]}
                  />
                  {section !== "task" && (
                    <div className="view-switch">
                      <button
                        aria-label={t("Grid view")}
                        aria-pressed={view === "grid"}
                        className={view === "grid" ? "active" : ""}
                        onClick={() => {
                          setView("grid");
                          writePreference("view", "grid");
                        }}
                      >
                        <Grid2X2 size={16} />
                      </button>
                      <button
                        aria-label={t("List view")}
                        aria-pressed={view === "list"}
                        className={view === "list" ? "active" : ""}
                        onClick={() => {
                          setView("list");
                          writePreference("view", "list");
                        }}
                      >
                        <List size={17} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {!visible.length ? (
                <div className="empty-state">
                  <SectionIcon
                    className="empty-icon"
                    size={36}
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  <h2>
                    {query || selectedTags.length > 0
                      ? t("No matches.")
                      : section === "completed"
                        ? t("Nothing completed yet.")
                        : currentCount === 0
                          ? t("All clear.")
                          : t("This list is empty.")}
                  </h2>
                  <p>
                    {query || selectedTags.length > 0
                      ? t("Try another title or clear your search.")
                      : section === "completed"
                        ? t("Completed items appear here.")
                        : t("Add an item to get started.")}
                  </p>
                  {query || selectedTags.length > 0 ? (
                    <button
                      className="button"
                      onClick={() => {
                        setQuery("");
                        setSelectedTags([]);
                      }}
                    >
                      {t("Clear filters")}
                    </button>
                  ) : (
                    section !== "completed" && (
                      <button
                        className="button primary"
                        onClick={() => setAdd(true)}
                      >
                        <Plus size={16} />
                        {t("Add your first item")}
                      </button>
                    )
                  )}
                </div>
              ) : (
                <>
                  {!!media.length &&
                    (view === "grid" ? (
                      <div className="media-grid">
                        {media.map((item) => {
                          const Icon = iconMap[item.kind];
                          return (
                            <article
                              className="media-card"
                              key={item.id}
                              {...dragProps(item, media)}
                            >
                              <div className="card-cover">
                                <button
                                  className="cover-open"
                                  aria-label={t("Edit {title}", {
                                    title: item.title,
                                  })}
                                  onClick={() => setEditing(item)}
                                >
                                  {item.cover_url ? (
                                    <img
                                      src={item.cover_url}
                                      alt={t("Cover of {title}", {
                                        title: item.title,
                                      })}
                                      loading="lazy"
                                      draggable={false}
                                      onError={(event) => {
                                        event.currentTarget.style.display =
                                          "none";
                                      }}
                                    />
                                  ) : null}
                                  <div className="cover-placeholder">
                                    <Icon size={30} strokeWidth={1} />
                                    <span>{item.title}</span>
                                  </div>
                                </button>
                                <span
                                  className="cover-kind"
                                  data-tooltip={t(singular[item.kind])}
                                >
                                  <Icon size={13} />
                                </span>
                                {checkButton(item)}
                                <span className="cover-drag" aria-hidden="true">
                                  <GripVertical size={15} />
                                </span>
                              </div>
                              <div className="card-description">
                                <div>
                                  <h2 data-tooltip={item.title}>
                                    {item.title}
                                  </h2>
                                  <p>
                                    {item.year || t(singular[item.kind])}
                                    {item.year && (
                                      <>
                                        <span>·</span>
                                        {t(singular[item.kind])}
                                      </>
                                    )}
                                  </p>
                                </div>
                                {itemActions(item, media)}
                              </div>
                              <ItemTags
                                tags={item.tags}
                                selected={selectedTags}
                                onSelect={toggleTag}
                              />
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="media-list">
                        <div className="list-header">
                          <span>{t("TITLE")}</span>
                          <span>{t("TYPE")}</span>
                          <span>{t("YEAR")}</span>
                          <span />
                        </div>
                        {media.map((item) => {
                          const Icon = iconMap[item.kind];
                          return (
                            <article
                              className="media-row"
                              key={item.id}
                              {...dragProps(item, media)}
                            >
                              <div className="row-title">
                                <GripVertical size={14} className="row-grip" />
                                <div className="row-cover">
                                  {item.cover_url ? (
                                    <img
                                      src={item.cover_url}
                                      alt=""
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Icon size={18} />
                                  )}
                                </div>
                                <div className="row-item-info">
                                  <button onClick={() => setEditing(item)}>
                                    <strong>{item.title}</strong>
                                    <span>{item.subtitle}</span>
                                  </button>
                                  <ItemTags
                                    tags={item.tags}
                                    selected={selectedTags}
                                    onSelect={toggleTag}
                                  />
                                </div>
                              </div>
                              <span className="kind-label">
                                <Icon size={13} />
                                {t(singular[item.kind])}
                              </span>
                              <span className="row-year">
                                {item.year || "—"}
                              </span>
                              <div className="row-actions">
                                {itemActions(item, media)}
                                {checkButton(item)}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    ))}
                  {!!tasks.length && (
                    <section className="tasks-section">
                      {section !== "task" && (
                        <div className="section-caption">
                          <span>
                            <ListChecks size={15} />
                            {t("TASKS")}
                          </span>
                          <span>{tasks.length}</span>
                        </div>
                      )}
                      <div className="task-rows">
                        {tasks.map((item) => (
                          <article
                            className="task-row"
                            key={item.id}
                            {...dragProps(item, tasks)}
                          >
                            <span
                              className={`priority-stripe priority-${item.priority ?? "normal"}`}
                              role="img"
                              aria-label={t("Priority: {priority}", {
                                priority: t(
                                  t(priorityLabels[item.priority ?? "normal"]),
                                ),
                              })}
                              data-tooltip={t(
                                t(priorityLabels[item.priority ?? "normal"]),
                              )}
                            />
                            <GripVertical size={14} className="row-grip" />
                            {checkButton(item)}
                            <button
                              className="task-title"
                              onClick={() => setEditing(item)}
                            >
                              <strong>{item.title}</strong>
                              {item.subtitle && <span>{item.subtitle}</span>}
                            </button>
                            <div className="task-tags">
                              <ItemTags
                                tags={item.tags}
                                selected={selectedTags}
                                onSelect={toggleTag}
                              />
                            </div>
                            <span
                              className="task-list-icon"
                              role={item.list_id ? "img" : undefined}
                              aria-label={
                                item.list_id
                                  ? t("List: {name}", {
                                      name:
                                        workspace.lists.find(
                                          (list) => list.id === item.list_id,
                                        )?.title ?? "",
                                    })
                                  : undefined
                              }
                              data-tooltip={
                                workspace.lists.find(
                                  (list) => list.id === item.list_id,
                                )?.title
                              }
                            >
                              {item.list_id && (
                                <ListIcon
                                  name={
                                    workspace.lists.find(
                                      (list) => list.id === item.list_id,
                                    )?.icon
                                  }
                                  size={15}
                                />
                              )}
                            </span>
                            {itemActions(item, tasks)}
                          </article>
                        ))}
                        {section === "task" && (
                          <button
                            className="quick-add-task"
                            onClick={() => setAdd(true)}
                          >
                            <Plus size={16} />
                            {t("Add a task")}
                            <span> N </span>
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
      {(add || editing) && (
        <AddDialog
          defaultKind={
            section === "movie" ||
            section === "series" ||
            section === "book" ||
            section === "comic" ||
            section === "game" ||
            section === "task"
              ? section
              : "movie"
          }
          editing={editing}
          items={workspace.items}
          lists={workspace.lists}
          listId={listId}
          demo={demo}
          onSave={addItem}
          onClose={() => {
            setAdd(false);
            setEditing(undefined);
          }}
        />
      )}
      {nameDialog && (
        <Modal
          title={
            nameDialog.id
              ? t("Rename {kind}", {
                  kind: nameDialog.type === "note" ? t("note") : t("list"),
                })
              : nameDialog.type === "note"
                ? t("New note")
                : t("New list")
          }
          onClose={() => !dialogBusy && setNameDialog(undefined)}
        >
          <form noValidate className="manual-form" onSubmit={saveName}>
            <label htmlFor="entry-name">{t("Name")}</label>
            <input
              id="entry-name"
              autoFocus
              required
              maxLength={nameDialog.type === "note" ? 120 : 80}
              placeholder={
                nameDialog.type === "note"
                  ? t("Quick notes")
                  : t("Personal, work, someday…")
              }
              value={nameDialog.title}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) =>
                setNameDialog({ ...nameDialog, title: event.target.value })
              }
            />
            {nameDialog.type === "list" && (
              <ListIconPicker
                value={
                  nameDialog.icon ??
                  workspace.lists.find((list) => list.id === nameDialog.id)
                    ?.icon ??
                  "list"
                }
                onChange={(icon) => setNameDialog({ ...nameDialog, icon })}
              />
            )}
            <div className="modal-actions">
              <button
                className="button"
                type="button"
                disabled={dialogBusy}
                onClick={() => setNameDialog(undefined)}
              >
                {t("Cancel")}
              </button>
              <button
                className="button primary"
                disabled={dialogBusy || !nameDialog.title.trim()}
              >
                {dialogBusy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Check size={15} />
                )}
                {nameDialog.id ? t("Save changes") : t("Create")}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleteDialog && (
        <Modal
          title={t("Delete {kind}", {
            kind:
              deleteDialog.type === "note"
                ? t("note")
                : deleteDialog.type === "list"
                  ? t("list")
                  : t("item"),
          })}
          onClose={() => !dialogBusy && setDeleteDialog(undefined)}
        >
          <div className="confirm-content">
            <p>{t("Delete “{title}”?", { title: deleteDialog.title })}</p>
            <p className="muted">
              {deleteDialog.type === "list"
                ? t("The tasks will stay in All tasks.")
                : deleteDialog.type === "note"
                  ? t("The note and its contents will be permanently deleted.")
                  : t(
                      "You can also mark it as completed to keep it in your archive.",
                    )}
            </p>
            <div className="modal-actions">
              <button
                className="button"
                disabled={dialogBusy}
                onClick={() => setDeleteDialog(undefined)}
              >
                {t("Cancel")}
              </button>
              <button
                className="button danger"
                disabled={dialogBusy}
                onClick={() => void deleteEntry()}
              >
                {dialogBusy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                {t("Delete")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {profileOpen && (
        <ProfileDialog
          profile={profile}
          onClose={() => setProfileOpen(false)}
          onSave={async (value) => {
            const saved = demo
              ? value
              : await api<Profile>("save_profile", { profile: value });
            setProfile(saved);
            if (demo) writePreference("demo-profile", JSON.stringify(saved));
          }}
        />
      )}
      {info && (
        <Modal title={t("About tick")} onClose={() => setInfo(false)}>
          <div className="about-content">
            <div className="about-heading">
              <TickLogo className="about-logo" />
              <span className="about-version">v0.1.0 · MIT</span>
            </div>
            <p>{t("Media lists, tasks and Markdown notes.")}</p>
            <a
              className="about-site"
              href="https://tick.johanamador.com"
              target="_blank"
              rel="noreferrer"
            >
              tick.johanamador.com <ArrowUpRight size={13} />
            </a>
            <div className="about-shortcuts">
              <span>
                <kbd>N</kbd>
                {t("New item or note")}
              </span>
              <span>
                <kbd>/</kbd>
                {t("Search")}
              </span>
              <span>
                <kbd>Esc</kbd>
                {t("Close")}
              </span>
            </div>
            <button
              className="button"
              onClick={() =>
                download(
                  JSON.stringify(workspace, null, 2),
                  "tick-" + new Date().toISOString().slice(0, 10) + ".json",
                  "application/json",
                )
              }
            >
              <Download size={15} />
              {t("Export data")}
            </button>
            <div className="credits">
              <h3>{t("Credits")}</h3>
              <div className="credit-links">
                {[
                  { name: "Lucide", url: "https://lucide.dev" },
                  { name: "Tiptap", url: "https://tiptap.dev" },
                  { name: "Open Library", url: "https://openlibrary.org" },
                  { name: "Comic Vine", url: "https://comicvine.gamespot.com" },
                  { name: "Steam", url: "https://store.steampowered.com" },
                ].map((source) => (
                  <a
                    href={source.url}
                    key={source.name}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.name}
                    <ArrowUpRight size={11} />
                  </a>
                ))}
              </div>
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noreferrer"
                className="tmdb-credit"
              >
                <img src="/tmdb.svg" width="80" height="12" alt="TMDB" />
              </a>
              <p>
                {t(
                  "This product uses the TMDB API but is not endorsed or certified by TMDB.",
                )}
              </p>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <Info size={17} /> : <CheckCheck size={17} />}
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              {t("Undo")}
            </button>
          )}
          <button
            className="icon-button"
            aria-label={t("Dismiss notification")}
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, "-");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
