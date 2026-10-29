"use client";
import { useLanguage } from "./language-provider";
import { useId, useState } from "react";
import { TickLogo } from "./tick-logo";
import { LanguageSwitch } from "./language-switch";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";

export type LoginScreenshot = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
};

export function LoginForm({
  configured,
  showPreview,
  screenshots = [],
}: {
  configured: boolean;
  showPreview: boolean;
  screenshots?: LoginScreenshot[];
}) {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [preview, setPreview] = useState(0);
  const previewId = useId();
  const activeScreenshot = screenshots[preview] ?? screenshots[0];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (!String(data.get("username") || "").trim() || !data.get("password")) {
      setError(t("Enter your username and password."));
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.get("username"),
          password: data.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || t("Could not sign in."));
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError(t("Could not connect. Try again."));
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <header className="login-header">
        <a className="login-brand" href="/" aria-label={t("tick — home")}>
          <TickLogo />
        </a>
        <div className="login-header-links">
          <a
            className="login-author-link"
            href="https://johanamador.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("Johan Amador's website")}
            title={t("Johan Amador's website")}
          >
            <img src="/ja.svg" alt="" width="29" height="20" />
          </a>
          <a
            className="login-repo-link"
            href="https://github.com/johanamador/tick"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("tick on GitHub")}
            title={t("tick on GitHub")}
          >
            <img src="/github.svg" alt="" width="20" height="20" />
          </a>
          <LanguageSwitch />
        </div>
      </header>
      <div className={`login-layout ${activeScreenshot ? "with-preview" : ""}`}>
        {activeScreenshot && (
          <aside className="login-preview" aria-label={t("Preview")}>
            <div
              className="login-preview-screen"
              role="tabpanel"
              id={`${previewId}-panel`}
              aria-labelledby={`${previewId}-${activeScreenshot.id}`}
            >
              <img
                key={activeScreenshot.id}
                src={activeScreenshot.src}
                width={activeScreenshot.width}
                height={activeScreenshot.height}
                loading="lazy"
                decoding="async"
                alt={t("tick preview: {view}", {
                  view: t(activeScreenshot.label),
                })}
                draggable={false}
              />
            </div>
            <div
              className="login-preview-tabs"
              role="tablist"
              aria-label={t("Preview")}
            >
              {screenshots.map((screenshot, index) => (
                <button
                  type="button"
                  role="tab"
                  id={`${previewId}-${screenshot.id}`}
                  key={screenshot.id}
                  aria-controls={`${previewId}-panel`}
                  aria-selected={activeScreenshot.id === screenshot.id}
                  tabIndex={activeScreenshot.id === screenshot.id ? 0 : -1}
                  onClick={() => setPreview(index)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % screenshots.length;
                    else if (event.key === "ArrowLeft")
                      next =
                        (index - 1 + screenshots.length) % screenshots.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = screenshots.length - 1;
                    else return;
                    event.preventDefault();
                    setPreview(next);
                    document
                      .getElementById(`${previewId}-${screenshots[next].id}`)
                      ?.focus();
                  }}
                >
                  {t(screenshot.label)}
                </button>
              ))}
            </div>
          </aside>
        )}
        <section className="login-panel" aria-labelledby="login-title">
          <h1 id="login-title">{t("Welcome back.")}</h1>
          <p>{t("Sign in to your workspace.")}</p>
          <form noValidate onSubmit={submit}>
            <label htmlFor="username">{t("Username")}</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("Your username")}
              required
              disabled={!configured || busy}
            />
            <label htmlFor="password">{t("Password")}</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder={t("Your password")}
                required
                disabled={!configured || busy}
              />
              <button
                type="button"
                aria-label={visible ? t("Hide password") : t("Show password")}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {error && (
              <p role="alert" className="error-text">
                {t(error)}
              </p>
            )}
            {!configured && (
              <p className="setup-notice">
                {t(
                  "Configure Supabase and run npm run admin to create your account.",
                )}
              </p>
            )}
            <button
              className="button primary login-submit"
              disabled={!configured || busy}
            >
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <>
                  {t("Sign in")}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          {showPreview && (
            <a className="preview-link" href="/demo">
              {t("Open demo")}
              <ArrowRight size={14} />
            </a>
          )}
        </section>
      </div>
    </main>
  );
}
