import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type LockedRankHeroProps = {
  played: number
  floor: number
  remaining: number
  sportLabel: string
  initials: string
  avatarUrl: string | null | undefined
  /** Sport accent (ActivityColor) for pips + CTA. */
  sportColor: string
  /** Ink color that reads on sportColor (CTA text). */
  sportOnColor: string
  onFindMatch: () => void
}

const AVATAR_SIZE = 118

// Locked sport (placement incomplete): faded hero + lock, an unlock CTA card
// with played/floor pips, and a "find a match" action. No board / stats /
// history while locked.
export function LockedRankHero({
  played,
  floor,
  remaining,
  sportLabel,
  initials,
  avatarUrl,
  sportColor,
  sportOnColor,
  onFindMatch,
}: LockedRankHeroProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View>
      <View style={styles.heroWrap}>
        <View style={styles.categoryChip}>
          <View style={[styles.categoryDot, { backgroundColor: sportColor }]} />
          <RallyText variant="head" lang="th" style={styles.categoryLabel}>{`หมวด ${sportLabel}`}</RallyText>
        </View>
        <View style={styles.faded}>
          <View style={styles.avatarClip}>
            <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={AVATAR_SIZE} />
          </View>
          <RallyText variant="head" lang="en" style={styles.unranked}>UNRANKED</RallyText>
          <Text style={styles.dashMeta}>— RP · —</Text>
        </View>
        <View style={[styles.lockPuck, { borderColor: theme.lineStrong }]}>
          <MaterialCommunityIcons name="lock" size={30} color={theme.chalk} />
        </View>
      </View>

      <View style={[styles.card, { borderColor: theme.lineStrong }]}>
        <RallyText lang="th" style={styles.headline}>
          {`เล่นอีก ${remaining} นัดเพื่อปลดล็อคแรงค์`}
        </RallyText>
        <RallyText lang="th" style={styles.subline}>
          {`แข่งจัดอันดับให้ครบ ${floor} นัดเพื่อรับแรงค์`}
        </RallyText>

        <View style={styles.pips}>
          {Array.from({ length: floor }, (_, i) => (
            <View
              key={i}
              style={[styles.pip, { backgroundColor: i < played ? sportColor : theme.line }]}
            />
          ))}
        </View>
        <View style={styles.countRow}>
          <Text style={[styles.count, { color: sportColor }]}>{played}</Text>
          <Text style={styles.countUnit}>{` / ${floor} นัด`}</Text>
        </View>

        <PressableScale
          style={[styles.cta, { backgroundColor: sportColor }]}
          onPress={onFindMatch}
          accessibilityRole="button"
          accessibilityLabel="หาแมตช์"
        >
          <RallyText lang="th" style={[styles.ctaText, { color: sportOnColor }]}>หาแมตช์ →</RallyText>
        </PressableScale>
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    heroWrap: { alignItems: 'center', justifyContent: 'center' },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.pill,
      backgroundColor: theme.surface,
      paddingVertical: 5,
      paddingHorizontal: 10,
      marginBottom: 10,
    },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryLabel: { color: theme.ink, fontSize: 11 },
    faded: { alignItems: 'center', opacity: 0.32 },
    avatarClip: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: 'hidden',
      backgroundColor: theme.surface,
      borderWidth: 5,
      borderColor: theme.mutedSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unranked: { color: theme.muted, fontSize: 32, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.5, marginTop: 12 },
    dashMeta: { color: theme.muted, fontSize: 12, marginTop: 4, fontVariant: ['tabular-nums'] },
    lockPuck: {
      position: 'absolute',
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      marginTop: Spacing.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      alignItems: 'center',
    },
    headline: { color: theme.ink, fontSize: 15, textAlign: 'center' },
    subline: { color: theme.muted, fontSize: 11, marginTop: 4, textAlign: 'center' },
    pips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 14, maxWidth: 300 },
    pip: { width: 22, height: 8, borderRadius: Radius.pill },
    countRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 10 },
    count: {
      fontSize: 20,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    countUnit: { color: theme.muted, fontSize: 12 },
    cta: {
      marginTop: 14,
      alignSelf: 'stretch',
      borderRadius: Radius.lg,
      paddingVertical: 13,
      alignItems: 'center',
    },
    ctaText: { fontSize: 13, letterSpacing: 0.4 },
  })
}
