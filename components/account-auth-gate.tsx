"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";

type AccountAuthGateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  onSignIn: () => void;
};

export function AccountAuthGate({
  title,
  description,
  ctaLabel = "Sign in to continue",
  onSignIn,
}: AccountAuthGateProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="glass-panel rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-[#FF6B35]">
            <LogIn className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.26em] text-slate-400">Account access</p>
          <h1 className="mt-3 font-display text-4xl text-slate-900 sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
            {description}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,107,53,0.28)] hover:shadow-[0_16px_40px_rgba(255,107,53,0.38)] active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              {ctaLabel}
            </button>
            <Link
              href="/#explore-section"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:border-orange-200 hover:text-slate-900"
            >
              Explore restaurants
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}