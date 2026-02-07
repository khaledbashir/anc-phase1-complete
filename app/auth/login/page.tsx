"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

const FRENCH_BLUE = "#0A52EF";
const FRENCH_BLUE_DARK = "#002C73";

const pageStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: "1rem",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    maxWidth: "28rem",
    width: "100%",
    borderRadius: "1rem",
    border: "1px solid #e4e4e7",
    backgroundColor: "#fff",
    padding: "2rem",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: {
    color: FRENCH_BLUE_DARK,
    fontSize: "1.5rem",
    fontWeight: 700,
    letterSpacing: "-0.025em",
    margin: 0,
  },
  subtitle: {
    color: "#71717a",
    fontSize: "0.875rem",
    marginTop: "0.25rem",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  label: {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#3f3f46",
  },
  input: {
    width: "100%",
    height: "2.75rem",
    padding: "0 0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid #d4d4d8",
    backgroundColor: "#fff",
    color: "#18181b",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  error: {
    fontSize: "0.875rem",
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    margin: 0,
  },
  button: {
    width: "100%",
    height: "2.75rem",
    borderRadius: "0.5rem",
    fontWeight: 600,
    color: "#fff",
    backgroundColor: FRENCH_BLUE,
    border: "none",
    fontSize: "1rem",
    cursor: "pointer",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center" as const,
    fontSize: "0.75rem",
    color: "#71717a",
    margin: "1.5rem 0 0 0",
  },
};

export default function LoginPage() {
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") ?? "/");
    setUrlError(params.get("error"));
  }, []);

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

  const showError = urlError === "CredentialsSignin" || message;

  return (
    <div style={pageStyles.root}>
      <style>{`
        #login-email:focus, #login-password:focus {
          outline: none;
          border-color: ${FRENCH_BLUE};
          box-shadow: 0 0 0 2px ${FRENCH_BLUE}40;
        }
      `}</style>
      <div style={pageStyles.card}>
        <div style={pageStyles.header}>
          <h1 style={pageStyles.title}>ANC Proposal Engine</h1>
          <p style={pageStyles.subtitle}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} style={pageStyles.form}>
          <div style={pageStyles.field}>
            <label htmlFor="login-email" style={pageStyles.label}>
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={pageStyles.input}
            />
          </div>
          <div style={pageStyles.field}>
            <label htmlFor="login-password" style={pageStyles.label}>
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={pageStyles.input}
            />
          </div>

          {showError && (
            <p style={pageStyles.error}>
              {message || "Invalid credentials. Please try again."}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...pageStyles.button,
              ...(loading ? pageStyles.buttonDisabled : {}),
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p style={pageStyles.footer}>
          Use your ANC account to access the proposal engine.
        </p>
      </div>
    </div>
  );
}
