import { expect, test } from 'vitest'
import { scaleWith } from '../responsive'

const GW = 375
test('scales proportionally within clamp band', () => {
  expect(scaleWith(375, GW, 100)).toBeCloseTo(100, 5) // ratio 1.0
})
test('clamps upper bound at 1.12 (Pro Max 430)', () => {
  expect(scaleWith(430, GW, 100)).toBeCloseTo(112, 5) // 430/375=1.147 -> 1.12
})
test('clamps lower bound at 0.85 (very narrow 300)', () => {
  expect(scaleWith(300, GW, 100)).toBeCloseTo(85, 5) // 300/375=0.8 -> 0.85
})
test('SE width 375 is a no-op (documents width-based limitation)', () => {
  expect(scaleWith(375, GW, 20)).toBe(20)
})
