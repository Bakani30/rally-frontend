import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { getRankIcon } from '@/lib/ranks/rankAssets'
import { TIER_THRESHOLDS, type Tier } from '@/lib/leaderboard/tierRules'
import { tierAccent } from './rankColors'

type RankLadderSheetProps = {
  visible: boolean
  /** Current tier for the active sport (highlighted "ตอนนี้"). Null while locked. */
  currentTier: Tier | null
  /** Next tier up (tagged "ถัดไป"). Null at the top or while locked. */
  nextTier: Tier | null
  /** Sport label shown in the sheet header (e.g. "บาสเกตบอล"). */
  sportLabel: string
  onClose: () => void
}

const TIER_NAME: Record<Tier, string> = {
  bronze: 'BRONZE',
  silver: 'SILVER',
  gold: 'GOLD',
  platinum: 'PLATINUM',
  diamond: 'DIAMOND',
  immortal: 'IMMORTAL',
  challenger: 'CHALLENGER',
}

// Bottom sheet listing all 7 tiers (highest first) with RP + match
// requirements, reading TIER_THRESHOLDS. Current tier highlighted, next tier
// tagged. Modal + backdrop pattern mirrors PlayerRolePickerModal.
export function RankLadderSheet({
  visible,
  currentTier,
  nextTier,
  sportLabel,
  onClose,
}: RankLadderSheetProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <RallyText variant="head" lang="en" style={styles.title}>
              RANK LADDER
            </RallyText>
            <RallyText lang="th" style={styles.sport}>
              {sportLabel}
            </RallyText>
          </View>
          <RallyText lang="th" style={styles.caption}>
            RP และจำนวนนัดขั้นต่ำของแต่ละแรงค์ · แรงค์ปัจจุบันไฮไลต์
          </RallyText>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {TIER_THRESHOLDS.map(({ tier, minRating, minMatches }) => {
              const isCurrent = tier === currentTier
              const isNext = tier === nextTier
              const accent = tierAccent(tier)
              return (
                <View
                  key={tier}
                  style={[styles.rung, isCurrent ? { ...styles.rungCurrent, borderColor: accent } : null]}
                >
                  <View style={styles.iconTile}>
                    <Image source={getRankIcon(tier)} style={styles.icon} contentFit="contain" />
                  </View>
                  <View style={styles.rungMid}>
                    <RallyText variant="head" lang="en" style={[styles.rungName, { color: accent }]}>
                      {TIER_NAME[tier]}
                    </RallyText>
                    <RallyText lang="th" style={styles.rungReq}>
                      {`${minRating.toLocaleString()} RP · ${minMatches} นัด`}
                    </RallyText>
                  </View>
                  {isCurrent ? (
                    <View style={[styles.pill, { backgroundColor: accent }]}>
                      <RallyText lang="th" style={styles.pillInkDark}>ตอนนี้</RallyText>
                    </View>
                  ) : isNext ? (
                    <View style={[styles.pill, styles.pillNext]}>
                      <RallyText lang="th" style={[styles.pillInk, { color: accent }]}>ถัดไป</RallyText>
                    </View>
                  ) : null}
                </View>
              )
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.bgElevated,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.lineStrong,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
      maxHeight: '82%',
    },
    grabber: {
      width: 38,
      height: 4,
      borderRadius: Radius.pill,
      backgroundColor: theme.lineStrong,
      alignSelf: 'center',
      marginBottom: Spacing.md,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: theme.ink, fontSize: 16, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5 },
    sport: { color: theme.muted, fontSize: 11 },
    caption: { color: theme.mutedSoft, fontSize: 11, marginTop: 2, marginBottom: Spacing.md },
    list: { gap: Spacing.sm, paddingBottom: Spacing.sm },
    rung: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    rungCurrent: {
      borderWidth: 2,
      backgroundColor: theme.surfaceStrong,
    },
    iconTile: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { width: 44, height: 44 },
    rungMid: { flex: 1, minWidth: 0, gap: 2 },
    rungName: { fontSize: 15, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.4 },
    rungReq: { color: theme.muted, fontSize: 11 },
    pill: { borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
    pillNext: { backgroundColor: theme.surfaceStrong },
    // Thai pills: no fontWeight (clips marks) — color carries the emphasis.
    pillInk: { fontSize: 10, letterSpacing: 0.6 },
    pillInkDark: { fontSize: 10, letterSpacing: 0.6, color: '#161616' },
  })
}
