import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { RallyText } from '@/components/ui/RallyText'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { formatThaiShortDate, tierDisplayLabel } from '@/lib/ranks/rankHistoryFormat'
import { tierAccent, DEMOTE_COLOR } from './rankColors'
import type { TierEvent } from '@/lib/ranks/tierEventTypes'
import { RankSectionHeader } from './RankSectionHeader'

type RankHistoryTimelineProps = {
  events: TierEvent[]
  isLoading: boolean
  isError: boolean
}

// "ประวัติแรงค์" — timeline of tier_events, newest first. Promotion = green ▲,
// demotion = muted red ▼ (informational, not alarm). Each row: to-tier,
// from-tier snapshot, Thai short date.
export function RankHistoryTimeline({ events, isLoading, isError }: RankHistoryTimelineProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View>
      <RankSectionHeader title="ประวัติแรงค์" sub="tier events" />
      <View style={styles.card}>
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.muted} />
          </View>
        ) : isError ? (
          <RallyText lang="th" style={styles.stateText}>โหลดประวัติแรงค์ไม่สำเร็จ</RallyText>
        ) : events.length === 0 ? (
          <RallyText lang="th" style={styles.stateText}>ยังไม่มีการเปลี่ยนแรงค์</RallyText>
        ) : (
          <View style={styles.timeline}>
            {events.length > 1 ? <View style={styles.spine} /> : null}
            {events.map((event, idx) => (
              <Row
                key={event.id}
                event={event}
                last={idx === events.length - 1}
                styles={styles}
                theme={theme}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

function Row({
  event,
  last,
  styles,
  theme,
}: {
  event: TierEvent
  last: boolean
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
}) {
  const promoted = event.direction === 'promotion'
  const accentColor = promoted ? theme.greenVivid : DEMOTE_COLOR
  const nodeBg = promoted ? 'rgba(47,227,154,0.18)' : 'rgba(217,139,143,0.18)'
  const toColor = tierAccent(event.toTier)

  return (
    <View style={[styles.event, last ? styles.eventLast : null]}>
      <View style={[styles.node, { backgroundColor: nodeBg, borderColor: theme.bg }]}>
        <Text style={[styles.nodeGlyph, { color: accentColor }]}>{promoted ? '▲' : '▼'}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headline}>
          <RallyText lang="th" style={[styles.action, { color: accentColor }]}>
            {promoted ? 'เลื่อนขั้น' : 'ตกขั้น'}
          </RallyText>
          <RallyText lang="th" style={styles.arrow}> → </RallyText>
          <RallyText variant="head" lang="en" style={[styles.toTier, { color: toColor }]}>
            {tierDisplayLabel(event.toTier)}
          </RallyText>
        </View>
        <RallyText lang="th" style={styles.sub}>
          {`จาก ${tierDisplayLabel(event.fromTier)}`}
        </RallyText>
      </View>
      <Text style={styles.date}>{formatThaiShortDate(event.createdAt)}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.line,
      borderRadius: 20,
      padding: 14,
    },
    state: { paddingVertical: 18, alignItems: 'center' },
    stateText: { color: theme.mutedSoft, fontSize: 12, paddingVertical: 16, textAlign: 'center' },
    timeline: { paddingLeft: 26, position: 'relative' },
    spine: { position: 'absolute', left: -17, top: 6, bottom: 10, width: 2, backgroundColor: theme.line },
    event: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
    eventLast: { marginBottom: 0 },
    node: {
      position: 'absolute',
      left: -26,
      top: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeGlyph: { fontSize: 9, fontWeight: '900' },
    body: { flex: 1, minWidth: 0 },
    headline: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
    action: { fontSize: 12.5 },
    arrow: { color: theme.muted, fontSize: 12.5 },
    toTier: { fontSize: 12.5, fontWeight: '900', fontStyle: 'italic' },
    sub: { color: theme.muted, fontSize: 10.5, marginTop: 1 },
    date: {
      color: theme.mutedSoft,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
    },
  })
}
