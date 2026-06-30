import type { Station } from '@/types/station';
import { FriendStore } from '@/lib/friends/store';

export type UserProfile = {
  name: string;
  station: Station;
};

const KEY = 'bary_profile';

export const ProfileStore = {
  get: (): UserProfile | null => {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch { return null; }
  },

  exists: (): boolean => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(KEY) !== null; } catch { return false; }
  },

  // Écrit le profil ET synchronise l'entrée isMe du carnet de façon atomique
  set: (profile: UserProfile): void => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
      FriendStore.upsertMe(profile.name, profile.station);
    } catch {
      throw new Error('storage_full');
    }
  },
};
