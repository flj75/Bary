'use client';

import { useState, useEffect, useRef } from 'react';
import type { Station } from '@/types/station';

function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

type Props = {
  value: Station | null;
  onChange: (station: Station) => void;
  placeholder?: string;
};

export function StationAutocomplete({ value, onChange, placeholder = 'Station de départ...' }: Props) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [stations, setStations] = useState<Station[]>([]);
  const [results, setResults] = useState<Station[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/data/stations.json')
      .then(r => r.json())
      .then((data: Station[]) => setStations(data));
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    const q = normalize(query);
    const filtered = stations.filter(s => normalize(s.name).startsWith(q))
      .concat(stations.filter(s => !normalize(s.name).startsWith(q) && normalize(s.name).includes(q)))
      .slice(0, 8);
    setResults(filtered);
    setOpen(filtered.length > 0);
  }, [query, stations]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 placeholder:text-zinc-400"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); }}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-stone-100 shadow-lg z-50 max-h-48 overflow-y-auto">
          {results.map(s => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 flex items-center justify-between gap-2"
                onMouseDown={() => { onChange(s); setQuery(s.name); setOpen(false); }}
              >
                <span className="text-zinc-900 truncate">{s.name}</span>
                <span className="text-[11px] text-zinc-400 flex-shrink-0">
                  {s.lines.map(l => l.name).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
