import { describe, expect, it, vi } from 'vitest'

// mapLibreConfig imports AsyncStorage at module load; stub it so the pure
// attribution/provider data can be unit-tested in the node environment.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() },
}))

import {
  DEFAULT_MAP_STYLE_ID,
  MAP_STYLES,
  PROVIDERS,
  getReplay3dStyleUrl,
  getStyleAttribution,
} from './mapLibreConfig'

describe('map attribution + licensing', () => {
  it('exposes a non-empty attribution for every style', () => {
    expect(MAP_STYLES.length).toBeGreaterThan(0)
    for (const style of MAP_STYLES) {
      expect(getStyleAttribution(style.id).length).toBeGreaterThan(0)
    }
  })

  it('credits OpenStreetMap on every OSM-derived (non-satellite) style', () => {
    for (const style of MAP_STYLES) {
      if (style.id === 'satellite') continue
      expect(getStyleAttribution(style.id)).toMatch(/OpenStreetMap/)
    }
  })

  it('resolves the default style attribution', () => {
    expect(getStyleAttribution(DEFAULT_MAP_STYLE_ID)).toMatch(/OpenStreetMap/)
  })

  it('offers a satellite style under a free CC-BY license, crediting Copernicus/EOX', () => {
    const satellite = MAP_STYLES.find((s) => s.id === 'satellite')
    expect(satellite).toBeDefined()
    expect(satellite?.attribution).toMatch(/Copernicus|Sentinel|EOX/)
    // The licensed EOX s2cloudless endpoint, not the ToS-gray Esri one.
    expect(satellite?.styleUrl).toMatch(/eox\.at/)
  })

  it('never uses the unlicensed Esri/arcgisonline or OSM-France humanitarian tiles', () => {
    expect(MAP_STYLES.map((s) => s.id)).not.toContain('humanitarian')
    for (const style of MAP_STYLES) {
      expect(style.styleUrl).not.toMatch(/arcgisonline|server\.arcgis/i)
    }
  })

  it('uses only free providers that need no API key', () => {
    for (const provider of Object.values(PROVIDERS)) {
      expect(provider.requiresApiKey).toBe(false)
    }
  })

  it('keeps replay 3D free of place labels', () => {
    const style = JSON.parse(getReplay3dStyleUrl()) as { layers: { id?: string }[] }
    expect(style.layers.some((layer) => layer.id === 'place-label')).toBe(false)
  })
})
