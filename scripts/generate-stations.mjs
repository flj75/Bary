/**
 * Génère public/data/stations.json à partir des APIs IDFM open data.
 *
 * Sources :
 *   - arrets-lignes        : stops Metro/RER/Tram avec leurs lignes
 *   - referentiel-des-lignes : couleurs et détails des lignes
 *
 * Usage : node scripts/generate-stations.mjs > public/data/stations.json
 */

const API_BASE = 'https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets';
const LIMIT = 100;

// Modes à inclure (valeurs exactes du champ "mode" dans arrets-lignes)
const STOP_MODES = ['Metro', 'RapidTransit', 'Tramway'];

// Mapping mode IDFM → mode spec Bary
const MODE_MAP = {
  Metro: 'metro',
  RapidTransit: 'rer',
  Tramway: 'tram',
};

async function fetchAll(dataset, where) {
  const results = [];
  let offset = 0;
  let total = null;

  while (true) {
    const params = new URLSearchParams({ limit: LIMIT, offset });
    if (where) params.set('where', where);

    const url = `${API_BASE}/${dataset}/records?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${dataset} (offset=${offset})`);

    const data = await res.json();
    total ??= data.total_count;
    results.push(...data.results);

    process.stderr.write(`\r  ${dataset}: ${results.length}/${total}   `);

    if (results.length >= total || data.results.length === 0) break;
    offset += LIMIT;
  }

  process.stderr.write('\n');
  return results;
}

async function main() {
  // ── 1. Stops Metro/RER/Tram ──────────────────────────────────────────────
  process.stderr.write('Fetching stops (Metro + RapidTransit + Tramway)...\n');
  const where = STOP_MODES.map((m) => `mode="${m}"`).join(' or ');
  const stopRecords = await fetchAll('arrets-lignes', where);

  // ── 2. Lignes (toutes, pour filtrer côté client) ─────────────────────────
  process.stderr.write('Fetching line details...\n');
  const lineRecords = await fetchAll('referentiel-des-lignes', null);

  // ── 3. Construire le lookup des lignes ───────────────────────────────────
  // referentiel-des-lignes a id_line = "C01374" ; arrets-lignes a id = "IDFM:C01374"
  const lineMap = new Map();
  for (const line of lineRecords) {
    const idfmId = `IDFM:${line.id_line}`;
    const rawMode = (line.transportmode ?? '').toLowerCase();
    // referentiel-des-lignes utilise "metro", "tram", "rail" (pas "tramway"/"rapidtransit")
    const mode = rawMode === 'metro' ? 'metro' : rawMode === 'rail' ? 'rer' : rawMode === 'tram' ? 'tram' : null;
    if (!mode) continue; // ignorer bus, localTrain, etc.

    const hexColor = line.colourweb_hexa ? `#${line.colourweb_hexa.replace(/^#/, '')}` : '#888888';
    lineMap.set(idfmId, {
      id: idfmId,
      name: line.shortname_line || line.id_line,
      mode,
      color: hexColor,
    });
  }

  // ── 4. Grouper les stops par station ─────────────────────────────────────
  // Clé : nom + coordonnées arrondies à 2 décimales (~1 km) pour séparer
  // les stations homonymes dans des communes différentes.
  const stationMap = new Map();

  for (const record of stopRecords) {
    const lat = parseFloat(record.stop_lat);
    const lng = parseFloat(record.stop_lon);
    if (!record.stop_name || isNaN(lat) || isNaN(lng)) continue;

    const key = `${record.stop_name}|${Math.round(lat * 100)}|${Math.round(lng * 100)}`;

    if (!stationMap.has(key)) {
      stationMap.set(key, {
        id: record.stop_id,        // premier stop_id rencontré = ID canonique
        name: record.stop_name,
        lat,
        lng,
        linesById: new Map(),
      });
    }

    const station = stationMap.get(key);
    const lineId = record.id; // champ "id" dans arrets-lignes = ID de ligne
    const lineDetail = lineMap.get(lineId);
    if (lineDetail && !station.linesById.has(lineId)) {
      station.linesById.set(lineId, lineDetail);
    }
  }

  // ── 5. Construire le tableau final Station[] ─────────────────────────────
  const stations = [];
  for (const s of stationMap.values()) {
    const lines = [...s.linesById.values()];
    if (lines.length === 0) continue;

    // Trier les lignes : chiffres croissants d'abord, puis lettres (spec 03)
    lines.sort((a, b) => {
      const aNum = parseInt(a.name, 10);
      const bNum = parseInt(b.name, 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;
      return a.name.localeCompare(b.name);
    });

    stations.push({
      id: s.id,
      name: s.name,
      lat: Math.round(s.lat * 1e6) / 1e6,
      lng: Math.round(s.lng * 1e6) / 1e6,
      lines,
    });
  }

  // Trier les stations par nom (ordre alphabétique français)
  stations.sort((a, b) => a.name.localeCompare(b.name, 'fr', { ignorePunctuation: true }));

  process.stderr.write(`\nGénéré ${stations.length} stations\n`);

  // ── 6. Vérification rapide sur quelques hubs connus ──────────────────────
  const checks = ['Châtelet', 'Gare du Nord', 'Bastille', 'Nation', 'Opéra'];
  for (const name of checks) {
    const found = stations.filter((s) => s.name === name);
    process.stderr.write(`  "${name}" : ${found.length} station(s), lignes : ${found.map((s) => s.lines.map((l) => l.name).join('+')).join(' / ')}\n`);
    if (found.length > 0) {
      process.stderr.write(`    → id: ${found[0].id}\n`);
    }
  }

  console.log(JSON.stringify(stations, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
