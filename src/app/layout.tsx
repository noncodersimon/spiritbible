// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "SpiritBible",
  description: "A clean, fast Bible reader with notes and search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} h-full`}
      >
        {/* Header */}
        <header className="site-header sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-900/50 bg-transparent dark:bg-transparent">
          <div className="mx-auto max-w-5xl w-full px-4 py-3 flex items-center justify-start">
            <Link
              href="/"
              className="site-title font-semibold tracking-tight text-lg flex items-center gap-2"
            >
              <img
                className="site-mark"
                src="/digitelos-spiral.svg"
                alt=""
                aria-hidden="true"
              />
              SpiritBible
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

        {/* Footer */}
        <footer className="site-footer">
          <p className="translation-credit">
            Bible text: <a href="https://ebible.org/eng-webbe/" target="_blank" rel="noopener noreferrer">World English Bible, British Edition</a>
            {' · '}
            <a href="https://ebible.org/eng-webbe/copyright.htm" target="_blank" rel="noopener noreferrer">Public domain</a>
          </p>
          <a href="https://digitelos.co.uk">
            <img src="/digitelos-spiral.svg" alt="" aria-hidden="true" />
            Built by Digitelos
          </a>
        </footer>
      </body>
    </html>
  );
}
