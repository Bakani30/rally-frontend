import { Platform, StyleSheet } from 'react-native'
import { Radius, Spacing } from '@/constants/theme'

// Dark bg + gold radial feel (approved mockup จอ 4). Fixed dark-mode colors —
// this moment is always the same celebratory surface regardless of app
// theme, mirroring the recap moment's fixed-navy convention
// (matchRecapMomentStyles.ts).
export const PROMOTION_BG = '#161616'
export const PROMOTION_GOLD = '#eac31a'
const PROMOTION_LINE = 'rgba(234,195,26,0.25)'

export const promotionMomentStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: PROMOTION_BG,
    borderRadius: Radius.xxl,
    borderWidth: 2,
    borderColor: PROMOTION_LINE,
    padding: Spacing.xl,
    gap: Spacing.lg,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 24px 70px -20px rgba(234,195,26,0.35)' },
      default: {
        shadowColor: PROMOTION_GOLD,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 32,
        elevation: 10,
      },
    }),
  },
  // Thai-carrying text (เลื่อนขั้น / activity+tier transition row): no fontWeight
  // — weight comes from the resolved Thai font family via <RallyText
  // variant="head|body">, never a bare style prop (repo rule: fontWeight on a
  // single-face Thai family can force iOS to substitute/synthesize a face and
  // drop combining marks). See lib/typography/resolveFont.ts.
  eyebrow: {
    color: PROMOTION_GOLD,
    fontSize: 11,
    letterSpacing: 1.8,
  },
  rankIconWrap: { alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm },
  // tierName renders the Latin-only tier label (e.g. "GOLD") — fontWeight is
  // safe here, it never carries Thai.
  tierName: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 0.4,
  },
  transitionRow: { color: 'rgba(255,255,255,0.72)', fontSize: 14 },
  ratingDelta: {
    color: PROMOTION_GOLD,
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  ladderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  ladderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ladderIconWrapCurrent: {
    borderColor: PROMOTION_GOLD,
    backgroundColor: 'rgba(234,195,26,0.14)',
  },
  actions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.lg },
  primaryBtn: {
    minHeight: 52,
    borderRadius: Radius.lg,
    backgroundColor: PROMOTION_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: PROMOTION_BG,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
})
