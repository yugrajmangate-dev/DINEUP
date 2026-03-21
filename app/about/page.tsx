import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Heart, MapPin, Sparkles, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "About DineUp — Our Story",
  description: "DineUp is Pune's AI-powered dining concierge — connecting discerning diners with the city's finest tables.",
};

const values = [
  {
    icon: Sparkles,
    title: "Curated, not crowded",
    body: "We hand-pick venues that meet our standards for food quality, ambiance, and hospitality. Every listing earns its place.",
  },
  {
    icon: MapPin,
    title: "Hyper-local focus",
    body: "Built for Pune first. Every coordinate, every slot, every neighbourhood description is verified on the ground.",
  },
  {
    icon: Zap,
    title: "AI that actually helps",
    body: "Baymax reads the room. Ask in plain English — he finds the table, checks availability, and books it without the back-and-forth.",
  },
  {
    icon: Heart,
    title: "Hospitality first",
    body: "We believe a great booking experience sets the tone for the meal. Every interaction is designed to feel effortless.",
  },
  {
    icon: Users,
    title: "Built with the community",
    body: "Our restaurant partners are collaborators, not inventory. We work hand-in-hand to make each listing shine.",
  },
  {
    icon: Compass,
    title: "Always evolving",
    body: "New neighbourhoods, new cuisines, new features — DineUp grows with the city's dining scene.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-linear-to-b from-orange-50 to-white px-6 pt-24 pb-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">
            About DineUp
          </span>
          <h1 className="mt-6 font-display text-5xl leading-tight text-slate-900 sm:text-6xl">
            Dining rediscovered,<br />one reservation at a time.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            DineUp was born in Pune with one simple belief: finding the perfect table should feel as good
            as the meal itself. We pair human curation with AI precision so every dinner is an occasion.
          </p>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Our mission</p>
            <h2 className="mt-4 font-display text-4xl text-slate-900">
              Make Pune&apos;s best tables accessible to everyone.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-500">
              The city&apos;s finest restaurants often go undiscovered — buried in search results, filtered out by
              algorithms that favour volume over quality. DineUp surfaces them deliberately, with context and
              care, so you can make a decision in seconds rather than scrolling for hours.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-500">
              Our AI concierge, Baymax, does the heavy lifting — checking real-time availability, matching
              your mood to the right cuisine, and confirming your booking in a single conversation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6 text-center">
              <p className="font-display text-4xl text-[#FF6B35]">6+</p>
              <p className="mt-1 text-sm text-slate-500">Curated restaurants</p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="font-display text-4xl text-slate-900">AI</p>
              <p className="mt-1 text-sm text-slate-500">Powered concierge</p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-center">
              <p className="font-display text-4xl text-slate-900">24/7</p>
              <p className="mt-1 text-sm text-slate-500">Booking availability</p>
            </div>
            <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6 text-center">
              <p className="font-display text-4xl text-[#FF6B35]">Pune</p>
              <p className="mt-1 text-sm text-slate-500">India-first focus</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Our values</p>
          <h2 className="mt-4 font-display text-4xl text-slate-900">What we stand for</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-3xl border border-gray-200 bg-white p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-4xl text-slate-900">Ready to dine well?</h2>
          <p className="mt-4 text-slate-500">Let Baymax find your next favourite table.</p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-7 py-3.5 text-sm font-medium text-white shadow-[0_4px_20px_rgba(255,107,53,0.3)] transition-all hover:shadow-[0_8px_32px_rgba(255,107,53,0.45)] active:scale-95"
          >
            Explore restaurants
          </Link>
        </div>
      </section>
    </main>
  );
}

