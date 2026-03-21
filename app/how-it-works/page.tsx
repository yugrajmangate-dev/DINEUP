import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarCheck, MapPin, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "How DineUp Works",
  description: "Discover Pune's best restaurants, get AI-powered recommendations, and book your table in seconds.",
};

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover",
    body: "Browse our curated selection of Pune's finest venues — filtered by cuisine, vibe, price, and proximity to your location. Every listing is hand-verified.",
    detail: [
      "Real-time distance sorting via GPS",
      "Filter by cuisine, vibe & price tier",
      "Detailed menus, photos & operating hours",
    ],
  },
  {
    number: "02",
    icon: Bot,
    title: "Ask Baymax",
    body: "Our AI concierge understands natural language. Tell him what you're craving, when, and for how many people — he'll handle the rest.",
    detail: [
      "\"Book Toit Brewery at 8 PM for 2\"",
      "\"Veg-friendly place near Koregaon Park\"",
      "\"Check if Mainland China has tables at 9\"",
    ],
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Book instantly",
    body: "Confirm your reservation in one tap. Baymax checks live availability, locks your slot, and saves the booking to your dashboard.",
    detail: [
      "Real-time slot availability",
      "Instant confirmation — no calls needed",
      "Manage bookings from your dashboard",
    ],
  },
  {
    number: "04",
    icon: MapPin,
    title: "Dine",
    body: "The map tracks your chosen venue live. Show up, give your name, and enjoy. That's all there is to it.",
    detail: [
      "Live TomTom map with walking distance",
      "Venue highlights pinned automatically",
      "Rate and revisit via your booking history",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-linear-to-b from-orange-50 to-white px-6 pt-24 pb-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">
            How it works
          </span>
          <h1 className="mt-6 font-display text-5xl leading-tight text-slate-900 sm:text-6xl">
            From craving to table<br />in under a minute.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            DineUp combines live inventory, a location-aware map, and an AI concierge into one seamless flow.
          </p>
        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-8 lg:px-12">
        <div className="space-y-16">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isEven = i % 2 === 1;
            return (
              <div
                key={step.number}
                className={`flex flex-col gap-10 lg:flex-row lg:items-center ${isEven ? "lg:flex-row-reverse" : ""}`}
              >
                {/* Visual */}
                <div className="flex-1">
                  <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50 p-10">
                    <div className="flex items-start gap-5">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B35] text-white shadow-[0_8px_24px_rgba(255,107,53,0.3)]">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">
                          Step {step.number}
                        </p>
                        <h2 className="mt-1 font-display text-3xl text-slate-900">{step.title}</h2>
                      </div>
                    </div>
                    <ul className="mt-8 space-y-3">
                      {step.detail.map((d) => (
                        <li key={d} className="flex items-start gap-3 text-sm text-slate-500">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF6B35]" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 space-y-4">
                  <p className="text-base leading-relaxed text-slate-600">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-orange-50 px-6 py-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-4xl text-slate-900">See it in action</h2>
          <p className="mt-4 text-slate-500">
            Ask Baymax to find you a table right now — he&apos;s live on the home page.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#FF6B35] px-7 py-3.5 text-sm font-medium text-white shadow-[0_4px_20px_rgba(255,107,53,0.3)] transition-all hover:shadow-[0_8px_32px_rgba(255,107,53,0.45)] active:scale-95"
          >
            Try it free
          </Link>
        </div>
      </section>
    </main>
  );
}

