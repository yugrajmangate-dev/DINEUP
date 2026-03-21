"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Chrome, X } from "lucide-react";

import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

// ─── Public wrapper ───────────────────────────────────────────────────────────

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal } = useAuthStore();

  return (
    <AnimatePresence>
      {isAuthModalOpen ? (
        <AuthModalPanel key="auth-panel" onClose={closeAuthModal} />
      ) : null}
    </AnimatePresence>
  );
}

// ─── Inner panel (mounts fresh each time → no stale state) ───────────────────

function AuthModalPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Google ──────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Email / Password ────────────────────────────────────────────────────────
  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? friendlyError(err.message) : "Authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setError("");
  };

  return (
    <motion.div
      className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/20 px-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-[36px] border border-orange-100 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.12),transparent_32%),linear-gradient(180deg,#ffffff_0%,#fff7f2_100%)] p-8 shadow-[0_32px_80px_rgba(15,23,42,0.16)]"
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.18),transparent_70%)]" />

        {/* Close ────────────────────────────────────────────────────────────── */}
        <button
          type="button"
          title="Close authentication dialog"
          aria-label="Close authentication dialog"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-orange-100 bg-white/90 text-slate-500 shadow-sm hover:bg-orange-50 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header ──────────────────────────────────────────────────────────── */}
        <div className="relative mb-7 pr-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">DineUp account</p>
          <h2 className="mt-2 font-display text-3xl text-slate-900">
            {mode === "signin" ? "Welcome back." : "Join DineUp."}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "signin"
              ? "Sign in to access your reservations and Baymax personalisation."
              : "Create an account to save your reservations and preferences."}
          </p>
        </div>

        {/* Mode tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-full border border-orange-100 bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-all duration-300 ease-out",
                mode === tab
                  ? "bg-accent text-white shadow-[0_4px_20px_rgba(255,107,53,0.3)]"
                  : "text-slate-500 hover:bg-orange-50 hover:text-slate-900",
              )}
            >
              {tab === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Google ──────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => void handleGoogle()}
          disabled={isLoading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-orange-100 bg-white py-3 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-orange-200 hover:bg-orange-50 active:scale-95 disabled:opacity-50"
        >
          <Chrome className="h-4 w-4" />
          Continue with Google
        </button>

        {/* Divider ─────────────────────────────────────────────────────────── */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-orange-100" />
          <p className="text-xs text-slate-400">or continue with email</p>
          <div className="h-px flex-1 bg-orange-100" />
        </div>

        {/* Email form ──────────────────────────────────────────────────────── */}
        <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-accent/50 focus:bg-white focus:ring-0"
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] focus:border-accent/50 focus:bg-white focus:ring-0"
          />

          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </motion.p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(255,107,53,0.24)] transition-all duration-300 hover:shadow-[0_18px_50px_rgba(255,107,53,0.3)] active:scale-95 disabled:opacity-60"
          >
            {isLoading
              ? "Please wait…"
              : mode === "signin"
                ? "Sign In"
                : "Create account"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip Firebase's verbose error prefix for cleaner UI messages. */
function friendlyError(raw: string): string {
  const match = /\(auth\/(.*?)\)/.exec(raw);
  if (!match) return raw;

  const code = match[1];
  const map: Record<string, string> = {
    "user-not-found": "No account found with that email.",
    "wrong-password": "Incorrect password. Try again.",
    "email-already-in-use": "That email is already registered. Sign in instead.",
    "weak-password": "Password must be at least 6 characters.",
    "invalid-email": "Please enter a valid email address.",
    "invalid-api-key": "Firebase API key is invalid. Verify NEXT_PUBLIC_FIREBASE_API_KEY in .env.local and restart the dev server.",
    "too-many-requests": "Too many attempts. Please try again later.",
    "popup-closed-by-user": "Sign-in popup was closed before completing.",
  };

  return map[code] ?? raw;
}
