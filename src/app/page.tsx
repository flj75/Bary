'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { MapView } from '@/components/map/MapView';
import { Marker } from 'react-map-gl/maplibre';
import { StationAutocomplete } from '@/components/station/StationAutocomplete';
import { ProfileStore } from '@/lib/profile/store';
import type { Station } from '@/types/station';
import { FORBIDDEN_NAME_CHARS } from '@/lib/validation';

// Trois participants fictifs — illustrent le produit, bien répartis sur Paris
const DEMO_DOTS = [
  { id: 'a', latitude: 48.8720, longitude: 2.3798 }, // Belleville (nord-est)
  { id: 'b', latitude: 48.8473, longitude: 2.2682 }, // Chardon Lagache (16e, sud-ouest)
  { id: 'c', latitude: 48.8873, longitude: 2.3207 }, // Batignolles (nord-ouest)
];

function OnboardingModal({ onSave, onSkip }: {
  onSave: (name: string, station: Station) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState('');
  const [station, setStation] = useState<Station | null>(null);
  const nameHasError = name.trim().length > 0 && FORBIDDEN_NAME_CHARS.test(name);
  const canSubmit = name.trim().length > 0 && !nameHasError && station !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onSkip} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm px-6 pt-6 pb-8 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900 mb-1">Et toi, tu pars d'où&nbsp;?</h3>
        <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
          Enregistre ton prénom et ta station pour être ajouté automatiquement à tes groupes.
        </p>
        <div className="space-y-3 mb-4">
          <div>
            <input
              autoFocus
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 placeholder:text-zinc-400 ${
                nameHasError
                  ? 'border-rose-300 focus:ring-rose-200'
                  : 'border-stone-200 focus:ring-brand-orange/30'
              }`}
              placeholder="Prénom"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {nameHasError && (
              <p className="text-xs text-rose-500 mt-1.5 leading-snug">
                Les caractères spéciaux (, | & = + # ? %) ne sont pas autorisés
              </p>
            )}
          </div>
          <StationAutocomplete value={station} onChange={setStation} />
        </div>
        <div className="flex flex-col gap-2">
          <button
            disabled={!canSubmit}
            onClick={() => { if (canSubmit && station) onSave(name.trim(), station); }}
            className="w-full rounded-xl bg-brand-orange text-white py-4 text-[15px] font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            C'est parti
          </button>
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-zinc-400 py-2 hover:text-zinc-600 transition-colors"
          >
            Continuer sans profil
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [invalidLink, setInvalidLink] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'invalid_link') {
      setInvalidLink(true);
      setTimeout(() => setInvalidLink(false), 3000);
    }
  }, []);

  function handleCtaClick() {
    if (ProfileStore.exists()) {
      router.push('/group');
    } else {
      setShowOnboarding(true);
    }
  }

  function handleOnboardingSave(name: string, station: Station) {
    try {
      ProfileStore.set({ name, station });
    } catch {
      // localStorage plein — on continue sans persistance (Edge case US-19)
      setStorageWarning(true);
      setTimeout(() => setStorageWarning(false), 3000);
    }
    router.push('/group');
  }

  function handleOnboardingSkip() {
    setShowOnboarding(false);
    router.push('/group');
  }

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
          <button
            onClick={handleCtaClick}
            className="block w-full text-center bg-brand-orange text-white font-semibold rounded-xl py-4 text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Créer un point de rencontre
          </button>
          <div className="flex justify-between mt-4 px-1">
            <span className="text-[11px] text-zinc-300">01 · Vos amis</span>
            <span className="text-[11px] text-zinc-300">02 · Le lieu</span>
            <span className="text-[11px] text-zinc-300">03 · Le point</span>
          </div>
        </div>
      </div>

      {/* Toast "Lien invalide" — US-18 Scénario 2 */}
      {invalidLink && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          Lien invalide
        </div>
      )}

      {/* Toast "Stockage plein" — US-19 Edge case */}
      {storageWarning && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          Stockage plein — session sans sauvegarde
        </div>
      )}

      {/* Modale onboarding — US-19 */}
      {showOnboarding && (
        <OnboardingModal
          onSave={handleOnboardingSave}
          onSkip={handleOnboardingSkip}
        />
      )}

    </div>
  );
}
