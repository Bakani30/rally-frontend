import { Platform, StyleSheet } from 'react-native'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import type { RecapTone } from '@/lib/match/recap/matchRecapMoment'

// Recap theme: navy vault + orange accent (Chorus poster palette). The card is
// ALWAYS this dark surface, so every accent here is a fixed, mode-independent
// color — pulling from theme.* would flip the recap's look between light/dark.
export const RECAP_NAVY = '#283845'
export const RECAP_ORANGE = '#FFA649'
export const RECAP_INK_SOFT = '#d7d0cc'
export const RECAP_GREEN = '#2fe39a'
export const RECAP_RED = '#fb4b57'
export const RECAP_TILE = 'rgba(255,255,255,0.06)'
const RECAP_TILE_SOFT = 'rgba(255,255,255,0.05)'
const RECAP_LINE = 'rgba(255,255,255,0.13)'

export function recapAccent(tone: RecapTone): string {
  // Vivid victory green / loss red read bright against the dark navy card.
  // Tie/neutral uses the light ink so the moment stays calm.
  if (tone === 'win') return RECAP_GREEN
  if (tone === 'lose') return RECAP_RED
  return RECAP_INK_SOFT
}

export function createRecapMomentStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.82)',
      justifyContent: 'center',
    },
    scroll: {
      padding: Spacing.xl,
      flexGrow: 1,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: RECAP_NAVY,
      borderRadius: Radius.xxl,
      borderWidth: 2,
      borderColor: RECAP_LINE,
      padding: Spacing.xl,
      gap: Spacing.lg,
      ...Platform.select({
        web: { boxShadow: '0 24px 60px -24px rgba(0,0,0,0.7)' },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.4,
          shadowRadius: 28,
          elevation: 8,
        },
      }),
    },
    // Watermark board only mounts during the save capture window (see
    // MatchRecapMoment's `baking` state) — positioned as a top overlay inside
    // the captured card so it bakes into the JPG without shifting layout.
    watermarkOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
    title: { color: '#ffffff', fontSize: 40, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5 },
    celebrateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
    scoreRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.sm },
    scoreDash: { alignSelf: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: '900' },
    scoreBlock: {
      flex: 1, minHeight: 116, borderRadius: Radius.lg, borderWidth: 1.5,
      borderColor: RECAP_LINE, backgroundColor: RECAP_TILE,
      padding: Spacing.md, alignItems: 'center', justifyContent: 'center', gap: 4,
    },
    scoreSide: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, color: 'rgba(255,255,255,0.66)' },
    scoreValue: { color: '#ffffff', fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'], lineHeight: 46 },
    youTag: {
      color: RECAP_NAVY, backgroundColor: theme.amber, borderRadius: Radius.pill,
      paddingHorizontal: 10, paddingVertical: 3, fontSize: 10, fontWeight: '900',
      letterSpacing: 1, overflow: 'hidden',
    },
    divider: { height: 1, backgroundColor: RECAP_LINE },
    impactRow: { flexDirection: 'row', gap: Spacing.sm },
    impactTile: {
      flex: 1, borderRadius: Radius.lg, borderWidth: 1, borderColor: RECAP_LINE,
      backgroundColor: RECAP_TILE, padding: Spacing.md, gap: 2,
    },
    impactLabel: { color: 'rgba(255,255,255,0.66)', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    impactValue: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
    impactSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
    tierRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderRadius: Radius.lg, borderWidth: 1, borderColor: RECAP_LINE,
      backgroundColor: RECAP_TILE_SOFT, padding: Spacing.md,
    },
    tierValue: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.4, marginTop: 2 },
    promotePill: {
      flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    promotePillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
    // marginTop: actions render as a sibling BELOW the (now captureRef'd) card,
    // not inside it — see MatchRecapMoment. Keeps the same visual breathing room
    // the card's own `gap` used to provide.
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
    // Save-image saved/failed feedback (Thai) — color set inline per status
    // (RECAP_GREEN/RECAP_RED), mirrors run summary's exportFeedbackText.
    saveFeedback: { textAlign: 'center', fontSize: 12, fontWeight: '800', marginTop: 8 },
    actionBtn: {
      flex: 1, minWidth: 96, minHeight: 48, borderRadius: Radius.lg, borderWidth: 1,
      borderColor: RECAP_LINE, backgroundColor: RECAP_TILE,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: Spacing.md,
    },
    actionPrimary: { borderWidth: 0 },
    actionText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
    actionPrimaryText: { color: RECAP_NAVY, fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  })
}
