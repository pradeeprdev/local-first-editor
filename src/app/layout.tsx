import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Marginal — local-first collaborative editor",
  description: "Offline-first document editor with CRDT sync and version history",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${inter.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col bg-paper text-ink antialiased">
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-hairline px-6 py-4 text-center font-mono text-[11px] uppercase tracking-wider text-ink/40">
          Built by <strong className="font-medium text-ink/60">Pradeep Rawat</strong> ·{" "}
          <a href="https://github.com/pradeeprdev" className="underline decoration-hairline underline-offset-2 hover:text-plum">
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://www.linkedin.com/in/pradeeprawatdev" className="underline decoration-hairline underline-offset-2 hover:text-plum">
            LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}