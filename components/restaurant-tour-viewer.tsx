"use client";

import { SceneViewer } from "./virtual-tour/SceneViewer";
import type { RestaurantTour } from "@/lib/restaurants";

export function RestaurantTourViewer({ tour }: { tour: RestaurantTour | null | undefined }) {
  if (!tour?.nodes?.length) {
    return (
      <div className="rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center group transition-all duration-500 hover:border-accent/30 hover:bg-slate-50">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <span className="text-2xl">📸</span>
        </div>
        <h3 className="font-display text-lg text-slate-800 mb-2">3D Experience Pending</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          The 3D virtual tour for this restaurant is still being captured. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between px-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent/80 mb-2 drop-shadow-sm">Immersive Preview</p>
          <h2 className="font-display text-4xl text-slate-900 tracking-tight">{tour.headline}</h2>
        </div>
        <div className="text-right pb-1">
           <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
             Read-only Experience
           </span>
        </div>
      </div>
      
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-orange-200/20 rounded-[2.6rem] blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
          <SceneViewer tour={tour} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2">
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
            <span className="text-xl">🧭</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigation</p>
            <p className="text-xs font-semibold text-slate-700">Teleport via rings</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
            <span className="text-xl">🏠</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perspective</p>
            <p className="text-xs font-semibold text-slate-700">Dollhouse mode</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-500">
            <span className="text-xl">📍</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Context</p>
            <p className="text-xs font-semibold text-slate-700">Interactive markers</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 shadow-sm transition-transform hover:-translate-y-1">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
            <span className="text-xl">🎮</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Movement</p>
            <p className="text-xs font-semibold text-slate-700">Orbit controls</p>
          </div>
        </div>
      </div>
    </div>
  );
}

