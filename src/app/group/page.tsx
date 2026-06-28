'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import { Marker, type MapRef } from 'react-map-gl/maplibre';
import { MapView } from '@/components/map/MapView';
import { StationAutocomplete } from '@/components/station/StationAutocomplete';
import { useSession } from '@/context/SessionContext';
import type { Participant } from '@/types/session';
import type { Station } from '@/types/station';

// ── Helpers ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(name)}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Modal nouvelle personne ────────────────────────────────────────────

type ModalProps = {
  onClose: () => void;
  onAdd: (name: string, station: Station, save: boolean) => void;
};

function NewPersonModal({ onClose, onAdd }: ModalProps) {
  const [name, setName] = useState('');
  const [station, setStation] = useState<Station | null>(null);
  const [save, setSave] = useState(true);
  const canSubmit = name.trim().length > 0 && station !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm px-6 pt-6 pb-8 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900 mb-5">Nouvelle personne</h3>
        <div className="space-y-3 mb-4">
          <input
            autoFocus
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
            placeholder="Prénom"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <StationAutocomplete value={station} onChange={setStation} />
        </div>

        {/* Toggle sauvegarder */}
        <label className="flex items-center gap-3 py-3 cursor-pointer select-none mb-5">
          <div
            role="switch"
            aria-checked={save}
            onClick={() => setSave(v => !v)}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${save ? 'bg-brand-orange' : 'bg-stone-200'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${save ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-zinc-600">Sauvegarder dans mes amis</span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => { if (canSubmit && station) { onAdd(name.trim(), station, save); onClose(); } }}
            className="flex-1 rounded-xl bg-brand-orange text-white py-3.5 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Rechercher', active: true },
  { label: 'Carte', active: false },
  { label: 'Lien', active: false },
];

export default function GroupPage() {
  const router = useRouter();
  const { state, dispatch } = useSession();
  const { participants } = state;
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  // TODO v2 : raffiner par participant id pour éviter la superposition de tooltips
  const [removeTooltip, setRemoveTooltip] = useState(false);
  const mapRef = useRef<MapRef>(null);

  // Zoom automatique pour englober tous les dots (US-05)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || participants.length < 2) return;
    const lngs = participants.map(p => p.station.lng);
    const lats = participants.map(p => p.station.lat);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 100, bottom: 420, left: 80, right: 80 }, duration: 700, maxZoom: 14 }
    );
  }, [participants]);

  function showTooltip(label: string) {
    setTooltip(label);
    setTimeout(() => setTooltip(null), 1500);
  }

  function showRemoveTooltip() {
    setRemoveTooltip(true);
    setTimeout(() => setRemoveTooltip(false), 1500);
  }

  // Carnet d'amis localStorage — vide jusqu'à l'implémentation de US-12/15
  const friends: { id: string; name: string; stationId: string; stationName: string }[] = [];

  const filteredFriends = friends.filter(f => {
    const q = search.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const n = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return n.includes(q) && !participants.some(p => p.id === f.id);
  });

  const canRemove = participants.length > 2;
  const canContinue = participants.length >= 2;

  function handleAddPerson(name: string, station: Station, _save: boolean) {
    // TODO US-12 : persister dans le carnet localStorage quand _save === true
    dispatch({ type: 'ADD_PARTICIPANT', payload: { id: crypto.randomUUID(), name, station } });
  }

  function handleRemove(id: string) {
    if (canRemove) dispatch({ type: 'REMOVE_PARTICIPANT', payload: { id } });
  }

  return (
    <>
      <div className="relative h-screen overflow-hidden">

        {/* Carte avec dots participants */}
        <MapView mapRef={mapRef} cssFilter="sepia(10%) brightness(1.02)">
          {participants.map((p: Participant) => (
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
            ÉTAPE 01 / 03
          </span>
          <span className="text-[11px] font-medium text-zinc-500 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {participants.length} AMI{participants.length !== 1 ? 'S' : ''}
          </span>
        </div>

        {/* Card */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 sm:flex sm:justify-center sm:pb-8">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden sm:w-[22rem]">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-xl font-bold text-zinc-900 mb-3">Qui se retrouve ?</h2>

              {/* Tabs */}
              <div className="flex gap-1 mb-4">
                {TABS.map(({ label, active }) => (
                  <div key={label} className="relative">
                    <button
                      onClick={() => { if (!active) showTooltip(label); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-amber-50 text-zinc-900'
                          : 'text-zinc-400 opacity-40 cursor-pointer'
                      }`}
                    >
                      {label}
                    </button>
                    {/* Tooltip "Disponible bientôt" — révélé au tap uniquement */}
                    {tooltip === label && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-zinc-800 text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap pointer-events-none z-30">
                        Disponible bientôt
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Contenu scrollable */}
              <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-0.5">

                {/* Dans le groupe */}
                {participants.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-400 uppercase mb-2">
                      Dans le groupe · {participants.length}
                    </p>
                    <div className="space-y-0.5">
                      {participants.map((p: Participant) => (
                        <div key={p.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-stone-50 transition-colors">
                          <Avatar name={p.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{p.name}</p>
                            <p className="text-xs text-zinc-400 truncate">{p.station.name}</p>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button
                              onClick={() => canRemove ? handleRemove(p.id) : showRemoveTooltip()}
                              disabled={!canRemove}
                              className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                                canRemove
                                  ? 'text-zinc-400 hover:bg-stone-200 hover:text-zinc-700'
                                  : 'text-stone-200 cursor-not-allowed'
                              }`}
                            >
                              <X size={13} />
                            </button>
                            {!canRemove && removeTooltip && (
                              <div className="absolute bottom-full right-0 mb-1.5 bg-zinc-800 text-white text-[11px] rounded-md px-2.5 py-1.5 whitespace-nowrap pointer-events-none z-30">
                                Minimum 2 personnes pour calculer un point de rencontre
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recherche carnet */}
                <input
                  type="text"
                  placeholder="Rechercher un ami..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
                />

                {/* Liste amis ou état vide */}
                {friends.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    Carnet vide — ajoutez une personne ci-dessous.
                  </p>
                ) : filteredFriends.length === 0 && search ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    Aucun résultat pour «&nbsp;{search}&nbsp;»
                  </p>
                ) : (
                  filteredFriends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-stone-50">
                      <Avatar name={f.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{f.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{f.stationName}</p>
                      </div>
                      <button className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-brand-orange hover:text-white text-stone-500 transition-colors flex-shrink-0">
                        <Plus size={14} />
                      </button>
                    </div>
                  ))
                )}

                {/* Nouvelle personne */}
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors"
                >
                  <Plus size={14} />
                  Nouvelle personne
                </button>

              </div>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5 pt-3 border-t border-stone-50">
              {canContinue ? (
                <Link
                  href="/settings"
                  className="block w-full text-center bg-brand-orange text-white font-semibold rounded-xl py-4 text-[15px] hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Continuer · {participants.length} amis
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full bg-brand-orange opacity-50 text-white font-semibold rounded-xl py-4 text-[15px] cursor-not-allowed"
                >
                  Continuer · ajoutez au moins 2 personnes
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {showModal && (
        <NewPersonModal onClose={() => setShowModal(false)} onAdd={handleAddPerson} />
      )}
    </>
  );
}
