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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="glass-panel relative w-full max-w-md overflow-hidden rounded-[36px] border border-white/10 p-8"
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
      >
        {/* Close ────────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-400 hover:bg-white/10 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header ──────────────────────────────────────────────────────────── */}
        <div className="mb-7 pr-8">
          <h2 className="font-display text-3xl text-white">
            {mode === "signin" ? "Welcome back." : "Join DineUp."}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {mode === "signin"
              ? "Sign in to access your reservations and Baymax personalisation."
              : "Create an account to save your reservations and preferences."}
          </p>
        </div>

        {/* Mode tabs ────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 rounded-full border border-white/8 bg-white/5 p-1">
          {(["signin", "signup"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => switchMode(tab)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-medium transition-all duration-300 ease-out",
                mode === tab
                  ? "bg-accent text-black shadow-[0_4px_20px_rgba(255,107,107,0.3)]"
                  : "text-zinc-400 hover:text-white",
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
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 py-3 text-sm text-white transition-all duration-300 hover:border-white/20 hover:bg-white/10 active:scale-95 disabled:opacity-50"
        >
          <Chrome className="h-4 w-4" />
          Continue with Google
        </button>

        {/* Divider ─────────────────────────────────────────────────────────── */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/8" />
          <p className="text-xs text-zinc-500">or continue with email</p>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* Email form ──────────────────────────────────────────────────────── */}
        <form onSubmit={(e) => void handleEmailAuth(e)} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent/40 focus:bg-white/8 focus:ring-0"
          />
          <input
            type="password"
            placeholder="Password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent/40 focus:bg-white/8 focus:ring-0"
          />

          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-300"
            >
              {error}
            </motion.p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,107,107,0.24)] transition-all duration-300 hover:shadow-[0_18px_50px_rgba(255,107,107,0.3)] active:scale-95 disabled:opacity-60"
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
    "too-many-requests": "Too many attempts. Please try again later.",
    "popup-closed-by-user": "Sign-in popup was closed before completing.",
  };

  return map[code] ?? raw;
}
