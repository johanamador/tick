import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";

const description =
  "Media lists, tasks and Markdown notes. A personal workspace you can self-host.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tick.johanamador.com"),
  title: "tick",
  description,
  robots: { index: false, follow: false },
  openGraph: {
    title: "tick",
    description,
    url: "/",
    siteName: "tick",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "tick",
    description,
    images: [
      {
        url: "/opengraph-image.jpg",
        alt: "tick workspace with category shortcuts for media, tasks and notes",
      },
    ],
  },
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
