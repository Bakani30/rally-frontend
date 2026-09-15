import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import type { HealthWriteBackRecord } from '@/lib/run-tracking/health-writeback/healthWriteBackTypes'
import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

export type HealthSyncBarProps = {
  targetName: string
  status: HealthWriteBackRecord | null
  isLoadingStatus: boolean
  isSaving: boolean
  onSave: () => Promise<HealthWriteBackRecord | null>
  /** theme.greenVivid (#2fe39a dark / #0fa968 light) — the one vivid-green bar on the page. */
  syncColor: string
  /** Sport.red — used only for the save-failed status line. */
  errorColor: string
  colors: RunRecapColors
}

// Dark ink reads bold on both the dark- and light-mode greenVivid tones.
const SYNC_INK = '#0b3d24'

/**
 * Single vivid-green sync bar that replaces the old long-copy Apple
 * Health / Health Connect card. Tap runs the existing useHealthWriteBack
 * save flow unchanged; once saved the bar shows a check instead of a
 * chevron and a small status line appears below it.
 */
export function HealthSyncBar({
  targetName,
  status,
  isLoadingStatus,
  isSaving,
  onSave,
  syncColor,
  errorColor,
  colors,
}: HealthSyncBarProps) {
  const isSaved = status?.status === 'saved'
  const styles = createStyles(colors, syncColor, errorColor)

  return (
    <View style={styles.wrap}>
      <Pressable
        disabled={isSaving || isSaved}
        style={[styles.bar, (isSaving || isSaved) && styles.barDisabled]}
        onPress={() => {
          onSave().catch(() => {})
        }}
        accessibilityRole="button"
        accessibilityLabel={`Sync บันทึกเข้า ${targetName}`}
      >
        {isSaving || isLoadingStatus ? (
          <ActivityIndicator size="small" color={SYNC_INK} />
        ) : (
          <MaterialCommunityIcons name="heart-pulse" size={18} color={SYNC_INK} />
        )}
        <Text style={styles.barText} numberOfLines={1}>
          Sync · บันทึกเข้า {targetName}
        </Text>
        <MaterialCommunityIcons
          name={isSaved ? 'check-circle' : 'chevron-right'}
          size={18}
          color={SYNC_INK}
        />
      </Pressable>
      {status?.errorMessage ? (
        <Text style={styles.errorText}>{status.errorMessage}</Text>
      ) : isSaved ? (
        <Text style={styles.statusText}>บันทึกแล้ว</Text>
      ) : null}
    </View>
  )
}

function createStyles(colors: RunRecapColors, syncColor: string, errorColor: string) {
  return StyleSheet.create({
    wrap: { marginBottom: 14, gap: 6 },
    bar: {
      minHeight: 52,
      borderRadius: 10,
      backgroundColor: syncColor,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    barDisabled: { opacity: 0.75 },
    barText: { flex: 1, color: SYNC_INK, fontSize: 14, fontWeight: '900' },
    statusText: { color: colors.subText, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    errorText: { color: errorColor, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  })
}
