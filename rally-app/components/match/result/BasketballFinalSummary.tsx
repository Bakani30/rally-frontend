import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { BasketballFinalCourt } from '@/components/match/result/BasketballFinalCourt'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { BasketballLobbyCourtLayout } from '@/lib/match/basketballLobbyCourt'
import type { BasketballFinalSummaryModel } from '@/lib/match/finalSummaryPresenter'
import type { Side } from '@/types/match'

export type BasketballFinalImpact = {
  myStakeAmount: number | null
  myStakeCurrency: string | null
  scoreDelta: number | null
  ratingBefore: number | null
  ratingAfter: number | null
  ratingDelta: number | null
}
export type BasketballFinalSummaryProps = {
  model: BasketballFinalSummaryModel
  impact: BasketballFinalImpact | null
  courtLayout: BasketballLobbyCourtLayout
  mySide: Side | null
}

const OUTCOME_TITLE: Record<BasketballFinalSummaryModel['outcome'], string> = {
  win: 'ชัยชนะ',
  loss: 'พ่ายแพ้',
  tie: 'เสมอ',
  neutral: 'จบเกม',
}

export function BasketballFinalSummary({
  model,
  impact,
  courtLayout,
  mySide,
}: BasketballFinalSummaryProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const isSpectator = mySide === null
  const myScore = mySide === 1 ? model.scoreB : model.scoreA
  const opponentScore = mySide === 1 ? model.scoreA : model.scoreB
  const scoreTone = signedColor(impact?.scoreDelta ?? null, theme)
  const ratingTone = signedColor(impact?.ratingDelta ?? null, theme)

  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.verifiedRow}>
            <MaterialCommunityIcons name="shield-check-outline" size={15} color={theme.greenVivid} />
            <Text style={styles.verifiedText}>
              {model.isRefereeVerified ? 'กรรมการยืนยันผล' : 'ผลผ่านการยืนยัน'}
            </Text>
          </View>
          <Text style={styles.formatChip}>{`BASKETBALL · ${courtLayout.teamSize}V${courtLayout.teamSize}`}</Text>
        </View>
        <Text style={[styles.outcome, model.outcome === 'loss' && { color: theme.red }]}>
          {OUTCOME_TITLE[model.outcome]}
        </Text>
        <View style={styles.scoreRow}>
          <Text style={[styles.myScore, styles.scoreSide]}>{myScore}</Text>
          <Text style={styles.dash}>—</Text>
          <Text style={[styles.opponentScore, styles.scoreSide]}>{opponentScore}</Text>
        </View>
        <View style={styles.teamLabels}>
          <Text style={styles.teamLabel}>{isSpectator ? 'ทีม A' : 'ทีมคุณ'}</Text>
          <Text style={styles.teamLabel}>{isSpectator ? 'ทีม B' : 'คู่แข่ง'}</Text>
        </View>
      </View>

      {model.topPerformer ? (
        <View style={styles.performerPanel}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelTitle}>ผู้เล่นเด่น</Text>
            <Text style={styles.panelSource}>จากสถิติกรรมการ</Text>
          </View>
          <View style={styles.performerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{model.topPerformer.initials}</Text>
            </View>
            <View style={styles.performerCopy}>
              <Text style={styles.performerName} numberOfLines={1}>{model.topPerformer.name}</Text>
              <Text style={styles.performerStats}>
                {`${model.topPerformer.rebounds} REB · ${model.topPerformer.assists} AST · ${model.topPerformer.blocks} BLK`}
              </Text>
            </View>
            <Text style={styles.performerPoints}>
              {model.topPerformer.points}<Text style={styles.performerPointsUnit}> PTS</Text>
            </Text>
          </View>
        </View>
      ) : null}

      {!isSpectator ? <View style={styles.impactRail} accessibilityLabel="แต้มที่ได้ เดิมพัน และแรงค์บาส">
        <ImpactCell
          label="แต้มที่ได้"
          value={formatSigned(impact?.scoreDelta ?? null)}
          detail="Rally Score"
          color={scoreTone}
          styles={styles}
        />
        <View style={styles.impactDivider} />
        <ImpactCell
          label="เดิมพัน"
          value={formatStake(impact?.myStakeAmount ?? null, impact?.myStakeCurrency ?? null)}
          detail="ยืนยันก่อนแข่ง"
          color={theme.red}
          styles={styles}
          compact
        />
        <View style={styles.impactDivider} />
        <ImpactCell
          label="แรงค์บาส"
          value={formatSigned(impact?.ratingDelta ?? null)}
          detail={formatRatingRange(impact)}
          color={ratingTone}
          styles={styles}
        />
      </View> : null}

      <BasketballFinalCourt layout={courtLayout} mySide={mySide} />
    </View>
  )
}

function ImpactCell({
  label,
  value,
  detail,
  color,
  compact = false,
  styles,
}: {
  label: string
  value: string
  detail: string
  color: string
  compact?: boolean
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <View style={styles.impactCell}>
      <Text style={styles.impactLabel}>{label}</Text>
      <Text style={[styles.impactValue, compact && styles.impactValueCompact, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.impactDetail} numberOfLines={1}>{detail}</Text>
    </View>
  )
}

function formatSigned(value: number | null): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function formatStake(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return '—'
  const unit = currency === 'credit' ? 'เครดิต' : 'RP'
  return `${amount} ${unit}`
}

function formatRatingRange(impact: BasketballFinalImpact | null | undefined): string {
  if (impact?.ratingBefore == null || impact.ratingAfter == null) return 'ไม่มีข้อมูล'
  return `${impact.ratingBefore} → ${impact.ratingAfter}`
}

function signedColor(value: number | null, theme: SportPalette): string {
  if (value == null || value === 0) return theme.muted
  return value > 0 ? theme.greenVivid : theme.red
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    stack: { marginHorizontal: 14, gap: 12, marginBottom: 14 },
    hero: {
      overflow: 'hidden',
      borderRadius: Radius.xxl,
      backgroundColor: theme.fightPanel,
      paddingHorizontal: 18,
      paddingVertical: 18,
      boxShadow: theme.shadowSoft,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    verifiedText: { color: theme.greenVivid, fontSize: 10, fontWeight: '800' },
    formatChip: {
      color: theme.mutedSoft,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.16)',
      borderRadius: Radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    outcome: { marginTop: 18, color: theme.greenVivid, fontSize: 14, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    scoreSide: { flex: 1 },
    myScore: { color: theme.orange, fontSize: 62, lineHeight: 66, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    dash: { width: 48, color: theme.muted, fontSize: 28, lineHeight: 38, fontWeight: '500', textAlign: 'center' },
    opponentScore: { color: theme.chalk, fontSize: 62, lineHeight: 66, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'], textAlign: 'right' },
    teamLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    teamLabel: { color: theme.mutedSoft, fontSize: 13, lineHeight: 18, fontWeight: '900' },
    performerPanel: {
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      padding: Spacing.md,
      gap: Spacing.sm,
      boxShadow: theme.shadowSoft,
    },
    panelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
    panelTitle: { color: theme.ink, fontSize: 14, fontWeight: '900' },
    panelSource: { color: theme.muted, fontSize: 9, fontWeight: '700' },
    performerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orange },
    avatarText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    performerCopy: { flex: 1, minWidth: 0 },
    performerName: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    performerStats: { marginTop: 3, color: theme.muted, fontSize: 9, fontWeight: '700' },
    performerPoints: { color: theme.orange, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
    performerPointsUnit: { fontSize: 9 },
    impactRail: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      paddingVertical: 11,
      paddingHorizontal: 4,
      boxShadow: theme.shadowSoft,
    },
    impactCell: { flex: 1, minWidth: 0, paddingHorizontal: 9 },
    impactDivider: { width: 1, backgroundColor: theme.line },
    impactLabel: { color: theme.muted, fontSize: 9, fontWeight: '800' },
    impactValue: { marginTop: 2, fontSize: 17, lineHeight: 20, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    impactValueCompact: { fontSize: 14 },
    impactDetail: { marginTop: 3, color: theme.muted, fontSize: 8, fontWeight: '700' },
  })
}
