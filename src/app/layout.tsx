// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

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
        className={`${inter.className} h-full `}
      >
        {/* Header */}
        <header className="site-header sticky top-0 z-50 border-b border-neutral-200/50 dark:border-neutral-900/50 bg-transparent dark:bg-transparent">
          <div className="mx-auto max-w-5xl w-full px-4 py-3 flex items-center justify-start">
            <Link href="/" className="site-title font-semibold tracking-tight text-lg">
              SpiritBible
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
