import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — DineUp",
  description: "Contact DineUp for support, partnerships, and press enquiries.",
};

const contactItems = [
  ["Support", "dineupservices@gmail.com"],
  ["Partnerships", "dineupservices@gmail.com"],
  ["Press", "dineupservices@gmail.com"],
];

export default function ContactPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-4xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">Support</p>
        <h1 className="mt-3 font-display text-5xl text-slate-900">Contact Us</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {contactItems.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="font-semibold text-slate-900">{label}</h2>
              <a href={`mailto:${value}`} className="mt-2 block text-sm text-orange-600 hover:text-orange-700">
                {value}
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
