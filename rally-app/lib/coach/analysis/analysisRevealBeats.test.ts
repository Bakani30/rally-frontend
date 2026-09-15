import { describe, expect, it } from 'vitest'
import { buildRevealBeats } from './analysisRevealBeats'
import type { StatHexagon } from './basketballStatHexagon'

const hexagon: StatHexagon = {
  axes: [
    { key: 'power', rpgLabel: 'POWER', statLabel: 'PTS', value: 14, score: 80, comparisonScore: 60, delta: 7, state: 'ready' },
    { key: 'range', rpgLabel: 'RANGE', statLabel: '3PT', value: 0, score: 0, comparisonScore: 60, delta: -2, state: 'ready' },
    { key: 'motor', rpgLabel: 'MOTOR', statLabel: 'EFFORT', value: 8, score: 80, comparisonScore: null, delta: null, state: 'ready' },
  ],
  strongest: 'power',
  weakest: 'range',
}

const mastery = { roleLabel: 'guard', level: 3, matches: 12 }

describe('buildRevealBeats', () => {
  it('orders result → strength → gap → mastery with real values', () => {
    const beats = buildRevealBeats({ resultLabel: 'WIN', scoreLine: '78–72', hexagon, mastery, language: 'en' })
    expect(beats.map((b) => b.kind)).toEqual(['result', 'strength', 'gap', 'mastery'])
    expect(beats[0]).toMatchObject({ title: 'WIN', detail: '78–72' })
    expect(beats[1]).toMatchObject({ title: 'POWER', detail: '14 PTS' })
    expect(beats[2]).toMatchObject({ title: 'RANGE', detail: '0 3PT' })
    expect(beats[3].title).toContain('Lv.3')
  })

  it('drops the result beat when there is no result or score', () => {
    const beats = buildRevealBeats({ resultLabel: null, scoreLine: null, hexagon, mastery, language: 'th' })
    expect(beats.map((b) => b.kind)).toEqual(['strength', 'gap', 'mastery'])
  })

  it('omits the gap beat when strongest equals weakest', () => {
    const flat: StatHexagon = { ...hexagon, strongest: 'power', weakest: 'power' }
    const beats = buildRevealBeats({ resultLabel: 'TIE', scoreLine: null, hexagon: flat, mastery, language: 'en' })
    expect(beats.map((b) => b.kind)).toEqual(['result', 'strength', 'mastery'])
  })
})
