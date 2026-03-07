import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — DineUp",
  description: "How DineUp handles location, authentication, and reservation data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Legal</p>
        <h1 className="mt-3 font-display text-5xl text-slate-900">Privacy Policy</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
          <p>DineUp stores account information needed for sign-in, reservation history, and basic service support.</p>
          <p>Location is used only to improve nearby restaurant sorting and map relevance. If permission is denied, DineUp falls back to central Pune.</p>
          <p>Reservation records are stored to show your dashboard history and support booking operations.</p>
        </div>
      </div>
    </main>
  );
}