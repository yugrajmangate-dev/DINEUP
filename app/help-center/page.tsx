import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center — DineUp",
  description: "Support articles for reservations, accounts, payments, and Baymax on DineUp.",
};

const faqs = [
  ["How do I reserve a table?", "Open a restaurant card or ask Baymax directly. Pick a slot, confirm, and the reservation is saved to your dashboard."],
  ["Why is distance approximate?", "If live GPS access is denied, DineUp sorts from central Pune until your browser shares a precise location."],
  ["Why can chat fail?", "Baymax depends on the AI service and live reservation inventory. If either is temporarily unavailable, retry in a moment."],
];

export default function HelpCenterPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Support</p>
        <h1 className="mt-3 font-display text-5xl text-slate-900">Help Center</h1>
        <div className="mt-8 space-y-4">
          {faqs.map(([question, answer]) => (
            <section key={question} className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="font-semibold text-slate-900">{question}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{answer}</p>
            </section>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contact" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
            Still need help? Contact support →
          </Link>
        </div>
      </div>
    </main>
  );
}