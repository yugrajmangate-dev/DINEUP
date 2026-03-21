"use client";

import { useSyncExternalStore } from "react";
import {
  Compass,
  CreditCard,
  History,
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
  { label: "Explore", href: "/#explore-section" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

const accountLinks = [
  { label: "Bookings", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payments", href: "/payments", icon: CreditCard },
  { label: "History", href: "/order-history", icon: History },
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
      <div className="mx-auto max-w-450 px-4 pt-4 sm:px-6">
        <nav className="flex items-center justify-between gap-4 rounded-full border border-gray-200 bg-white/90 px-5 py-3 shadow-[0_4px_24px_rgb(0,0,0,0.06)] backdrop-blur-xl sm:px-6">
          {/* ── Brand ─────────────────────────────────────── */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-[#FF6B35]">
              <Compass className="h-4 w-4" />
            </div>
            <span className="font-display text-lg tracking-wide text-slate-900">DineUp</span>
          </Link>

          {/* ── Desktop nav ───────────────────────────────── */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right controls ────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-2">
            {!mounted || status === "loading" ? (
              <div className="h-9 w-16 animate-pulse rounded-full bg-gray-100" />
            ) : status === "authenticated" && user ? (
              <>
                <div className="hidden items-center gap-2 lg:flex">
                  {accountLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-900 transition-all hover:border-orange-200 hover:bg-orange-50 active:scale-95"
                    >
                      <link.icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 text-[#FF6B35]">
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
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 hover:bg-gray-50 hover:text-slate-900 active:scale-95"
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="rounded-full bg-[#FF6B35] px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(255,107,53,0.28)] transition-all hover:brightness-105 active:scale-95"
              >
                Sign In
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-500 md:hidden"
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
              className="mt-2 overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] md:hidden"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm text-slate-500 transition-colors hover:bg-gray-50 hover:text-slate-900"
                  >
                    {link.label}
                  </Link>
                ))}
                {status === "authenticated" && accountLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-slate-500 hover:bg-gray-50 hover:text-slate-900"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

