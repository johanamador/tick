import { spanish } from "./translations";
export type Locale = "en" | "es";
export function translator(locale: Locale) {
  return (message: string, values: Record<string, string | number> = {}) => {
    const text = locale === "es" ? (spanish[message] ?? message) : message;
    return text.replace(/\{(\w+)\}/g, (match, key: string) =>
      String(values[key] ?? match),
    );
  };
}
