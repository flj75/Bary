import type { Station } from '@/types/station';

export type Friend = {
  id: string;
  name: string;
  station: Station;
  isMe?: boolean;
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
  try {
    localStorage.setItem(KEY, JSON.stringify(friends));
  } catch {
    throw new Error('storage_full');
  }
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
    // Garde-fou : l'entrée isMe n'est jamais supprimable
    write(read().filter(f => f.id !== id || f.isMe === true));
  },

  upsertMe: (name: string, station: Station): void => {
    const friends = read();
    if (friends.some(f => f.isMe)) {
      write(friends.map(f => f.isMe ? { ...f, name, station } : f));
    } else {
      write([{ id: crypto.randomUUID(), name, station, isMe: true }, ...friends]);
    }
  },
};
