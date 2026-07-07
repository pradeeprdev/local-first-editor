"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Registration failed");
      return;
    }
    // startTransition keeps this route mounted (no blank flash) while the
    // dashboard's server component renders in the background, then swaps in.
    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
        New account
      </p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-ink/50">
        Documents sync across your devices, online or off.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
            Full name
          </label>
          <input
            id="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-hairline bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="ada@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-hairline bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-hairline bg-paper-raised px-3 py-2.5 text-sm text-ink placeholder:text-ink/30 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum/15"
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="rounded-md bg-brick/10 px-3 py-2 text-sm text-brick" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex items-center justify-center gap-2 rounded-md bg-plum px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-plum-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink/50">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-plum underline decoration-plum/30 underline-offset-2 hover:decoration-plum">
          Log in
        </Link>
      </p>
    </div>
  );
}