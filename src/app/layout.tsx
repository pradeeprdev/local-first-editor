import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local-First Collaborative Editor",
  description: "Offline-first document editor with CRDT sync and version history",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        <main className="flex-1">{children}</main>
        {/* Required by submission guidelines - replace the placeholders below */}
        <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
          Built by <strong>YOUR NAME HERE</strong> ·{" "}
          <a href="https://github.com/YOUR_GITHUB" className="underline">
            GitHub
          </a>{" "}
          ·{" "}
          <a href="https://linkedin.com/in/YOUR_LINKEDIN" className="underline">
            LinkedIn
          </a>
        </footer>
      </body>
    </html>
  );
}
