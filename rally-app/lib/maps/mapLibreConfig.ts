import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * MapLibre tile provider configuration with manual fallback.
 *
 * MapLibre style spec supports multiple tile URLs as **load balancing**,
 * not failover. When a provider goes down we have to swap the entire style
 * URL ourselves and re-mount the map.
 *
 * Strategy:
 *   1. On app boot: HEAD the active provider's style URL with a 2s timeout.
 *   2. On 3 timeouts/5xx within a 5-min window: persist failover preference
 *      and switch the active session immediately.
 *   3. Never auto-switch back to primary (avoids flapping). User restart
 *      triggers a fresh health check.
 *
 * See skills/run-tracking/SKILL.md §Tile provider — manual fallback.
 */

export type TileProviderId = 'openfreemap' | 'versatiles'

export type TileProviderConfig = {
  id: TileProviderId
  label: string
  styleUrl: string
  /** Shown to users via MapAttribution; ODbL requires crediting OSM. */
  attribution: string
  requiresApiKey: boolean
}

// Both providers are free, key-less, and OpenStreetMap-derived. We deliberately
// avoid keyed/paid tile services (e.g. Stadia, Mapbox) and community/donated
// servers misused for app traffic (e.g. OSM-France) — see MAP_STYLES below.
export const PROVIDERS: Record<TileProviderId, TileProviderConfig> = {
  openfreemap: {
    id: 'openfreemap',
    label: 'OpenFreeMap',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: '© OpenStreetMap contributors, OpenFreeMap',
    requiresApiKey: false,
  },
  versatiles: {
    id: 'versatiles',
    label: 'VersaTiles',
    styleUrl: 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
    attribution: '© OpenStreetMap contributors, VersaTiles',
    requiresApiKey: false,
  },
}

/**
 * User-selectable map styles. Mix of vector (OpenFreeMap) and raster (OSM
 * standard, HOT humanitarian) sources. Raster styles are built inline so
 * MapLibre can mount them via the same `mapStyle` prop — the prop accepts
 * either a style URL or a JSON-stringified style spec.
 *
 * Persisted independently of the failover-aware `activeProvider` so the
 * user's preference survives boot health-check failures.
 */
export type MapStyleId = 'standard' | 'bright' | 'clean' | 'dark' | 'satellite'

function cleanLightStyle(): string {
  return JSON.stringify({
    version: 8,
    name: 'Rally Clean Light',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#eef2ef' } },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#cbd6da' },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        minzoom: 10,
        paint: { 'line-color': '#cbd6da', 'line-width': 1.2, 'line-opacity': 0.86 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': '#e4ebe5', 'fill-opacity': 0.72 },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 9,
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': '#e4ebe5', 'fill-opacity': 0.55 },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': '#dfe3df',
          'fill-opacity': 0.46,
          'fill-outline-color': '#cfd5cf',
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fafbf7',
          'line-opacity': 0.88,
          'line-width': ['interpolate', ['exponential', 1.45], ['zoom'], 12, 0.8, 17, 3.6, 22, 18],
        },
      },
      {
        id: 'walkway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: [
          'all',
          ['match', ['get', 'class'], ['path', 'pedestrian'], true, false],
          ['!', ['match', ['get', 'subclass'], ['cycleway'], true, false]],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#aebdb8',
          'line-opacity': 0.72,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 13, 0.5, 17, 1.4, 22, 6],
          'line-dasharray': [1.1, 1.25],
        },
      },
      {
        id: 'cycleway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: [
          'any',
          ['==', ['get', 'class'], 'cycleway'],
          ['match', ['get', 'subclass'], ['cycleway'], true, false],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#a4bd62',
          'line-opacity': 0.64,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 13, 0.6, 17, 1.8, 22, 7],
          'line-dasharray': [2.4, 1.2],
        },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fbfbf6',
          'line-opacity': 0.96,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 8, 1.2, 15, 4.2, 22, 24],
        },
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 6,
        filter: ['==', ['get', 'class'], 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#eee6d1',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 6, 1.2, 15, 4.8, 22, 28],
        },
      },
    ],
  })
}

/**
 * Dark counterpart of cleanLightStyle. Built because OpenFreeMap's hosted
 * `styles/dark` keeps loud highway colors (yellow dashes, red trunk casings)
 * that fight the lime route/progress overlays on the run screen. Everything
 * here is a muted near-black/gray so Rally's overlays are the only saturated
 * elements on screen.
 */
function cleanDarkStyle(): string {
  return JSON.stringify({
    version: 8,
    name: 'Rally Clean Dark',
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#111412' } },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': '#1a2126' },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        minzoom: 10,
        paint: { 'line-color': '#1a2126', 'line-width': 1.2, 'line-opacity': 0.9 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': '#17201a', 'fill-opacity': 0.85 },
      },
      {
        id: 'landcover-wood',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        minzoom: 9,
        filter: ['==', ['get', 'class'], 'wood'],
        paint: { 'fill-color': '#17201a', 'fill-opacity': 0.6 },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-color': '#1b1e1c',
          'fill-opacity': 0.7,
          'fill-outline-color': '#232624',
        },
      },
      {
        id: 'road-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 12,
        filter: ['match', ['get', 'class'], ['minor', 'service', 'track'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#262a27',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['exponential', 1.45], ['zoom'], 12, 0.8, 17, 3.6, 22, 18],
        },
      },
      {
        id: 'walkway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: [
          'all',
          ['match', ['get', 'class'], ['path', 'pedestrian'], true, false],
          ['!', ['match', ['get', 'subclass'], ['cycleway'], true, false]],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2e332f',
          'line-opacity': 0.7,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 13, 0.5, 17, 1.4, 22, 6],
          'line-dasharray': [1.1, 1.25],
        },
      },
      {
        id: 'cycleway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 13,
        filter: [
          'any',
          ['==', ['get', 'class'], 'cycleway'],
          ['match', ['get', 'subclass'], ['cycleway'], true, false],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#31392c',
          'line-opacity': 0.6,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 13, 0.6, 17, 1.8, 22, 7],
          'line-dasharray': [2.4, 1.2],
        },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 8,
        filter: ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#333835',
          'line-opacity': 0.95,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 8, 1.2, 15, 4.2, 22, 24],
        },
      },
      {
        id: 'road-motorway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        minzoom: 6,
        filter: ['==', ['get', 'class'], 'motorway'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#3c3f38',
          'line-opacity': 0.9,
          'line-width': ['interpolate', ['exponential', 1.35], ['zoom'], 6, 1.2, 15, 4.8, 22, 28],
        },
      },
    ],
  })
}

/**
 * 3D replay style — used only by the Run Replay flyover (not user-selectable
 * in the style picker). Self-contained OpenMapTiles vector style tuned for a
 * pitched camera flying along a run:
 *
 *  - `fill-extrusion` buildings (height from `render_height`, small ones hidden
 *    via `hide_3d`) shaded by height so towers read with depth.
 *  - Runnable roads only: `motorway` (ทางด่วน) and `ferry` (เส้นเรือ) are
 *    excluded everywhere; road bridges (`brunnel=bridge`) are kept because they
 *    are runnable and drawn over the ground/water with a casing.
 *  - Water split by class + intermittent waterways dashed.
 *  - Deeper, clearer greens for parks / natural landcover.
 *  - No place/POI labels; replay keeps attention on the route and 3D scene.
 *
 * Building heights come from the tiles, NOT GPS altitude. Buildings only exist
 * at zoom >= 14, so the replay camera must stay zoomed in (~17.5) to see them.
 */
const OFM_TILES = 'https://tiles.openfreemap.org'

function replay3dStyle(): string {
  return JSON.stringify({
    version: 8,
    name: 'Rally 3D Replay',
    glyphs: `${OFM_TILES}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      openmaptiles: { type: 'vector', url: `${OFM_TILES}/planet` },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#eef2ec' } },

      // Water split by class; intermittent waterways dashed (separate layer —
      // line-dasharray does not accept data expressions).
      {
        id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water',
        paint: {
          'fill-color': ['match', ['get', 'class'],
            'river', '#a9c7d6', 'lake', '#b3d0dd', 'ocean', '#a4c3d2', '#b8d2dd'],
        },
      },
      {
        id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 11,
        filter: ['!=', ['get', 'intermittent'], 1],
        paint: { 'line-color': '#a9c7d6', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 17, 4] },
      },
      {
        id: 'waterway-intermittent', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 11,
        filter: ['==', ['get', 'intermittent'], 1],
        paint: {
          'line-color': '#a9c7d6', 'line-dasharray': [2, 2],
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 17, 4],
        },
      },

      // Greenery — deeper, clearer greens than the flat 2D styles use.
      {
        id: 'landcover', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', minzoom: 8,
        paint: {
          'fill-color': ['match', ['get', 'class'],
            'wood', '#8fbf76', 'grass', '#acd589', 'scrub', '#9ecd80', 'wetland', '#9ecab0', '#acd589'],
          'fill-opacity': 0.85,
        },
      },
      {
        id: 'landuse', type: 'fill', source: 'openmaptiles', 'source-layer': 'landuse', minzoom: 10,
        paint: {
          'fill-color': ['match', ['get', 'class'],
            'residential', '#eceae4', 'commercial', '#f0e9e6', 'industrial', '#e8e6e6',
            'cemetery', '#a7cf88', 'stadium', '#9ccb7c', 'pitch', '#8fc96e', 'school', '#efeadd', '#eceae4'],
          'fill-opacity': ['match', ['get', 'class'], ['cemetery', 'stadium', 'pitch'], 0.85, 0.6],
        },
      },
      {
        id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park',
        paint: { 'fill-color': '#8fc96e', 'fill-opacity': 0.8 },
      },

      // Runnable roads only. Exclude motorway (ทางด่วน) + ferry (เส้นเรือ)
      // everywhere; draw order tunnel -> ground -> bridge.
      {
        id: 'road-tunnel', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: ['all', ['==', ['get', 'brunnel'], 'tunnel'],
          ['!=', ['get', 'class'], 'motorway'], ['!=', ['get', 'class'], 'ferry']],
        layout: { 'line-cap': 'butt' },
        paint: {
          'line-color': '#e6e3dc', 'line-dasharray': [2, 2],
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 1, 17, 5, 22, 22],
        },
      },
      {
        id: 'road-ground', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 8,
        filter: ['all', ['!=', ['get', 'brunnel'], 'bridge'], ['!=', ['get', 'brunnel'], 'tunnel'],
          ['!=', ['get', 'class'], 'motorway'], ['!=', ['get', 'class'], 'ferry']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['match', ['get', 'class'],
            'trunk', '#f7e6c4', ['primary', 'secondary', 'tertiary'], '#ffffff', '#f7f8f3'],
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'],
            8, ['match', ['get', 'class'], 'trunk', 1.4, 0.6],
            15, ['match', ['get', 'class'], 'trunk', 5, ['primary', 'secondary'], 4, 2.4],
            22, 26],
        },
      },
      {
        id: 'road-bridge-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: ['all', ['==', ['get', 'brunnel'], 'bridge'],
          ['!=', ['get', 'class'], 'motorway'], ['!=', ['get', 'class'], 'ferry']],
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: {
          'line-color': '#c8c9c0',
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 3, 17, 9, 22, 30],
        },
      },
      {
        id: 'road-bridge', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 12,
        filter: ['all', ['==', ['get', 'brunnel'], 'bridge'],
          ['!=', ['get', 'class'], 'motorway'], ['!=', ['get', 'class'], 'ferry']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['match', ['get', 'class'], 'trunk', '#f7e6c4', '#ffffff'],
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 12, 1.6, 17, 5.5, 22, 24],
        },
      },

      // 3D buildings. Skip parts flagged hide_3d; use OSM colour when present,
      // otherwise shade by height so towers read with depth.
      {
        id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': ['coalesce', ['get', 'colour'],
            ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0],
              0, '#e2e5df', 20, '#cdd2ca', 60, '#b3b9af', 150, '#9aa196']],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.5, 0.92],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        },
      },

    ],
  })
}

/** Style URL (JSON spec) for the Run Replay 3D flyover. */
export function getReplay3dStyleUrl(): string {
  return replay3dStyle()
}

/**
 * Basketball Arena 3D style. It intentionally ignores arbitrary OSM building
 * colours so buildings stay neutral context while Pin type owns meaning.
 */
export function getArena3dStyleUrl(): string {
  const style = JSON.parse(replay3dStyle()) as {
    name: string
    layers: { id: string; paint?: Record<string, unknown> }[]
  }
  style.name = 'Rally Basketball Arena 3D'
  const buildingLayer = style.layers.find((layer) => layer.id === 'building-3d')
  if (buildingLayer?.paint) {
    buildingLayer.paint['fill-extrusion-color'] = [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'render_height'], 0],
      0, '#E2D8CA',
      20, '#C9B7A3',
      60, '#A3917F',
      150, '#776B61',
    ]
  }
  return JSON.stringify(style)
}

/**
 * Satellite imagery style. Uses EOX Sentinel-2 cloudless — a free, key-less,
 * CC BY 4.0 raster mosaic from Copernicus Sentinel-2 data. We deliberately do
 * NOT use Esri World Imagery: its public `arcgisonline.com` endpoint is a ToS
 * gray area for a commercial app, and the licensed ArcGIS path needs an API
 * key and costs money past a quota. EOX stays inside the app's free/key-less
 * tile stance and is attributed per its CC BY licence.
 */
function satelliteStyle(): string {
  return JSON.stringify({
    version: 8,
    name: 'Rally Satellite',
    sources: {
      's2cloudless': {
        type: 'raster',
        tiles: [
          'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
        ],
        tileSize: 256,
        maxzoom: 18,
        attribution: 'Sentinel-2 cloudless (2020) by EOX IT Services GmbH',
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#0b1418' } },
      { id: 's2cloudless', type: 'raster', source: 's2cloudless' },
    ],
  })
}

export type MapStyleConfig = {
  id: MapStyleId
  label: string
  styleUrl: string
  /** User-visible credit; OSM-derived styles must credit OpenStreetMap. */
  attribution: string
}

export const MAP_STYLES: MapStyleConfig[] = [
  {
    id: 'standard',
    // OpenFreeMap liberty is the default: fast, key-less, OSM-derived, and far
    // more reliable on-device than the VersaTiles demo server (kept only as the
    // failover provider below), which timed out and rendered blank tiles.
    label: 'Standard',
    styleUrl: 'https://tiles.openfreemap.org/styles/liberty',
    attribution: '© OpenStreetMap contributors, OpenFreeMap',
  },
  {
    id: 'bright',
    label: 'Bright',
    styleUrl: 'https://tiles.openfreemap.org/styles/bright',
    attribution: '© OpenStreetMap contributors, OpenFreeMap',
  },
  {
    id: 'clean',
    label: 'Light',
    styleUrl: cleanLightStyle(),
    attribution: '© OpenStreetMap contributors, OpenFreeMap',
  },
  {
    id: 'dark',
    // Custom muted style (cleanDarkStyle) instead of OpenFreeMap's hosted
    // `styles/dark`, whose yellow-dashed/red highways drowned out the lime
    // route overlays on the run screen.
    label: 'Dark',
    styleUrl: cleanDarkStyle(),
    attribution: '© OpenStreetMap contributors, OpenFreeMap',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    styleUrl: satelliteStyle(),
    attribution: 'Sentinel-2 cloudless (2020) by EOX IT Services GmbH (CC BY 4.0)',
  },
]

export const DEFAULT_MAP_STYLE_ID: MapStyleId = 'standard'

const FALLBACK_ATTRIBUTION = '© OpenStreetMap contributors'

/** Resolve the user-visible map credit for a style id (ODbL requirement). */
export function getStyleAttribution(id: MapStyleId): string {
  return MAP_STYLES.find((s) => s.id === id)?.attribution ?? FALLBACK_ATTRIBUTION
}

const STYLE_STORAGE_KEY = '@rally/maps/style-id'

export async function getPersistedStyleId(): Promise<MapStyleId | null> {
  try {
    const v = await AsyncStorage.getItem(STYLE_STORAGE_KEY)
    return MAP_STYLES.some((s) => s.id === v) ? (v as MapStyleId) : null
  } catch {
    return null
  }
}

export async function persistStyleId(id: MapStyleId): Promise<void> {
  try {
    await AsyncStorage.setItem(STYLE_STORAGE_KEY, id)
  } catch {
    // best-effort
  }
}

const STORAGE_KEY = '@rally/maps/active-tile-provider'
const HEALTH_CHECK_TIMEOUT_MS = 2000
const FAILOVER_WINDOW_MS = 5 * 60 * 1000
const FAILOVER_THRESHOLD = 3

let failureLog: number[] = []
let activeProvider: TileProviderId = 'openfreemap'

/**
 * Boot-time bootstrap. Reads persisted provider preference, then health
 * checks; switches to fallback immediately if primary fails the check.
 *
 * Returns the resolved active provider id.
 */
export async function initializeTileProvider(): Promise<TileProviderId> {
  const persisted = await readPersistedProvider()
  if (persisted) {
    activeProvider = persisted
  }

  const ok = await healthCheck(PROVIDERS[activeProvider].styleUrl)
  if (!ok && activeProvider === 'openfreemap') {
    await failoverTo('versatiles', 'boot_health_check_failed')
  }
  return activeProvider
}

/** Active provider config the map should mount with. */
export function getActiveProvider(): TileProviderConfig {
  return PROVIDERS[activeProvider]
}

/**
 * Caller invokes this when MapLibre/network signals a tile load failure.
 * After 3 in 5 minutes, we failover.
 */
export async function recordTileLoadFailure(reason: string): Promise<void> {
  if (activeProvider !== 'openfreemap') return // already on fallback
  const now = Date.now()
  failureLog = failureLog.filter((t) => now - t < FAILOVER_WINDOW_MS)
  failureLog.push(now)
  if (failureLog.length >= FAILOVER_THRESHOLD) {
    await failoverTo('versatiles', `runtime_${reason}`)
    failureLog = []
  }
}

type FailoverObserver = (event: {
  fromProvider: TileProviderId
  toProvider: TileProviderId
  reason: string
}) => void

let failoverObserver: FailoverObserver | null = null

/**
 * Register a single observer (analytics emit hook). Only one is wired in
 * production; calling again replaces the previous one.
 */
export function setTileFailoverObserver(observer: FailoverObserver | null): void {
  failoverObserver = observer
}

async function failoverTo(provider: TileProviderId, reason: string): Promise<void> {
  const previous = activeProvider
  activeProvider = provider
  try {
    await AsyncStorage.setItem(STORAGE_KEY, provider)
  } catch {
    // persistence is best-effort; in-memory takes effect immediately
  }
  console.warn(`[maps] failover → ${provider} (${reason})`)
  failoverObserver?.({ fromProvider: previous, toProvider: provider, reason })
}

async function readPersistedProvider(): Promise<TileProviderId | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    if (value === 'openfreemap' || value === 'versatiles') return value
    return null
  } catch {
    return null
  }
}

async function healthCheck(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
