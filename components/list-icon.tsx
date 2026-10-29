import {
  List,
  Inbox,
  House,
  BriefcaseBusiness,
  Code2,
  Heart,
  Film,
  BookOpen,
  Gamepad2,
  ShoppingCart,
  CalendarDays,
  Target,
  Lightbulb,
  Music,
  Plane,
  Star,
  Dumbbell,
  GraduationCap,
  Coffee,
  Folder,
  type LucideProps,
} from "lucide-react";
import { listIconNames } from "@/lib/list-icons";
import { useLanguage } from "./language-provider";

const labels = {
  list: "List",
  inbox: "Inbox",
  home: "Home",
  work: "Work",
  code: "Code",
  heart: "Heart",
  film: "Film",
  book: "Book",
  game: "Game",
  shopping: "Shopping",
  calendar: "Calendar",
  target: "Target",
  idea: "Idea",
  music: "Music",
  travel: "Travel",
  star: "Star",
  fitness: "Fitness",
  study: "Study",
  coffee: "Coffee",
  folder: "Folder",
};
const icons = {
  list: List,
  inbox: Inbox,
  home: House,
  work: BriefcaseBusiness,
  code: Code2,
  heart: Heart,
  film: Film,
  book: BookOpen,
  game: Gamepad2,
  shopping: ShoppingCart,
  calendar: CalendarDays,
  target: Target,
  idea: Lightbulb,
  music: Music,
  travel: Plane,
  star: Star,
  fitness: Dumbbell,
  study: GraduationCap,
  coffee: Coffee,
  folder: Folder,
};
export function ListIcon({
  name = "list",
  ...props
}: LucideProps & { name?: string }) {
  const Icon = icons[name as keyof typeof icons] ?? List;
  return <Icon aria-hidden="true" {...props} />;
}
export function ListIconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <fieldset className="list-icon-picker">
      <legend>{t("List icon")}</legend>
      <div role="group" aria-label={t("List icon")}>
        {listIconNames.map((name) => (
          <button
            key={name}
            type="button"
            className="icon-button"
            aria-label={t(labels[name])}
            aria-pressed={value === name}
            data-tooltip={t(labels[name])}
            onClick={() => onChange(name)}
          >
            <ListIcon name={name} size={18} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
