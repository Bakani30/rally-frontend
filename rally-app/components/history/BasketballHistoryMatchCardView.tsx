import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { BasketballHistoryPresentation } from '@/lib/history/basketballHistoryPresenter'
import { deriveMatchListTrustBadge } from '@/lib/match/matchTrustBadge'
import type { MyMatch } from '@/types/match'

export type BasketballHistoryPin = {
  pinned: boolean
  atCap: boolean
  pending: boolean
  onToggle: (matchId: string) => void
}

export type BasketballHistoryMatchCardViewProps = {
  match: MyMatch
  presentation: BasketballHistoryPresentation
  pin: BasketballHistoryPin
  onOpen: () => void
}

const OUTCOME_LABEL = { win: 'ชนะ', loss: 'แพ้', tie: 'เสมอ' } as const

export function BasketballHistoryMatchCardView({ match, presentation, pin, onOpen }: BasketballHistoryMatchCardViewProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const outcomeColor = presentation.outcome === 'win' ? theme.green : presentation.outcome === 'loss' ? theme.red : theme.muted
  const teamSize = Math.max(1, Math.ceil((match.match_participants?.length ?? 2) / 2))
  const trust = deriveMatchListTrustBadge(match)
  const pinMuted = !pin.pinned && pin.atCap

  return (
    <PressableScale style={styles.card} onPress={onOpen} accessibilityRole="button" accessibilityLabel="เปิดรายละเอียดแมตช์บาส">
      <View style={styles.topRow}>
        <View style={styles.sportMark}><MaterialCommunityIcons name="basketball" size={22} color={theme.ink} /></View>
        <View style={styles.headingCopy}>
          <View style={styles.headingLine}>
            <Text style={styles.activity}>{`Basketball · ${teamSize}V${teamSize}`}</Text>
            {pin.pinned ? <View style={styles.pinnedChip}><MaterialCommunityIcons name="pin" size={11} color={theme.orange} /><Text style={styles.pinnedText}>ปักหมุด</Text></View> : null}
          </View>
          <Text style={styles.date}>{formatDate(presentation.date)}</Text>
        </View>
        <PressableScale style={styles.pinButton} onPress={() => pin.onToggle(match.id)} disabled={pin.pending} hitSlop={10} accessibilityRole="button" accessibilityLabel={pin.pinned ? 'ยกเลิกปักหมุดแมตช์' : 'ปักหมุดแมตช์'}>
          <MaterialCommunityIcons name={pin.pinned ? 'star' : 'star-outline'} size={21} color={pin.pinned ? theme.amber : pinMuted ? theme.mutedSoft : theme.muted} />
        </PressableScale>
      </View>
      <View style={styles.resultRow}>
        <View style={styles.scoreBlock}>
          <Text style={[styles.outcome, { color: outcomeColor }]}>{OUTCOME_LABEL[presentation.outcome]}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.myScore, styles.scoreSide]}>{presentation.score?.my ?? '—'}</Text>
            <Text style={styles.scoreDash}>—</Text>
            <Text style={[styles.opponentScore, styles.scoreSide]}>{presentation.score?.opponent ?? '—'}</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.mutedSoft} />
      </View>
      <View style={styles.impactStrip}>
        <Impact label="แต้มที่ได้" value={formatSigned(presentation.scoreDelta)} detail="Rally Score" color={signedColor(presentation.scoreDelta, theme)} styles={styles} />
        <View style={styles.divider} />
        <Impact label="แรงค์บาส" value={formatSigned(presentation.ratingDelta)} detail={formatRating(presentation.ratingBefore, presentation.ratingAfter)} color={signedColor(presentation.ratingDelta, theme)} styles={styles} />
        <View style={styles.divider} />
        <Impact label="เดิมพัน" value={formatStake(presentation.stakeAmount, presentation.stakeCurrency)} detail="แต้มของคุณ" color={theme.red} styles={styles} compact />
      </View>
      <View style={styles.foot}><MaterialCommunityIcons name={trust.icon} size={13} color={theme.green} /><Text style={styles.trust} numberOfLines={1}>{trust.label}</Text></View>
    </PressableScale>
  )
}

function Impact({ label, value, detail, color, compact = false, styles }: { label: string; value: string; detail: string; color: string; compact?: boolean; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.impactCell}><Text style={styles.impactLabel}>{label}</Text><Text style={[styles.impactValue, compact && styles.impactCompact, { color }]} numberOfLines={1}>{value}</Text><Text style={styles.impactDetail} numberOfLines={1}>{detail}</Text></View>
}

function formatDate(value: string): string { return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }
function formatSigned(value: number | null): string { return value == null ? '—' : value > 0 ? `+${value}` : String(value) }
function signedColor(value: number | null, theme: SportPalette): string { return value == null || value === 0 ? theme.muted : value > 0 ? theme.green : theme.red }
function formatRating(before: number | null, after: number | null): string { return before == null || after == null ? 'ไม่มีข้อมูล' : `${before} → ${after}` }
function formatStake(amount: number | null, currency: string | null): string { return amount == null || !currency ? '—' : `${amount} ${currency === 'credit' ? 'เครดิต' : 'RP'}` }

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: { overflow: 'hidden', borderRadius: Radius.xxl, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, boxShadow: theme.shadowSoft },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingTop: 13 }, sportMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orange }, headingCopy: { flex: 1, minWidth: 0 }, headingLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, activity: { color: theme.ink, fontSize: 13, fontWeight: '900', fontStyle: 'italic' }, date: { marginTop: 3, color: theme.muted, fontSize: 10, fontWeight: '700' }, pinnedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: Radius.pill, backgroundColor: theme.orangeSoft, paddingHorizontal: 6, paddingVertical: 3 }, pinnedText: { color: theme.orange, fontSize: 8, fontWeight: '900' }, pinButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10 }, outcome: { fontSize: 10, fontWeight: '900', fontStyle: 'italic', letterSpacing: 0.6 }, scoreBlock: { flex: 1, minWidth: 0 }, scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 }, scoreSide: { flex: 1 }, myScore: { color: theme.orange, fontSize: 31, lineHeight: 35, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] }, opponentScore: { color: theme.ink, fontSize: 31, lineHeight: 35, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'], textAlign: 'right' }, scoreDash: { width: 30, color: theme.muted, fontSize: 17, lineHeight: 24, textAlign: 'center' },
    impactStrip: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderTopColor: theme.line, paddingVertical: 9, paddingHorizontal: 4 }, impactCell: { flex: 1, minWidth: 0, paddingHorizontal: 8 }, divider: { width: 1, backgroundColor: theme.line }, impactLabel: { color: theme.muted, fontSize: 8, fontWeight: '800' }, impactValue: { marginTop: 2, fontSize: 15, lineHeight: 18, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] }, impactCompact: { fontSize: 12 }, impactDetail: { marginTop: 2, color: theme.muted, fontSize: 7, fontWeight: '700' }, foot: { flexDirection: 'row', alignItems: 'center', gap: 5, borderTopWidth: 1, borderTopColor: theme.line, paddingHorizontal: 13, paddingVertical: 9 }, trust: { flex: 1, color: theme.muted, fontSize: 9, fontWeight: '700' },
  })
}
