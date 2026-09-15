import { StyleSheet, Text, View } from 'react-native'
import type { DimensionValue } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { derivePlayerTrustDisplay } from '@/lib/profile/playerTrustRecord'
import type { UserStats } from '@/lib/profile/profileRepository'

type PlayerTrustedRecordCardProps = {
  stats: UserStats | null | undefined
}

export function PlayerTrustedRecordCard({ stats }: PlayerTrustedRecordCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const record = stats?.trusted_record ?? null
  const display = derivePlayerTrustDisplay(stats)
  const tone = toneColors(theme)[display.tone]
  const progressWidth = `${Math.max(0, Math.min(100, display.coveragePercent))}%` as DimensionValue

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: tone.soft }]}>
          <MaterialCommunityIcons name="shield-check" size={20} color={tone.strong} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TRUST-WEIGHTED RECORD</Text>
          <Text style={styles.title}>{display.verifiedRecordLabel}</Text>
        </View>
        <View style={[styles.confidencePill, { borderColor: tone.line, backgroundColor: tone.soft }]}>
          <Text style={[styles.confidenceText, { color: tone.strong }]}>{display.confidenceLabel}</Text>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth, backgroundColor: tone.strong }]} />
        </View>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>{display.headline}</Text>
          <Text style={styles.progressPercent}>{display.coveragePercent}%</Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <TrustMetric label="Clean" value={record?.cleanVerifiedMatches ?? 0} color={theme.greenVivid} />
        <TrustMetric label="Corrected" value={record?.correctedVerifiedMatches ?? 0} color={theme.amber} />
        <TrustMetric label="Disputed" value={record?.disputedVerifiedMatches ?? 0} color={theme.red} />
        <TrustMetric label="Best ref" value={`L${record?.bestRefereeLevel ?? 0}`} color={theme.ink} />
      </View>

      <Text style={styles.detail}>{display.detail}</Text>
    </View>
  )
}

function TrustMetric({ label, value, color }: { label: string; value: number | string; color: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

function toneColors(theme: SportPalette) {
  return {
    green: { strong: theme.green, soft: theme.greenSoft, line: theme.trustGlow },
    amber: { strong: theme.amber, soft: theme.amberSoft, line: theme.economyGlow },
    neutral: { strong: theme.inkSoft, soft: theme.surfaceStrong, line: theme.line },
  } as const
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      width: 320,
      maxWidth: '100%',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: theme.muted,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    title: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: '900',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    confidencePill: {
      minHeight: 30,
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confidenceText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
    progressBlock: {
      gap: Spacing.sm,
    },
    progressTrack: {
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: theme.surfaceStrong,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: Radius.pill,
    },
    progressMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    progressText: {
      flex: 1,
      color: theme.inkSoft,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 16,
    },
    progressPercent: {
      color: theme.ink,
      fontSize: 12,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    metricRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    metric: {
      flex: 1,
      minHeight: 52,
      borderRadius: Radius.lg,
      backgroundColor: theme.surfaceStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    metricValue: {
      fontSize: 15,
      fontWeight: '900',
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      marginTop: 2,
      color: theme.muted,
      fontSize: 9,
      fontWeight: '800',
    },
    detail: {
      color: theme.muted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '700',
    },
  })
}
