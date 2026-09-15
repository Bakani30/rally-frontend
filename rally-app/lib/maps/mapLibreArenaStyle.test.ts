import { describe, expect, it } from 'vitest'

import { getArena3dStyleUrl, getReplay3dStyleUrl } from './mapLibreConfig'

type MapStyle = {
  name: string
  layers: {
    id: string
    minzoom?: number
    paint?: Record<string, unknown>
  }[]
}

function parseStyle(value: string): MapStyle {
  return JSON.parse(value) as MapStyle
}

describe('MapLibre Arena 3D style', () => {
  it('uses a stable Colosseum stone ramp without changing the Run Replay style', () => {
    const arenaStyle = parseStyle(getArena3dStyleUrl())
    const replayStyle = parseStyle(getReplay3dStyleUrl())
    const arenaBuilding = arenaStyle.layers.find((layer) => layer.id === 'building-3d')
    const replayBuilding = replayStyle.layers.find((layer) => layer.id === 'building-3d')

    expect(arenaStyle.name).toBe('Rally Basketball Arena 3D')
    expect(arenaBuilding?.minzoom).toBe(14)
    expect(arenaBuilding?.paint?.['fill-extrusion-color']).toEqual([
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'render_height'], 0],
      0, '#E2D8CA',
      20, '#C9B7A3',
      60, '#A3917F',
      150, '#776B61',
    ])
    expect(JSON.stringify(arenaBuilding?.paint?.['fill-extrusion-color'])).not.toContain('colour')
    expect(replayBuilding?.paint?.['fill-extrusion-color']).not.toEqual(arenaBuilding?.paint?.['fill-extrusion-color'])
  })
})
