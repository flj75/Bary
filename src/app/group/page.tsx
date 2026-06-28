'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import { Marker, type MapRef } from 'react-map-gl/maplibre';
import { MapView } from '@/components/map/MapView';
import { StationAutocomplete } from '@/components/station/StationAutocomplete';
import { useSession } from '@/context/SessionContext';
import { FriendStore, type Friend } from '@/lib/friends/store';
import type { Participant } from '@/types/session';
import type { Station } from '@/types/station';

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
          <button onClick={onClose} className="flex-1 rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">
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
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapRef>(null);

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
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(label);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 1500);
  }

  useEffect(() => {
    return () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  }, []);

  const [friends, setFriends] = useState<Friend[]>([]);
  useEffect(() => { setFriends(FriendStore.getAll()); }, []);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const filteredFriends = friends.filter(f => {
    const q = search.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const n = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return n.includes(q) && !participants.some(p => p.station.id === f.station.id);
  });

  const searchMatchesParticipant = search.length > 0 && friends.some(f => {
    const q = search.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const n = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return n.includes(q) && participants.some(p => p.station.id === f.station.id);
  });

  const canContinue = participants.length >= 2;

  function handleAddPerson(name: string, station: Station, save: boolean) {
    if (save) {
      try {
        FriendStore.add(name, station);
      } catch {
        setToastMsg('Impossible de sauvegarder — stockage plein');
        setTimeout(() => setToastMsg(null), 2000);
      }
    }
    dispatch({ type: 'ADD_PARTICIPANT', payload: { id: crypto.randomUUID(), name, station } });
  }

  function handleAddFriend(f: Friend) {
    dispatch({ type: 'ADD_PARTICIPANT', payload: { id: crypto.randomUUID(), name: f.name, station: f.station } });
  }

  function handleRemove(id: string) {
    dispatch({ type: 'REMOVE_PARTICIPANT', payload: { id } });
  }

  return (
    <>
      <div className="relative h-screen overflow-hidden">

        {/* Carte plein écran avec dots orange des participants */}
        <MapView mapRef={mapRef} cssFilter="sepia(10%) brightness(1.02)">
          {participants.map((p: Participant) => (
            <Marker key={p.id} latitude={p.station.lat} longitude={p.station.lng} anchor="center">
              <div className="w-4 h-4 rounded-full bg-brand-orange ring-2 ring-white shadow-md" />
            </Marker>
          ))}
        </MapView>

        {/* Bouton retour ‹ — flottant sur la carte */}
        <div className="absolute top-0 left-0 z-30 px-5 pt-6 sm:px-8 sm:pt-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-zinc-600 hover:bg-stone-50 transition-colors text-xl font-light leading-none"
          >
            ‹
          </button>
        </div>

        {/* Card */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 sm:flex sm:justify-center sm:pb-8">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden sm:w-[22rem]">

            {/* 1. Header : ÉTAPE 01/03 + N AMIS */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-[0.2em] text-brand-orange">
                ÉTAPE 01 / 03
              </span>
              <span className="text-[11px] font-medium text-zinc-400">
                {participants.length} AMI{participants.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {/* 2. Titre */}
            <div className="px-5 pb-2">
              <h2 className="text-xl font-bold text-zinc-900">Qui se retrouve ?</h2>
            </div>

            {/* 3. Tabs */}
            <div className="px-5 pb-3 flex gap-1">
              {TABS.map(({ label, active }) => (
                <div key={label} className="relative">
                  <button
                    onClick={() => { if (!active) showTooltip(label); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active ? 'bg-amber-50 text-zinc-900' : 'text-zinc-400 opacity-40 cursor-pointer'
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

            {/* Zone scrollable : 4. participants → 7. carnet */}
            <div className="max-h-[38vh] overflow-y-auto">

              {/* 4. DANS LE GROUPE · N */}
              <div className="px-5 pb-3">
                <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-400 uppercase mb-2">
                  Dans le groupe · {participants.length}
                </p>
                {participants.map((p: Participant) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-stone-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{p.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{p.station.name}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(p.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-100 hover:bg-brand-orange hover:text-white text-stone-500 transition-colors flex-shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 5. Séparateur */}
              <div className="border-t border-stone-100 mx-5 mb-3" />

              {/* 6. Champ "Rechercher un ami..." */}
              <div className="px-5 pb-2">
                <input
                  type="text"
                  placeholder="Rechercher un ami..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
                />
                <Link href="/friends" className="text-[11px] text-zinc-400 hover:text-zinc-600 transition-colors text-right block pr-0.5 mt-1.5">
                  Gérer mes amis →
                </Link>
              </div>

              {/* 7. Liste du carnet filtrée */}
              <div className="px-5 pb-3">
                {friends.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    Carnet vide — ajoutez une personne ci-dessous.
                  </p>
                ) : filteredFriends.length === 0 && !search ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    Tous vos amis sont dans le groupe 🎉
                  </p>
                ) : filteredFriends.length === 0 && searchMatchesParticipant ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    «&nbsp;{search}&nbsp;» est déjà dans le groupe
                  </p>
                ) : filteredFriends.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-1">
                    Aucun résultat pour «&nbsp;{search}&nbsp;»
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {filteredFriends.map(f => (
                      <div key={f.id} className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-stone-50">
                        <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 text-sm font-semibold flex-shrink-0">
                          {f.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{f.name}</p>
                          <p className="text-xs text-zinc-400 truncate">{f.station.name}</p>
                        </div>
                        <button
                          onClick={() => handleAddFriend(f)}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-brand-orange hover:text-white text-stone-500 transition-colors flex-shrink-0"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 8. "+ Nouvelle personne" — fixe, toujours visible */}
            <div className="px-5 pt-1 pb-3">
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 text-sm text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors"
              >
                <Plus size={14} />
                Nouvelle personne
              </button>
            </div>

            {/* 9. CTA */}
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

      {/* Toast stockage plein (BUG-02) */}
      {toastMsg && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          {toastMsg}
        </div>
      )}
    </>
  );
}
