import { expect, test } from 'vitest'
import { computeScreenPadding } from '../screenPadding'
import { Spacing } from '@/constants/theme'

const insets = { top: 59, bottom: 34 }

test('default: top edge adds inset, bottom is token only', () => {
  expect(computeScreenPadding({ insets })).toEqual({
    paddingTop: 59 + Spacing.lg,
    paddingBottom: Spacing.xl,
  })
})

test('both edges: inset added top and bottom', () => {
  expect(computeScreenPadding({ insets, edges: ['top', 'bottom'] })).toEqual({
    paddingTop: 59 + Spacing.lg,
    paddingBottom: 34 + Spacing.xl,
  })
})

test('custom pads honored, edges empty = pads only', () => {
  expect(
    computeScreenPadding({ insets, edges: [], topPad: 0, bottomPad: 0 }),
  ).toEqual({ paddingTop: 0, paddingBottom: 0 })
})
