import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — DineUp",
  description: "Terms governing the use of DineUp, Baymax, and restaurant reservations.",
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Legal</p>
        <h1 className="mt-3 font-display text-5xl text-slate-900">Terms of Service</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <p>DineUp provides restaurant discovery and reservation tooling on a best-effort basis.</p>
          <p>Availability shown in Baymax and the booking flow may change as slots are confirmed.</p>
          <p>Users are responsible for accurate party size, time selection, and lawful use of the platform.</p>
        </div>
      </div>
    </main>
  );
}