"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

const FRENCH_BLUE = "#0A52EF";
const FRENCH_BLUE_DARK = "#002C73";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setMessage("Invalid email or password.");
        setLoading(false);
        return;
      }
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--anc-border)] bg-white p-8 shadow-lg"
        style={{ borderColor: "#e4e4e7" }}
      >
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/ANC_Logo_2023_blue.png"
            alt="ANC Sports"
            width={160}
            height={48}
            className="mb-6"
            priority
          />
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: FRENCH_BLUE_DARK }}
          >
            ANC Proposal Engine
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all focus:ring-[#0A52EF]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all focus:ring-[#0A52EF]"
              placeholder="••••••••"
            />
          </div>

          {(error === "CredentialsSignin" || message) && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {message || "Invalid credentials. Please try again."}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: FRENCH_BLUE,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Use your ANC account to access the proposal engine.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><span className="text-zinc-500">Loading…</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
