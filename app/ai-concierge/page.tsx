import Link from "next/link";
import type { Metadata } from "next";
import { Bot, CalendarCheck, MapPinned, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Concierge — DineUp",
  description: "Meet Baymax, DineUp's AI concierge for recommendations, availability checks, and instant reservations.",
};

const features = [
  {
    icon: Sparkles,
    title: "Smart recommendations",
    body: "Describe the vibe, cuisine, or budget you want and Baymax narrows the list instantly.",
  },
  {
    icon: CalendarCheck,
    title: "Live availability",
    body: "Ask if a specific restaurant has tables at a time and Baymax checks current slot inventory.",
  },
  {
    icon: MapPinned,
    title: "Map-aware guidance",
    body: "Jump from the chat card to the live map and focus the restaurant pin in one tap.",
  },
];

export default function AiConciergePage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-10">
        <section className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
            <Bot className="h-4 w-4" />
            AI Concierge
          </div>
          <h1 className="mt-5 font-display text-5xl text-slate-900">Meet Baymax.</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Baymax is DineUp&apos;s restaurant concierge. He can recommend places near you, check live table
            availability, and prepare bookings without making you navigate menus manually.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/#baymax-concierge" className="rounded-full bg-[#FF6B35] px-6 py-3 text-sm font-semibold text-white">
              Open Baymax
            </Link>
            <Link href="/#explore-section" className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-slate-700">
              Explore restaurants
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <feature.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-2xl text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{feature.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}