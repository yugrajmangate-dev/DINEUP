"use client";

import { useSyncExternalStore } from "react";
import {
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";

import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

const navLinks = [
  { label: "Explore", href: "#explore-section" },
  { label: "How it works", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

export function SiteHeader() {
  const { user, status, openAuthModal } = useAuthStore();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-[1800px] px-4 pt-4 sm:px-6">
        <nav className="flex items-center justify-between gap-4 rounded-full border border-white/8 bg-black/60 px-5 py-3 backdrop-blur-xl sm:px-6">
          {/* ── Brand ─────────────────────────────────────── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-display text-lg tracking-wide text-white">DineUp</span>
          </Link>

          {/* ── Desktop nav ───────────────────────────────── */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Right controls ────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-2">
            {!mounted || status === "loading" ? (
              <div className="h-9 w-16 animate-pulse rounded-full bg-white/5" />
            ) : status === "authenticated" && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 sm:flex"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Bookings
                </Link>
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-accent/15 text-accent">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-4 w-4" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white active:scale-95"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-95"
              >
                Sign In
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-300 md:hidden"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        {/* ── Mobile menu ───────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="mt-2 overflow-hidden rounded-3xl border border-white/8 bg-black/80 p-4 backdrop-blur-xl md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
                {status === "authenticated" && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    My Bookings
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
