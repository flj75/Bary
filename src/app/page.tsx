'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { MapView } from '@/components/map/MapView';
import { Marker } from 'react-map-gl/maplibre';

// Trois participants fictifs — illustrent le produit, bien répartis sur Paris
const DEMO_DOTS = [
  { id: 'a', latitude: 48.8720, longitude: 2.3798 }, // Belleville (nord-est)
  { id: 'b', latitude: 48.8473, longitude: 2.2682 }, // Chardon Lagache (16e, sud-ouest)
  { id: 'c', latitude: 48.8873, longitude: 2.3207 }, // Batignolles (nord-ouest)
];

export default function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden">

      <MapView cssFilter="sepia(10%) brightness(1.02)">
        {DEMO_DOTS.map((dot) => (
          <Marker key={dot.id} latitude={dot.latitude} longitude={dot.longitude} anchor="center">
            <div className="w-4 h-4 rounded-full bg-brand-orange ring-2 ring-white shadow-md" />
          </Marker>
        ))}
      </MapView>

      {/* Header — logo */}
      <div className="absolute top-0 left-0 right-0 z-20 px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-orange flex-shrink-0" strokeWidth={1.5} />
          <span className="text-4xl font-bold tracking-tight leading-none text-zinc-900">Bary</span>
          <span className="text-[9px] font-medium tracking-[0.18em] text-zinc-400 border border-zinc-200 bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded ml-0.5">
            PARIS
          </span>
        </div>
      </div>

      {/* Card en bas */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-8 sm:flex sm:justify-center sm:pb-12">
        <div className="bg-white rounded-2xl shadow-md px-6 py-7 sm:w-[22rem]">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-brand-orange uppercase mb-3">
            Point de rencontre · Métro
          </p>
          <h1 className="text-[1.75rem] font-bold text-zinc-900 leading-snug mb-3">
            Le point de rdv, calculé pour tout le groupe.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            Bary trouve la station qui minimise le trajet de chacun. Fini les débats sans fin sur le lieu.
          </p>
          <Link
            href="/group"
            className="block w-full text-center bg-brand-orange text-white font-semibold rounded-xl py-4 text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Créer un point de rencontre
          </Link>
          <div className="flex justify-between mt-4 px-1">
            <span className="text-[11px] text-zinc-300">01 · Vos amis</span>
            <span className="text-[11px] text-zinc-300">02 · Le lieu</span>
            <span className="text-[11px] text-zinc-300">03 · Le point</span>
          </div>
        </div>
      </div>

    </div>
  );
}
