// Fallback panel for the quest capture overlay: shown when camera permission is
// missing (offer request + Settings) or no camera device exists (e.g. simulator).
import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type QuestCameraPermissionPanelProps = {
  message: string
  topInset: number
  onCancel: () => void
  onSettings?: () => void
  onRetry?: () => void
}

/** Permission / no-device fallback for QuestCameraOverlay. */
export function QuestCameraPermissionPanel({
  message,
  topInset,
  onCancel,
  onSettings,
  onRetry,
}: QuestCameraPermissionPanelProps) {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={[styles.root, { paddingTop: topInset + Spacing.xxl }]}>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.actions}>
        {onRetry && (
          <PressableScale onPress={onRetry} style={[styles.pillBtn, { backgroundColor: theme.actionAccept }]}>
            <Text style={[styles.pillText, { color: onAccent(theme.actionAccept) }]}>อนุญาต</Text>
          </PressableScale>
        )}
        {onSettings && (
          <PressableScale onPress={onSettings} style={[styles.pillBtn, styles.settingsBtn]}>
            <Text style={[styles.pillText, { color: theme.ink }]}>เปิดการตั้งค่า</Text>
          </PressableScale>
        )}
      </View>
      <PressableScale onPress={onCancel} style={styles.cancel}>
        <Text style={[styles.pillText, { color: theme.ink }]}>ยกเลิก</Text>
      </PressableScale>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.lg,
      paddingHorizontal: Spacing.xl,
    },
    message: { color: theme.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, justifyContent: 'center' },
    pillBtn: {
      minWidth: 130,
      height: 52,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.lg,
    },
    settingsBtn: { backgroundColor: 'rgba(255,255,255,0.92)' },
    pillText: { fontSize: 16, fontWeight: '900' },
    cancel: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  })
}
