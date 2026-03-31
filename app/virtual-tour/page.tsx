import Link from "next/link";

import { listPlatformRestaurants } from "@/lib/platform-db";

export default async function VirtualTourDirectoryPage() {
  const restaurants = await listPlatformRestaurants();
  const published = restaurants.filter((restaurant) => restaurant.tour?.nodes?.length);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="space-y-4">
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6B35]">
          View Only
        </span>
        <h1 className="font-display text-4xl leading-tight text-slate-900 sm:text-5xl">
          Published restaurant tours
        </h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
          Guests can preview restaurant spaces here, but editing stays restricted to the admin side.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {published.map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/restaurants/${restaurant.id}`}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-orange-200"
          >
            <p className="text-sm font-semibold text-slate-900">{restaurant.name}</p>
            <p className="mt-1 text-sm text-slate-500">{restaurant.neighborhood} · {restaurant.cuisine}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-orange-500">
              {restaurant.tour?.nodes?.length ?? 0} published scenes
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
