import { StyleSheet } from 'react-native'
import type { ThemeMode } from '@/constants/theme'
import type { RunRecapTone } from '@/lib/run-tracking/recap/runRecapMoment'

export type RunRecapColors = {
  backdrop: string
  cardBg: string
  tileBg: string
  tileBorder: string
  accent: string
  onAccent: string
  heroInk: string
  heroCalm: string
  subText: string
  eyebrow: string
  points: string
  sparkMuted: string
  sparkFast: string
  secondaryBorder: string
  secondaryText: string
  rewardPillBg: string
  rewardPillText: string
  neutralPillBg: string
  neutralPillText: string
  calorieText: string
  zoneColors: [string, string, string, string, string]
  surfaceCard: string
}

// "Daylight Paper" — founder-approved light theme (mockup 2026-07-11)
const LIGHT: RunRecapColors = {
  backdrop: 'rgba(17,18,28,0.55)',
  cardBg: '#f4f6f8',
  tileBg: '#ffffff',
  tileBorder: '#dde2e8',
  accent: '#a8cc1f',
  onAccent: '#1c2405',
  heroInk: '#15181d',
  heroCalm: '#15181d',
  subText: '#7a8290',
  eyebrow: '#7a8290',
  points: '#6f8f0a',
  sparkMuted: '#dde2e8',
  sparkFast: '#a8cc1f',
  secondaryBorder: '#dde2e8',
  secondaryText: '#7a8290',
  rewardPillBg: 'rgba(168,204,31,0.16)',
  rewardPillText: '#5c7a00',
  neutralPillBg: 'rgba(21,24,29,0.06)',
  neutralPillText: '#7a8290',
  calorieText: '#6f8f0a',
  zoneColors: ['#5ac8fa', '#8ce065', '#a8cc1f', '#ffb14f', '#ff6b5e'],
  surfaceCard: '#ffffff',
}

// "Graphite Volt" — founder-approved dark theme (no green-tinted background)
const DARK: RunRecapColors = {
  backdrop: 'rgba(0,0,0,0.6)',
  cardBg: '#131418',
  tileBg: '#1b1d22',
  tileBorder: '#26292f',
  accent: '#d9ff4f',
  onAccent: '#21300a',
  heroInk: '#f2f4f6',
  heroCalm: '#f2f4f6',
  subText: '#8b929c',
  eyebrow: '#8b929c',
  points: '#d9ff4f',
  sparkMuted: '#26292f',
  sparkFast: '#d9ff4f',
  secondaryBorder: '#26292f',
  secondaryText: '#8b929c',
  rewardPillBg: 'rgba(217,255,79,0.14)',
  rewardPillText: '#d9ff4f',
  neutralPillBg: 'rgba(242,244,246,0.07)',
  neutralPillText: '#8b929c',
  calorieText: '#d9ff4f',
  zoneColors: ['#5ac8fa', '#8ce065', '#d9ff4f', '#ffb14f', '#ff6b5e'],
  surfaceCard: '#191b20',
}

export function createRunRecapColors(mode: ThemeMode): RunRecapColors {
  return mode === 'dark' ? DARK : LIGHT
}

export type RunRecapTonePresentation = {
  pillBg: string
  pillText: string
  label: string
  heroColor: string
}

export function runRecapTonePresentation(
  colors: RunRecapColors,
  tone: RunRecapTone,
): RunRecapTonePresentation {
  if (tone === 'record') {
    return { pillBg: colors.accent, pillText: colors.onAccent, label: 'สถิติใหม่', heroColor: colors.heroInk }
  }
  if (tone === 'reward') {
    return { pillBg: colors.rewardPillBg, pillText: colors.rewardPillText, label: 'ได้แต้ม', heroColor: colors.heroInk }
  }
  return { pillBg: colors.neutralPillBg, pillText: colors.neutralPillText, label: 'บันทึกแล้ว', heroColor: colors.heroCalm }
}

export function createRunRecapStyles(colors: RunRecapColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: { borderRadius: 10, backgroundColor: colors.cardBg, borderWidth: 1.5, borderColor: colors.tileBorder, padding: 22, gap: 16 },

    heroBeat: { gap: 12 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    eyebrow: { color: colors.eyebrow, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    tonePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    tonePillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    heroNumberRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
    heroNumber: { fontSize: 60, fontWeight: '900', lineHeight: 60, fontVariant: ['tabular-nums'] },
    heroUnit: { color: colors.subText, fontSize: 18, fontWeight: '900', paddingBottom: 9 },
    heroSub: { color: colors.subText, fontSize: 13, fontWeight: '700' },

    impactBeat: { gap: 12 },
    kcalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    kcalIcon: { width: 24, height: 24 },
    kcalValue: { fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
    kcalLabel: { color: colors.subText, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    impactTiles: { flexDirection: 'row', gap: 10 },
    tile: { flex: 1, minHeight: 70, borderRadius: 8, borderWidth: 1.5, padding: 12, justifyContent: 'center', gap: 4 },
    tileLabel: { color: colors.subText, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    tileValue: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
    tileValueSm: { fontSize: 16, fontWeight: '900' },

    bodyCard: { borderRadius: 10, backgroundColor: colors.tileBg, borderWidth: 1.5, borderColor: colors.tileBorder, padding: 14, gap: 12 },
    bodyCardHeader: { color: colors.eyebrow, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
    zoneBarRow: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2 },
    zoneSegment: { minWidth: 2 },
    zoneLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    zoneLegendText: { color: colors.subText, fontSize: 11, fontWeight: '700' },
    zoneLegendDominant: { color: colors.accent, fontWeight: '900' },
    bodyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bodyRowLabel: { color: colors.subText, fontSize: 11, fontWeight: '800' },
    bodyRowValue: { color: colors.heroInk, fontSize: 13, fontWeight: '900' },

    actionsBeat: { gap: 8 },
    primaryButton: { minHeight: 52, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    primaryButtonText: { fontSize: 15, fontWeight: '900' },
    secondaryRow: { flexDirection: 'row', gap: 8 },
    secondaryButton: { flex: 1, minHeight: 48, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  })
}

export type RunRecapStyles = ReturnType<typeof createRunRecapStyles>
