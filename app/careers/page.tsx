import type { Metadata } from "next";
import { Briefcase, Globe, Heart, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers — DineUp",
  description: "Join the team building Pune's most beloved dining platform. We're hiring across engineering, design, and partnerships.",
};

const openRoles = [
  {
    title: "Full-Stack Engineer",
    team: "Engineering",
    location: "Pune / Remote",
    type: "Full-time",
    description: "Build the features that help diners discover and book Pune's best tables. You'll work across Next.js, TypeScript, and our AI layer.",
  },
  {
    title: "AI/ML Engineer",
    team: "Engineering",
    location: "Pune / Remote",
    type: "Full-time",
    description: "Improve Baymax — our AI concierge — with better intent detection, personalisation, and multi-turn conversation capabilities.",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Pune / Remote",
    type: "Full-time",
    description: "Shape the end-to-end DineUp experience from discovery to booking. You care deeply about motion, typography, and micro-interactions.",
  },
  {
    title: "Restaurant Partnerships Manager",
    team: "Partnerships",
    location: "Pune",
    type: "Full-time",
    description: "Build and nurture relationships with Pune's restaurant community. You're the bridge between our platform and the venues we feature.",
  },
  {
    title: "Growth & Marketing Lead",
    team: "Marketing",
    location: "Pune / Remote",
    type: "Full-time",
    description: "Drive diner acquisition and retention through content, social, and performance channels. You understand both food culture and metrics.",
  },
];

const perks = [
  { icon: Heart, label: "Health coverage" },
  { icon: Globe, label: "Remote-first" },
  { icon: Zap, label: "Fast shipping culture" },
  { icon: Briefcase, label: "Equity for all" },
];

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-linear-to-b from-orange-50 to-white px-6 pt-24 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">
            Careers
          </span>
          <h1 className="mt-6 font-display text-5xl leading-tight text-slate-900 sm:text-6xl">
            Help us feed<br />a great city.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            We&apos;re a small, ambitious team building the dining platform Pune deserves.
            If you love food, technology, and craft — you&apos;ll fit right in.
          </p>
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 px-6 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {perks.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Open roles ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-8 lg:px-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Open roles</p>
        <h2 className="mt-3 font-display text-4xl text-slate-900">Join the table</h2>
        <div className="mt-10 space-y-4">
          {openRoles.map((role) => (
            <div
              key={role.title}
              className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-[#FF6B35] transition-colors">
                    {role.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full border border-gray-200 px-3 py-0.5 text-xs text-slate-500">
                      {role.team}
                    </span>
                    <span className="rounded-full border border-gray-200 px-3 py-0.5 text-xs text-slate-500">
                      {role.location}
                    </span>
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-0.5 text-xs text-[#FF6B35]">
                      {role.type}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{role.description}</p>
                </div>
                <a
                  href={`mailto:dineupservices@gmail.com?subject=Application: ${encodeURIComponent(role.title)}`}
                  className="shrink-0 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-slate-700 transition-all hover:border-[#FF6B35] hover:bg-orange-50 hover:text-[#FF6B35]"
                >
                  Apply →
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-orange-100 bg-orange-50 p-8 text-center">
          <h3 className="font-display text-2xl text-slate-900">Don&apos;t see your role?</h3>
          <p className="mt-2 text-sm text-slate-500">
            Send us a note anyway — we&apos;re always interested in exceptional people.
          </p>
          <a
            href="mailto:dineupservices@gmail.com"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-medium text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)] transition-all hover:shadow-[0_8px_24px_rgba(255,107,53,0.4)] active:scale-95"
          >
            Say hello
          </a>
        </div>
      </section>
    </main>
  );
}

