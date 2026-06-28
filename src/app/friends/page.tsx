'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Pencil } from 'lucide-react';
import { FriendStore, type Friend } from '@/lib/friends/store';
import { StationAutocomplete } from '@/components/station/StationAutocomplete';
import type { Station } from '@/types/station';

// ── Helpers ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

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
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColor(name)}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Modales ────────────────────────────────────────────────────────────

type FormModalProps = {
  initialName?: string;
  initialStation?: Station | null;
  title: string;
  onClose: () => void;
  onSave: (name: string, station: Station) => void;
};

function FriendFormModal({ initialName = '', initialStation = null, title, onClose, onSave }: FormModalProps) {
  const [name, setName] = useState(initialName);
  const [station, setStation] = useState<Station | null>(initialStation);
  const canSubmit = name.trim().length > 0 && station !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm px-6 pt-6 pb-8 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900 mb-5">{title}</h3>
        <div className="space-y-3 mb-6">
          <input
            autoFocus
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
            placeholder="Prénom"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <StationAutocomplete value={station} onChange={setStation} />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Annuler
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => { if (canSubmit && station) onSave(name.trim(), station); }}
            className="flex-1 rounded-xl bg-brand-orange text-white py-3.5 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

type DeleteModalProps = {
  friend: Friend;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteConfirmModal({ friend, onClose, onConfirm }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm px-6 pt-6 pb-8 shadow-xl">
        <h3 className="text-lg font-bold text-zinc-900 mb-2">Supprimer {friend.name} ?</h3>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {friend.name} sera retiré de votre carnet. Cette action est irréversible.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-500 text-white py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'add'; initialName?: string }
  | { type: 'edit'; friend: Friend }
  | { type: 'delete'; friend: Friend }
  | null;

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    setFriends(FriendStore.getAll());
  }, []);

  function refresh() {
    setFriends(FriendStore.getAll());
  }

  function handleAdd(name: string, station: Station) {
    FriendStore.add(name, station);
    refresh();
    setModal(null);
  }

  function handleEdit(id: string, name: string, station: Station) {
    FriendStore.update(id, { name, station });
    refresh();
    setModal(null);
  }

  function handleDelete(id: string) {
    FriendStore.remove(id);
    refresh();
    setModal(null);
  }

  const filtered = friends.filter(f =>
    normalize(f.name).includes(normalize(search))
  );

  const isEmpty = friends.length === 0;
  const noResults = !isEmpty && filtered.length === 0 && search.length > 0;

  return (
    <>
      <div className="min-h-screen bg-white pb-28">

        {/* Header */}
        <div className="px-5 pt-14 pb-4 flex items-center gap-3 border-b border-stone-100">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-zinc-600 hover:bg-stone-50 transition-colors text-xl font-light leading-none flex-shrink-0"
          >
            ‹
          </button>
          <h1 className="text-xl font-bold text-zinc-900">Mes amis</h1>
        </div>

        {/* Recherche */}
        {!isEmpty && (
          <div className="px-5 pt-4 pb-2">
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
            />
          </div>
        )}

        {/* État vide */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center px-8 pt-20 text-center">
            <p className="text-zinc-400 text-sm mb-1">Aucun ami enregistré.</p>
            <p className="text-zinc-400 text-xs mb-8 leading-relaxed">
              Ajoutez vos amis pour les retrouver rapidement lors de vos prochaines sessions.
            </p>
            <button
              onClick={() => setModal({ type: 'add' })}
              className="flex items-center gap-2 bg-brand-orange text-white font-semibold rounded-xl px-6 py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Plus size={15} />
              Ajouter un ami
            </button>
          </div>
        )}

        {/* Aucun résultat de recherche (US-15 scénario 2) */}
        {noResults && (
          <div className="flex flex-col items-center px-8 pt-10 text-center">
            <p className="text-zinc-400 text-sm mb-4">
              Aucun ami trouvé pour «&nbsp;{search}&nbsp;»
            </p>
            <button
              onClick={() => setModal({ type: 'add', initialName: search })}
              className="text-sm font-medium text-brand-orange hover:opacity-80 transition-opacity"
            >
              + Ajouter {search} comme ami
            </button>
          </div>
        )}

        {/* Liste des amis */}
        {!isEmpty && !noResults && (
          <ul className="px-4 pt-2">
            {filtered.map(f => (
              <li key={f.id}>
                <button
                  onClick={() => setModal({ type: 'edit', friend: f })}
                  className="w-full flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-stone-50 transition-colors text-left"
                >
                  <Avatar name={f.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{f.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{f.station.name}</p>
                  </div>
                  <Pencil size={14} className="text-zinc-300 flex-shrink-0" />
                </button>
                <div className="flex justify-end pr-2 -mt-1 pb-1">
                  <button
                    onClick={e => { e.stopPropagation(); setModal({ type: 'delete', friend: f }); }}
                    className="text-[11px] text-zinc-300 hover:text-rose-400 transition-colors flex items-center gap-1"
                  >
                    <X size={11} />
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bouton flottant "Ajouter un ami" (visible uniquement si des amis existent) */}
      {!isEmpty && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-20 px-4">
          <button
            onClick={() => setModal({ type: 'add' })}
            className="flex items-center gap-2 bg-brand-orange text-white font-semibold rounded-full px-6 py-3.5 text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Plus size={15} />
            Ajouter un ami
          </button>
        </div>
      )}

      {/* Modales */}
      {modal?.type === 'add' && (
        <FriendFormModal
          title="Ajouter un ami"
          initialName={modal.initialName}
          onClose={() => setModal(null)}
          onSave={handleAdd}
        />
      )}
      {modal?.type === 'edit' && (
        <FriendFormModal
          title="Modifier"
          initialName={modal.friend.name}
          initialStation={modal.friend.station}
          onClose={() => setModal(null)}
          onSave={(name, station) => handleEdit(modal.friend.id, name, station)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal
          friend={modal.friend}
          onClose={() => setModal(null)}
          onConfirm={() => handleDelete(modal.friend.id)}
        />
      )}
    </>
  );
}
