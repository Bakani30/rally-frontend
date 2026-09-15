import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { RallyText } from '@/components/ui/RallyText'
import { Fonts, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { RecentRpRow } from '@/lib/ranks/recentRpService'
import { RankSectionHeader } from './RankSectionHeader'

type RecentRpListProps = {
  rows: RecentRpRow[]
  isLoading: boolean
  isError: boolean
  /** Header override (locked placement peek uses "RP จาก placement"). */
  title?: string
  /** Extra note under the rows (e.g. locked-state tier-history notice). */
  footerNote?: string | null
}

// "RP ล่าสุด" — recent matches with a signed RP delta per row. Real data comes
// from activity-session rating snapshots (running); sports without sessions
// fall through to the empty state behind this same API.
export function RecentRpList({ rows, isLoading, isError, title = 'RP ล่าสุด', footerNote }: RecentRpListProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View>
      <RankSectionHeader title={title} sub="recent matches" />
      <View style={styles.card}>
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.muted} />
          </View>
        ) : isError ? (
          <RallyText lang="th" style={styles.stateText}>โหลดข้อมูล RP ไม่สำเร็จ</RallyText>
        ) : rows.length === 0 ? (
          <RallyText lang="th" style={styles.stateText}>ยังไม่มีข้อมูล RP ล่าสุด</RallyText>
        ) : (
          rows.map((row) => <Row key={row.id} row={row} styles={styles} theme={theme} />)
        )}
        {footerNote ? (
          <RallyText lang="th" style={styles.footerNote}>{footerNote}</RallyText>
        ) : null}
      </View>
    </View>
  )
}

function Row({
  row,
  styles,
  theme,
}: {
  row: RecentRpRow
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}) {
  const win = row.result === 'win'
  const chipColor = win ? theme.greenVivid : theme.redVivid
  const chipBg = win ? 'rgba(47,227,154,0.16)' : 'rgba(251,75,87,0.16)'
  const sign = row.rpDelta >= 0 ? '+' : '−'
  const magnitude = Math.abs(row.rpDelta)

  return (
    <View style={styles.row}>
      <View style={[styles.wl, { backgroundColor: chipBg }]}>
        <Text style={[styles.wlText, { color: chipColor }]}>{win ? 'ช' : 'พ'}</Text>
      </View>
      <View style={styles.mid}>
        <RallyText lang="th" style={styles.title} numberOfLines={1}>
          {`${win ? 'ชนะ' : 'แพ้'} · ${row.title}`}
        </RallyText>
        {row.subtitle ? (
          <RallyText lang="th" style={styles.sub} numberOfLines={1}>{row.subtitle}</RallyText>
        ) : null}
      </View>
      <Text style={[styles.delta, { color: chipColor }]}>{`${sign}${magnitude}`}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: Radius.xl,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    state: { paddingVertical: 18, alignItems: 'center' },
    stateText: { color: theme.mutedSoft, fontSize: 12, paddingVertical: 16, textAlign: 'center' },
    footerNote: { color: theme.mutedSoft, fontSize: 10, paddingVertical: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.line,
    },
    wl: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    wlText: { fontSize: 11, fontWeight: '900' },
    mid: { flex: 1, minWidth: 0 },
    // Thai row copy: no fontWeight (clips marks). Emphasis comes from color/size.
    title: { color: theme.inkSoft, fontSize: 12 },
    sub: { color: theme.mutedSoft, fontSize: 10, marginTop: 1 },
    delta: {
      fontSize: 14,
      fontWeight: '900',
      fontStyle: 'italic',
      fontFamily: Fonts?.rounded,
      fontVariant: ['tabular-nums'],
    },
  })
}
