import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import type { RunRecapColors } from '@/components/run/recap/runRecapMomentStyles'

export type RunSummaryShareSheetProps = {
  visible: boolean
  onClose: () => void
  onShare: () => void
  onSaveImage: () => void
  onExportGpx: () => void
  showGpxOption: boolean
  isSavingImage: boolean
  isExportingGpx: boolean
  colors: RunRecapColors
}

/**
 * In-app popup consolidating the summary page's export actions (share to the
 * story screen, save a still image, export GPX) behind the single "แชร์"
 * action button. Built as an absolute-positioned overlay View — the same
 * pattern as app/run/share/[sessionId].tsx's shareConfirmBackdrop — rather
 * than an RN <Modal>, since stacking a Modal on top of another Modal silently
 * fails to render on iOS.
 */
export function RunSummaryShareSheet({
  visible,
  onClose,
  onShare,
  onSaveImage,
  onExportGpx,
  showGpxOption,
  isSavingImage,
  isExportingGpx,
  colors,
}: RunSummaryShareSheetProps) {
  if (!visible) return null
  const styles = createStyles(colors)

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="ปิดเมนูแชร์"
      />
      <View style={styles.sheet}>
        <Pressable style={styles.row} onPress={onShare} accessibilityRole="button">
          <MaterialCommunityIcons name="share-variant" size={20} color={colors.heroInk} />
          <Text style={styles.rowText}>แชร์</Text>
        </Pressable>
        <Pressable
          style={styles.row}
          disabled={isSavingImage}
          onPress={onSaveImage}
          accessibilityRole="button"
        >
          {isSavingImage ? (
            <ActivityIndicator size="small" color={colors.heroInk} />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={20} color={colors.heroInk} />
          )}
          <Text style={styles.rowText}>บันทึกรูป</Text>
        </Pressable>
        {showGpxOption && (
          <Pressable
            style={styles.row}
            disabled={isExportingGpx}
            onPress={onExportGpx}
            accessibilityRole="button"
          >
            {isExportingGpx ? (
              <ActivityIndicator size="small" color={colors.heroInk} />
            ) : (
              <MaterialCommunityIcons name="map-marker-path" size={20} color={colors.heroInk} />
            )}
            <Text style={styles.rowText}>ส่งออก GPX</Text>
          </Pressable>
        )}
        <Pressable style={styles.cancelRow} onPress={onClose} accessibilityRole="button">
          <Text style={styles.cancelText}>ยกเลิก</Text>
        </Pressable>
      </View>
    </View>
  )
}

function createStyles(colors: RunRecapColors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.backdrop,
      justifyContent: 'flex-end',
      zIndex: 200,
    },
    sheet: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.tileBorder,
      borderBottomWidth: 0,
      padding: 14,
      paddingBottom: 28,
      gap: 8,
    },
    row: {
      minHeight: 52,
      borderRadius: 10,
      backgroundColor: colors.tileBg,
      borderWidth: 1.5,
      borderColor: colors.tileBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
    },
    rowText: { color: colors.heroInk, fontSize: 15, fontWeight: '900' },
    cancelRow: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    cancelText: { color: colors.subText, fontSize: 14, fontWeight: '800' },
  })
}
