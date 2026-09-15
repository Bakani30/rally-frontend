import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { RefereeEligibilityStateRow } from '@/components/referee/RefereeEligibilityStateRow'
import { RefereeTierChip } from '@/components/referee/RefereeTierChip'
import { RefereeSourceIcon } from '@/components/referee/icons/RefereeSourceIcon'
import { Fonts, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { AlphaRefereeEligibility } from '@/lib/match/alphaRefereeService'
import {
  refereeActivityLabel,
  refereeEligibilityStatusLine,
  refereeRequirementItems,
  type RefereeRequirementItem,
} from '@/lib/match/refereeCopy'
import {
  currentRefereeTier,
  refereeSupportsTrust,
  type RefereeActivityKey,
} from '@/lib/match/refereeLevels'
import { getSportReelItem } from '@/lib/match/sportReel'
import type { RefereeSportProfile } from '@/types/match'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type RefereeLevelCardProps = {
  activityKey: RefereeActivityKey
  profile: RefereeSportProfile | null
  eligibility: AlphaRefereeEligibility | null
  eligibilityState: 'loading' | 'ready' | 'error'
  // Cards may reveal eligibility copy and existing trust stats inline.
  expandable: boolean
  expanded: boolean
  showRequirements?: boolean
  onRetryEligibility?: () => void
  onPress: () => void
}

// One per-sport referee standing, styled like the leaderboard ranking rows.
export function RefereeLevelCard({
  activityKey,
  profile,
  eligibility,
  eligibilityState,
  expandable,
  expanded,
  showRequirements = false,
  onRetryEligibility,
  onPress,
}: RefereeLevelCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const reel = getSportReelItem(activityKey)
  const supportsTrust = refereeSupportsTrust(activityKey)
  const tier = currentRefereeTier(profile)
  const cleanPct =
    profile && profile.completed_matches > 0
      ? Math.round((profile.clean_matches / profile.completed_matches) * 100)
      : null

  const statusLine = resolveStatusLine(
    activityKey,
    supportsTrust,
    profile,
    eligibility,
    eligibilityState,
  )
  const requirements = showRequirements && eligibilityState === 'ready' ? refereeRequirementItems(activityKey, eligibility) : []
  const chevron: IconName = expandable
    ? expanded
      ? 'chevron-up'
      : 'chevron-down'
    : 'chevron-right'

  return (
    <View style={[styles.row, expanded ? styles.rowExpanded : null]}>
      <PressableScale
        style={styles.head}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandable ? expanded : undefined }}
        accessibilityLabel={`กีฬา ${refereeActivityLabel(activityKey)}, ${statusLine}${supportsTrust ? `, ระดับจากผลงาน ${tier.level}` : ''}`}
        accessibilityHint={
          expandable
            ? expanded
              ? 'แตะเพื่อซ่อนรายละเอียด'
              : 'แตะเพื่อดูรายละเอียดและเงื่อนไข'
            : 'แตะเพื่อเปิดรายละเอียด'
        }
      >
        <View style={[styles.iconCircle, { backgroundColor: reel.accent }]}>
          <RefereeSourceIcon name={activityKey} size={21} color={reel.onAccent} />
        </View>
        <View style={styles.mid}>
          <Text style={styles.label} numberOfLines={1}>
            {refereeActivityLabel(activityKey)}
          </Text>
          <Text style={styles.status} numberOfLines={1}>
            {statusLine}
          </Text>
        </View>
        {supportsTrust ? (
          <View style={styles.tierColumn}>
            <RefereeTierChip tier={tier.key} />
            <Text style={styles.levelText}>LV {tier.level}</Text>
          </View>
        ) : (
          <View style={styles.manualChip}>
            <Text style={styles.manualText}>บันทึกเอง</Text>
          </View>
        )}
        <MaterialCommunityIcons name={chevron} size={20} color={theme.mutedSoft} />
      </PressableScale>

      {expandable && expanded ? (
        <Reveal style={styles.expandedBody} translateY={6} duration={240}>
          {showRequirements ? (
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>คุณสมบัติกรรมการ</Text>
              {eligibilityState === 'loading' ? (
                <RefereeEligibilityStateRow
                  loading
                  label="กำลังเช็กคุณสมบัติ…"
                  theme={theme}
                />
              ) : eligibilityState === 'error' ? (
                <RefereeEligibilityStateRow
                  label="เช็กคุณสมบัติไม่ได้"
                  onRetry={onRetryEligibility}
                  theme={theme}
                />
              ) : (
                requirements.map((item) => (
                  <RequirementRow key={item.key} item={item} theme={theme} />
                ))
              )}
            </View>
          ) : null}

          {profile && profile.completed_matches > 0 ? (
            <View style={styles.stats}>
              <StatCell label="ตัดสิน" value={String(profile.completed_matches)} theme={theme} />
              <View style={styles.statDivider} />
              <StatCell label="ไร้ข้อโต้แย้ง" value={cleanPct == null ? '—' : `${cleanPct}%`} theme={theme} />
              <View style={styles.statDivider} />
              <StatCell label="มีข้อโต้แย้ง" value={String(profile.disputed_matches)} theme={theme} />
            </View>
          ) : null}
        </Reveal>
      ) : null}
    </View>
  )
}

function RequirementRow({ item, theme }: { item: RefereeRequirementItem; theme: SportPalette }) {
  const styles = createStyles(theme)
  const meta = requirementStatusMeta(item.status, theme)
  return (
    <View style={styles.requirementRow}>
      <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
      <Text style={[styles.requirementLabel, item.status === 'locked' ? styles.requirementLocked : null]}>
        {item.label}
      </Text>
      {item.detail ? (
        <View style={[styles.requirementDetail, { borderColor: meta.color }]}>
          <Text style={[styles.requirementDetailText, { color: meta.color }]}>{item.detail}</Text>
        </View>
      ) : null}
    </View>
  )
}

function requirementStatusMeta(
  status: RefereeRequirementItem['status'],
  theme: SportPalette,
): { icon: IconName; color: string } {
  if (status === 'done') return { icon: 'check-circle', color: theme.green }
  if (status === 'current') return { icon: 'progress-clock', color: theme.orange }
  if (status === 'locked') return { icon: 'lock-outline', color: theme.mutedSoft }
  return { icon: 'information-outline', color: theme.inkSoft }
}

function StatCell({ label, value, theme }: { label: string; value: string; theme: SportPalette }) {
  const styles = createStyles(theme)
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function resolveStatusLine(
  activityKey: RefereeActivityKey,
  supportsTrust: boolean,
  profile: RefereeSportProfile | null,
  eligibility: AlphaRefereeEligibility | null,
  eligibilityState: RefereeLevelCardProps['eligibilityState'],
): string {
  if (eligibilityState === 'loading') return 'กำลังเช็กคุณสมบัติ…'
  if (eligibilityState === 'error') return 'เช็กคุณสมบัติไม่ได้'
  return refereeEligibilityStatusLine({ supportsTrust, profile, eligibility })
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    rowExpanded: { borderColor: theme.lineStrong },
    head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: 52 },
    iconCircle: { width: 46, height: 46, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
    mid: { flex: 1, minWidth: 0, gap: 3 },
    label: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    status: { color: theme.muted, fontSize: 12, lineHeight: 18, fontWeight: '700', fontFamily: Fonts?.thaiMedium },
    manualChip: {
      alignSelf: 'flex-start',
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surfaceStrong,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    manualText: { color: theme.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    tierColumn: { alignItems: 'flex-end', gap: 4 },
    levelText: { color: theme.ink, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
    expandedBody: {
      marginTop: Spacing.sm,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.lineStrong,
      gap: Spacing.sm,
    },
    requirements: { gap: 2 },
    requirementsTitle: {
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      marginBottom: 2,
    },
    requirementRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.line,
    },
    requirementLabel: {
      flex: 1,
      color: theme.ink,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '700',
      fontFamily: Fonts?.thaiMedium,
    },
    requirementLocked: { color: theme.mutedSoft },
    requirementDetail: {
      minWidth: 36,
      minHeight: 24,
      borderRadius: Radius.pill,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 7,
    },
    requirementDetailText: { fontSize: 10, fontWeight: '900', fontVariant: ['tabular-nums'] },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.lineStrong,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: theme.line },
    statValue: {
      color: theme.ink,
      fontSize: 16,
      fontWeight: '900',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      marginTop: 3,
      color: theme.muted,
      fontSize: 10,
      lineHeight: 15,
      fontWeight: '800',
      fontFamily: Fonts?.thaiMedium,
    },
  })
}
