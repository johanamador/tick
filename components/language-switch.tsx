"use client";
import { Languages } from "lucide-react";
import { CompactSelect } from "./compact-select";
import { useLanguage } from "./language-provider";
import type { Locale } from "@/lib/i18n";
export function LanguageSwitch() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <CompactSelect
      label={t("Language")}
      value={locale}
      onValueChange={(value) => setLocale(value as Locale)}
      options={[
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
      ]}
      icon={<Languages size={15} />}
      className="language-select"
    />
  );
}
