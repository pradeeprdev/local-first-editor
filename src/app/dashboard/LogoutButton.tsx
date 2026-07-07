"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        startTransition(() => {
          router.push("/login");
          router.refresh();
        });
      }}
      disabled={isPending}
      className="font-mono text-[11px] uppercase tracking-wider text-ink/45 underline decoration-hairline underline-offset-4 transition-colors hover:text-plum disabled:opacity-50"
    >
      {isPending ? "Logging out…" : "Log out"}
    </button>
  );
}