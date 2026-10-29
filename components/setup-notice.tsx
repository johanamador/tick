"use client";
import { useLanguage } from "./language-provider";
import { TickLogo } from "./tick-logo";
export function SetupNotice() {
  const { t } = useLanguage();
  return (
    <main className="setup-page">
      <div className="setup-card">
        <TickLogo />
        <h1>{t("Could not load your workspace.")}</h1>
        <p>
          {t(
            "Apply the database migrations, then create your account with npm run admin.",
          )}
        </p>
        <a className="button primary" href="/">
          {t("Try again")}
        </a>
      </div>
    </main>
  );
}
