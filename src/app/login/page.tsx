"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        No account?{" "}
        <Link href="/register" className="text-blue-600 underline">
          Register
        </Link>
      </p>
    </div>
  );
}
