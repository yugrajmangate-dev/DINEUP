import type { Metadata } from "next";
import { Download, FileText, ImageIcon, Palette } from "lucide-react";

export const metadata: Metadata = {
  title: "Press Kit — DineUp",
  description: "Media resources, logos, brand guidelines and story for DineUp — Pune's AI-powered dining platform.",
};

const assets = [
  {
    icon: ImageIcon,
    title: "Logo Package",
    description: "SVG, PNG (light & dark), and favicon in all standard sizes.",
    action: "Download logos",
    href: "#",
  },
  {
    icon: Palette,
    title: "Brand Guidelines",
    description: "Typography, colour palette, tone of voice, and usage rules.",
    action: "View guidelines",
    href: "#",
  },
  {
    icon: FileText,
    title: "Fact Sheet",
    description: "Key stats, founding story, and product overview in one page.",
    action: "Download PDF",
    href: "#",
  },
  {
    icon: Download,
    title: "Product Screenshots",
    description: "High-resolution UI screenshots of the web app — all viewports.",
    action: "Download pack",
    href: "#",
  },
];

const facts = [
  { label: "Founded", value: "2026" },
  { label: "HQ", value: "Pune, India" },
  { label: "Focus", value: "Hyper-local dining" },
  { label: "Technology", value: "Next.js · Groq AI · TomTom Maps" },
];

export default function PressPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-linear-to-b from-orange-50 to-white px-6 pt-24 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">
            Press Kit
          </span>
          <h1 className="mt-6 font-display text-5xl leading-tight text-slate-900 sm:text-6xl">
            Media resources
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-500">
            Everything you need to write about DineUp accurately and beautifully.
            For interviews and custom requests, reach us at{" "}
            <a href="mailto:dineupservices@gmail.com" className="text-[#FF6B35] underline underline-offset-2">
              dineupservices@gmail.com
            </a>
          </p>
        </div>
      </section>

      {/* ── Quick facts ──────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 px-6 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Quick facts</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
                <p className="mt-1.5 font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Assets ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20 sm:px-8 lg:px-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Assets</p>
        <h2 className="mt-3 font-display text-4xl text-slate-900">Download resources</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {assets.map(({ icon: Icon, title, description, action, href }) => (
            <div
              key={title}
              className="flex gap-5 rounded-3xl border border-gray-200 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{description}</p>
                <a
                  href={href}
                  className="mt-2 text-sm font-medium text-[#FF6B35] hover:underline"
                >
                  {action} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Boilerplate ──────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#FF6B35]">Approved boilerplate</p>
          <h2 className="mt-3 font-display text-3xl text-slate-900">About DineUp (approved copy)</h2>
          <blockquote className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
            DineUp is Pune&apos;s AI-powered dining concierge. The platform combines a curated map of
            the city&apos;s finest restaurants with Baymax — an AI assistant that discovers, checks
            availability, and books tables in a single natural-language conversation. DineUp
            is built on Next.js, powered by Groq AI, and visualised using TomTom Maps.
          </blockquote>
        </div>
      </section>
    </main>
  );
}

