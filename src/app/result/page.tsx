'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Marker, type MapRef } from 'react-map-gl/maplibre';
import { MapView } from '@/components/map/MapView';
import { useSession } from '@/context/SessionContext';
import { findMeetingPoint } from '@/lib/algorithm';
import type { Participant } from '@/types/session';
import type { Station } from '@/types/station';
import type { MeetingPointResult } from '@/lib/algorithm';

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

function buildShareUrl(result: MeetingPointResult, participants: Participant[]): string {
  const s = encodeURIComponent(result.optimal.station.id);
  // Les noms sont double-encodés pour `|` : encodeURIComponent encode `|` en `%7C`,
  // mais URLSearchParams.get décode %7C → `|` à la lecture, ce qui casserait le split.
  // On encode d'abord normalement, puis on remplace `%7C` par `%257C` (double-encodage)
  // afin que le destinataire retrouve `%7C` après le premier décodage automatique,
  // et le vrai nom après un second decodeURIComponent au moment du parsing.
  const encodeNameSafe = (name: string) =>
    encodeURIComponent(name).replace(/%7C/gi, '%257C');
  const g = participants
    .map(p => `${encodeNameSafe(p.name)}|${encodeURIComponent(p.station.id)}`)
    .join(',');
  return `${window.location.origin}/result?s=${s}&g=${g}`;
}

// ── Page ───────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const { state } = useSession();
  const { result, participants } = state;

  const [urlParticipants, setUrlParticipants] = useState<Participant[] | null>(null);
  const [urlResult, setUrlResult] = useState<MeetingPointResult | null>(null);
  // Initialisé à `true` quand il n'y a pas de session pour éviter un flash blanc
  // entre le premier rendu et le tick où l'effet lance le fetch.
  const [urlLoading, setUrlLoading] = useState(!result);
  const [invalidLink, setInvalidLink] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [fallbackUrl, setFallbackUrl] = useState('');
  const mapRef = useRef<MapRef>(null);
  const urlCheckDone = useRef(false);

  // US-18 : reconstruit le résultat depuis les query params quand pas de session
  useEffect(() => {
    if (result) return;
    if (urlCheckDone.current) return;
    urlCheckDone.current = true;

    const params = new URLSearchParams(window.location.search);
    const g = params.get('g');
    if (!g) {
      router.replace('/');
      return;
    }

    setUrlLoading(true);
    fetch('/data/stations.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((allStations: Station[]) => {
        const stationMap = new Map<string, Station>(allStations.map(st => [st.id, st]));

        // BUG-01 corrigé : séparateur | non ambigu avec les stationIds IDFM:xxx.
        // Les noms sont double-encodés dans buildShareUrl (voir commentaire là-bas) :
        // après le premier décodage automatique de URLSearchParams.get, le nom peut
        // encore contenir `%7C` (encodage résiduel d'un `|` dans le nom). Un second
        // decodeURIComponent est donc nécessaire sur la partie nom uniquement.
        const parsed: Participant[] = g.split(',').map((entry, i) => {
          const sepIdx = entry.indexOf('|');
          if (sepIdx === -1) throw new Error();
          // Double-décodage du nom pour récupérer les `|` éventuels dans le prénom
          const name = decodeURIComponent(decodeURIComponent(entry.slice(0, sepIdx)));
          const stationId = decodeURIComponent(entry.slice(sepIdx + 1));
          if (!name || !stationId) throw new Error();
          const station = stationMap.get(stationId);
          if (!station) throw new Error();
          return { id: `url-${i}`, name, station };
        });

        const computed = findMeetingPoint(parsed.map(p => p.station), allStations);
        if (!computed) throw new Error();

        setUrlParticipants(parsed);
        setUrlResult(computed);
        setUrlLoading(false);
      })
      .catch(() => {
        setUrlLoading(false);
        setInvalidLink(true);
        setTimeout(() => router.replace('/?error=invalid_link'), 2000);
      });
  }, [result, router]);

  const displayResult = result ?? urlResult;
  const displayParticipants: Participant[] = result ? participants : (urlParticipants ?? []);

  async function handleShare() {
    if (!displayResult || displayParticipants.length > 12) return;
    const url = buildShareUrl(displayResult, displayParticipants);
    try {
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
    } catch {
      setFallbackUrl(url);
      setShareState('fallback');
    }
  }

  if (invalidLink) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <p className="text-zinc-600 font-medium">Lien invalide</p>
      </div>
    );
  }

  if (urlLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="w-6 h-6 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!displayResult) return null;

  const { optimal, metrics } = displayResult;
  const { station } = optimal;

  const furthestNames = metrics.furthestParticipants
    .map(s => displayParticipants.find(p => p.station === s)?.name ?? s.name)
    .join(' & ');

  const shareDisabled = displayParticipants.length > 12;

  return (
    <div className="relative h-screen overflow-hidden">

      {/* Carte centrée sur la station résultat */}
      <MapView
        mapRef={mapRef}
        cssFilter="sepia(10%) brightness(1.02)"
        initialViewState={{ latitude: station.lat, longitude: station.lng, zoom: 12 }}
      >
        {/* Dots orange participants */}
        {displayParticipants.map(p => (
          <Marker key={p.id} latitude={p.station.lat} longitude={p.station.lng} anchor="center">
            <div className="w-4 h-4 rounded-full bg-brand-orange ring-2 ring-white shadow-md" />
          </Marker>
        ))}

        {/* Pin bleu résultat + cercles concentriques (évoque visuellement le barycentre) */}
        <Marker latitude={station.lat} longitude={station.lng} anchor="center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-28 h-28 rounded-full border border-brand-blue/10" />
            <div className="absolute w-16 h-16 rounded-full border border-brand-blue/20" />
            <div className="absolute w-8 h-8 rounded-full bg-brand-blue/10" />
            <div className="w-5 h-5 rounded-full bg-brand-blue ring-2 ring-white shadow-lg relative z-10" />
          </div>
        </Marker>
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
          ÉTAPE 03 / 03
        </span>
        <span className="text-[11px] font-medium text-zinc-500 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {displayParticipants.length} AMI{displayParticipants.length !== 1 ? 'S' : ''}
        </span>
      </div>

      {/* Card résultat */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-5 sm:flex sm:justify-center sm:pb-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden sm:w-[22rem]">

          {/* En-tête station */}
          <div className="px-5 pt-5 pb-3">
            <p className="text-[9px] font-bold tracking-[0.18em] text-zinc-400 uppercase mb-1.5">
              Rendez-vous à
            </p>
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h2 className="text-2xl font-bold text-brand-blue leading-tight">{station.name}</h2>
              <div className="flex flex-wrap gap-1 justify-end pt-0.5">
                {[...station.lines].sort((a, b) => {
                  const aNum = parseInt(a.name, 10);
                  const bNum = parseInt(b.name, 10);
                  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                  if (!isNaN(aNum)) return -1;
                  if (!isNaN(bNum)) return 1;
                  return a.name.localeCompare(b.name);
                }).map(l => (
                  <span
                    key={l.id}
                    className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md leading-none"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Le point le plus équitable pour {displayParticipants.length} ami{displayParticipants.length !== 1 ? 's' : ''} en Métro.
            </p>
          </div>

          {/* Métriques */}
          <div className="mx-5 mb-3 grid grid-cols-2 gap-2">
            <div className="bg-stone-50 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold tracking-[0.14em] text-zinc-400 uppercase mb-0.5">Trajet moyen</p>
              <p className="text-lg font-bold text-zinc-900">
                {metrics.avgTime}&thinsp;<span className="text-sm font-medium text-zinc-400">min</span>
              </p>
            </div>
            <div className="bg-stone-50 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-bold tracking-[0.14em] text-zinc-400 uppercase mb-0.5 truncate">
                Le plus loin · {furthestNames}
              </p>
              <p className="text-lg font-bold text-zinc-900">
                {metrics.maxTime}&thinsp;<span className="text-sm font-medium text-zinc-400">min</span>
              </p>
            </div>
          </div>

          {/* Liste participants */}
          <div className="px-5 max-h-[26vh] overflow-y-auto space-y-2.5 pb-3">
            {displayParticipants.map(p => {
              const time = optimal.times.get(p.station) ?? 0;
              const pct = metrics.progressBars.get(p.station) ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{p.name}</p>
                      <p className="text-xs text-zinc-400 ml-2 flex-shrink-0">{time}&thinsp;min</p>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-orange rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fallback URL presse-papier refusé (US-10 scénario 3) */}
          {shareState === 'fallback' && (
            <div className="mx-5 mb-3">
              <input
                readOnly
                value={fallbackUrl}
                onClick={e => (e.target as HTMLInputElement).select()}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs text-zinc-600 bg-stone-50 focus:outline-none"
              />
            </div>
          )}

          {/* CTAs */}
          <div className="px-5 pb-5 pt-3 border-t border-stone-50">
            <div className="flex gap-3">
              <Link
                href="/group"
                className="flex-1 text-center rounded-xl border border-stone-200 py-3.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Modifier
              </Link>
              <div className="flex-1">
                <button
                  onClick={handleShare}
                  disabled={shareDisabled}
                  className="w-full bg-brand-orange text-white font-semibold rounded-xl py-3.5 text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  Partager
                </button>
                {shareDisabled && (
                  <p className="text-[10px] text-zinc-400 text-center mt-1.5 leading-snug px-1">
                    Le lien de partage est disponible pour les groupes de 12 personnes maximum.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Toast "Lien copié !" */}
      {shareState === 'copied' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          Lien copié !
        </div>
      )}

    </div>
  );
}
