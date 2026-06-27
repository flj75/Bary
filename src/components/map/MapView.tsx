'use client';

import { useState } from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const PARIS_CENTER = { latitude: 48.8566, longitude: 2.3522, zoom: 11 };

// CartoDB Positron : style épuré monochrome gris, sans clé API
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

type MapViewProps = {
  children?: React.ReactNode;
  initialViewState?: Partial<typeof PARIS_CENTER>;
  cssFilter?: string;
};

export function MapView({ children, initialViewState, cssFilter }: MapViewProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0">
      {/* Skeleton affiché jusqu'au premier événement 'load' de MapLibre */}
      <div
        className={`absolute inset-0 bg-zinc-100 z-10 flex items-center justify-center transition-opacity duration-200 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
      </div>

      <div className="absolute inset-0" style={cssFilter ? { filter: cssFilter } : undefined}>
        <Map
          initialViewState={{ ...PARIS_CENTER, ...initialViewState }}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
          onLoad={() => setLoaded(true)}
          attributionControl={false}
        >
          {children}
        </Map>
      </div>
    </div>
  );
}
