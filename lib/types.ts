export const kinds = [
  "movie",
  "series",
  "book",
  "comic",
  "game",
  "task",
] as const;
export type Kind = (typeof kinds)[number];
export type Section = "all" | Kind | "notes" | "completed";
export type Sort = "manual" | "newest" | "oldest" | "title";
export const priorities = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof priorities)[number];
export const priorityLabels: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
export type Item = {
  id: string;
  kind: Kind;
  title: string;
  subtitle: string;
  year: string;
  cover_url: string | null;
  source: string | null;
  external_id: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  list_id: string | null;
  tags: string[];
  priority: Priority;
};
export type Note = {
  id: string;
  title: string;
  content: string;
  format: "plain" | "markdown";
  position: number;
  updated_at: string;
};
export type TaskList = {
  id: string;
  title: string;
  position: number;
  icon?: string;
};
export type Profile = {
  display_name: string;
  avatar_data: string | null;
};
export type Workspace = {
  items: Item[];
  notes: Note[];
  lists: TaskList[];
};
export type MetadataResult = Pick<
  Item,
  | "kind"
  | "title"
  | "subtitle"
  | "year"
  | "cover_url"
  | "source"
  | "external_id"
>;
export type ItemDraft = MetadataResult & {
  list_id: string | null;
  tags: string[];
  priority: Priority;
};
export const labels: Record<Kind, string> = {
  movie: "Movies",
  series: "TV shows",
  book: "Books",
  comic: "Comics",
  game: "Games",
  task: "Tasks",
};
export const singular: Record<Kind, string> = {
  movie: "Movie",
  series: "TV show",
  book: "Book",
  comic: "Comic",
  game: "Game",
  task: "Task",
};
