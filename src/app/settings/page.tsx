'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Marker, type MapRef } from 'react-map-gl/maplibre';
import { MapView } from '@/components/map/MapView';
import { useSession } from '@/context/SessionContext';
import { findMeetingPoint } from '@/lib/algorithm';
import type { Station } from '@/types/station';

const TRANSPORT_OPTIONS = [
  { label: 'Métro / RER / Tram', value: 'metro' as const, available: true },
  { label: 'À pied', value: 'walking', available: false },
  { label: 'Vélo', value: 'bike', available: false },
  { label: 'Voiture', value: 'car', available: false },
];

export default function SettingsPage() {
  const router = useRouter();
  const { state, dispatch } = useSession();
  const { participants, transportMode } = state;
  const [calculating, setCalculating] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const mapRef = useRef<MapRef>(null);

  // Zoom automatique pour englober tous les dots
  useEffect(() => {
    const map = mapRef.current;
    if (!map || participants.length < 2) return;
    const lngs = participants.map(p => p.station.lng);
    const lats = participants.map(p => p.station.lat);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 100, bottom: 320, left: 80, right: 80 }, duration: 700, maxZoom: 14 }
    );
  }, [participants]);

  function showTooltip(label: string) {
    setTooltip(label);
    setTimeout(() => setTooltip(null), 1500);
  }

  async function handleCalculate() {
    if (calculating) return;
    setCalculating(true);

    const res = await fetch('/data/stations.json');
    const allStations: Station[] = await res.json();

    const result = findMeetingPoint(participants.map(p => p.station), allStations);

    if (result) {
      dispatch({ type: 'SET_RESULT', payload: result });

      // Zoom animé vers le barycentre géographique (anticipation visuelle — spec 03)
      const avgLat = participants.reduce((s, p) => s + p.station.lat, 0) / participants.length;
      const avgLng = participants.reduce((s, p) => s + p.station.lng, 0) / participants.length;
      mapRef.current?.flyTo({ center: [avgLng, avgLat], zoom: 13, duration: 1000 });
    }

    // Délai artificiel 1 200 ms — construit la perception de précision (spec 03)
    setTimeout(() => router.push('/result'), 1200);
  }

  return (
    <div className="relative h-screen overflow-hidden">

      {/* Carte avec dots participants */}
      <MapView mapRef={mapRef} cssFilter="sepia(10%) brightness(1.02)">
        {participants.map(p => (
          <Marker key={p.id} latitude={p.station.lat} longitude={p.station.lng} anchor="center">
            <div className="w-4 h-4 rounded-full bg-brand-orange ring-2 ring-white shadow-md" />
          </Marker>
        ))}
      </MapView>

      {/* Barre de progression */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 pt-6 sm:px-8 sm:pt-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-zinc-600 hover:bg-stone-50 transition-colors text-xl font-light leading-none"
        >
          ‹
        </button>
        <span className="text-[11px] font-bold tracking-[0.2em] text-brand-orange bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
          ÉTAPE 02 / 03
        </span>
        <span className="text-[11px] font-medium text-zinc-500 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {participants.length} AMI{participants.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Card */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 sm:flex sm:justify-center sm:pb-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden sm:w-[22rem]">
          <div className="px-5 pt-5 pb-4">
            <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-400 uppercase mb-2">
              Métro par défaut
            </p>
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Comment vous déplacez-vous ?</h2>

            {/* Pills transport */}
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_OPTIONS.map(({ label, value, available }) => (
                <div key={value} className="relative">
                  <button
                    onClick={() => !available && showTooltip(label)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                      available && transportMode === value
                        ? 'bg-amber-50 text-zinc-900 ring-1 ring-amber-200'
                        : available
                        ? 'bg-stone-50 text-zinc-600 hover:bg-stone-100'
                        : 'bg-stone-50 text-zinc-400 opacity-50 cursor-default'
                    }`}
                  >
                    {label}
                  </button>
                  {tooltip === label && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-zinc-800 text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap pointer-events-none z-30">
                      Disponible bientôt
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="px-5 pb-5 pt-3 border-t border-stone-50">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full bg-brand-orange text-white font-semibold rounded-xl py-4 text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2.5"
            >
              {calculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Calcul en cours…
                </>
              ) : (
                'Calculer le point →'
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
