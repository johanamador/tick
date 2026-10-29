import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "tick",
  description:
    "Media lists, tasks and notes. A personal workspace you can self-host.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "32x32" },
      {
        url: "/favicon-light.svg?v=tick-1",
        media: "(prefers-color-scheme: light)",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        url: "/favicon-dark.svg?v=tick-1",
        media: "(prefers-color-scheme: dark)",
        type: "image/svg+xml",
        sizes: "any",
      },
    ],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
