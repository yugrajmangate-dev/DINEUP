import Link from "next/link";
import { notFound } from "next/navigation";

import { RestaurantTourViewer } from "@/components/restaurant-tour-viewer";
import { getPlatformRestaurantById } from "@/lib/platform-db";

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await getPlatformRestaurantById(id);

  if (!restaurant) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B35]">
            {restaurant.neighborhood}
          </span>
          <h1 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">{restaurant.name}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">{restaurant.description}</p>
          <div className="flex flex-wrap gap-2">
            {restaurant.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/#explore-section" className="rounded-full bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white">
              Back to booking feed
            </Link>
            <a href={restaurant.website} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              Visit restaurant site
            </a>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Booking intelligence</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Available tables</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Guests can choose a live table from the booking modal on the main DineUp feed.</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Shared data source</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">This restaurant data now comes from the same platform store used by the admin side.</p>
            </div>
          </div>
        </div>
      </section>

      <RestaurantTourViewer tour={restaurant.tour} />
    </main>
  );
}
