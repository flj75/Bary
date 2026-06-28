import type { Station } from '@/types/station';

export type Friend = {
  id: string;
  name: string;
  station: Station;
};

const KEY = 'bary_friends';

function read(): Friend[] {
  try {
    if (typeof window === 'undefined') return [];
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

function write(friends: Friend[]): void {
  localStorage.setItem(KEY, JSON.stringify(friends));
}

export const FriendStore = {
  getAll: (): Friend[] => read(),

  add: (name: string, station: Station): Friend => {
    const friend: Friend = { id: crypto.randomUUID(), name, station };
    write([...read(), friend]);
    return friend;
  },

  update: (id: string, updates: { name?: string; station?: Station }): void => {
    write(read().map(f => (f.id === id ? { ...f, ...updates } : f)));
  },

  remove: (id: string): void => {
    write(read().filter(f => f.id !== id));
  },
};
