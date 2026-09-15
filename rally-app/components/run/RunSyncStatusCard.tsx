import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { type RunArenaPalette as RunArenaColors } from '@/constants/theme'
import { useRunArenaTheme } from '@/hooks/useAppTheme'
import { useRunSyncStatus } from '@/hooks/useRunSyncStatus'
import { getRunSubmitErrorMessage } from '@/lib/run-tracking/session/runSubmitErrorMessages'
import { formatDistance, formatRunStartedAt } from '@/lib/run-tracking/session/runSessionFormat'
import type { FailedSyncSession } from '@/lib/run-tracking/offline/runSyncStatus'

/**
 * Visible sync status for offline runs. Renders nothing when everything is
 * synced, a "รอซิงค์" pill when runs are still uploading, and a dead-letter
 * panel (Thai reason + retry/discard) for runs that can no longer auto-submit.
 * Buffer-driven, so it works for local runs that never reached the server.
 */
export function RunSyncStatusCard() {
  const palette = useRunArenaTheme()
  const styles = useMemo(() => createStyles(palette), [palette])
  const { pendingCount, failedSessions, retry, discard } = useRunSyncStatus()

  if (failedSessions.length === 0 && pendingCount === 0) return null

  return (
    <View style={styles.wrap}>
      {pendingCount > 0 && (
        <View style={styles.pendingPill}>
          <MaterialCommunityIcons name="cloud-sync-outline" size={14} color={palette.trust} />
          <Text style={styles.pendingText}>รอซิงค์ {pendingCount} รายการ</Text>
        </View>
      )}
      {failedSessions.map((session) => (
        <FailedRunRow
          key={session.sessionId}
          session={session}
          styles={styles}
          palette={palette}
          onRetry={() => {
            void retry(session.sessionId, session.lastErrorCode)
          }}
          onDiscard={() => {
            void discard(session.sessionId)
          }}
        />
      ))}
    </View>
  )
}

function FailedRunRow({
  session,
  styles,
  palette,
  onRetry,
  onDiscard,
}: {
  session: FailedSyncSession
  styles: ReturnType<typeof createStyles>
  palette: RunArenaColors
  onRetry: () => void
  onDiscard: () => void
}) {
  const message = session.lastErrorCode
    ? getRunSubmitErrorMessage(session.lastErrorCode)
    : null
  // retryable=false means this exact run is terminally rejected (e.g. below
  // the 100m minimum) — retrying can never succeed, so only offer discard.
  const canRetry = message?.retryable !== false

  return (
    <View style={styles.failedCard}>
      <View style={styles.failedHeader}>
        <View style={styles.failedChip}>
          <MaterialCommunityIcons name="cloud-alert" size={13} color={palette.danger} />
          <Text style={styles.failedChipText}>ส่งไม่สำเร็จ</Text>
        </View>
        <Text style={styles.failedMeta}>
          {formatRunStartedAt(session.startedAt)} · {formatDistance(session.distanceMeters)}
        </Text>
      </View>
      {message && (
        <Text style={styles.failedMessage}>
          {message.title} {message.detail}
        </Text>
      )}
      <View style={styles.failedActions}>
        {canRetry && (
          <Pressable style={[styles.actionButton, styles.retryButton]} onPress={onRetry}>
            <MaterialCommunityIcons name="refresh" size={16} color={palette.chalk} />
            <Text style={styles.retryText}>ลองอีกครั้ง</Text>
          </Pressable>
        )}
        <Pressable style={[styles.actionButton, styles.discardButton]} onPress={onDiscard}>
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={palette.danger} />
          <Text style={styles.discardText}>ลบทิ้ง</Text>
        </Pressable>
      </View>
    </View>
  )
}

function createStyles(palette: RunArenaColors) {
  return StyleSheet.create({
    wrap: { gap: 10, marginBottom: 4 },
    pendingPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      minHeight: 30,
      borderRadius: 999,
      backgroundColor: palette.trustSoft,
      borderWidth: 1,
      borderColor: `${palette.trust}38`,
    },
    pendingText: {
      color: palette.trust,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    failedCard: {
      padding: 14,
      borderRadius: 18,
      backgroundColor: palette.surfaceRaised,
      borderWidth: 1,
      borderColor: palette.dangerSoft,
    },
    failedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    failedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      minHeight: 28,
      borderRadius: 999,
      backgroundColor: palette.dangerSoft,
    },
    failedChipText: {
      color: palette.danger,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0,
    },
    failedMeta: { color: palette.textMuted, fontSize: 12, fontWeight: '800' },
    failedMessage: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
      marginTop: 10,
    },
    failedActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    retryButton: { backgroundColor: palette.trust },
    retryText: { color: palette.chalk, fontSize: 14, fontWeight: '900' },
    discardButton: {
      backgroundColor: palette.surfaceRaised,
      borderWidth: 1,
      borderColor: palette.dangerSoft,
    },
    discardText: { color: palette.danger, fontSize: 14, fontWeight: '900' },
  })
}
