import { useState } from 'react'
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import * as WebBrowser from 'expo-web-browser'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { ProofThumbnail } from './ProofThumbnail'
import { isVideoPath } from './proofMediaUtils'

type Props = {
  paths: string[]
  thumbSize?: number
  emptyText?: string
}

export function ProofViewer({ paths, thumbSize = 88, emptyText }: Props) {
  const theme = useSportTheme()
  const insets = useSafeAreaInsets()
  const styles = createStyles(theme)
  const [openImage, setOpenImage] = useState<string | null>(null)

  if (!paths || paths.length === 0) {
    return emptyText ? (
      <Text style={styles.emptyText}>{emptyText}</Text>
    ) : null
  }

  async function onPressThumb(path: string, url: string) {
    if (isVideoPath(path)) {
      try {
        await WebBrowser.openBrowserAsync(url)
      } catch {
        if (Platform.OS === 'web') globalThis.open?.(url, '_blank')
      }
      return
    }
    setOpenImage(url)
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {paths.map((p) => (
          <ProofThumbnail key={p} path={p} size={thumbSize} onPress={onPressThumb} />
        ))}
      </ScrollView>

      <Modal
        visible={!!openImage}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenImage(null)}
      >
        <View style={styles.modalRoot}>
          <PressableScale
            style={[styles.closeBtn, { top: insets.top + Spacing.sm }]}
            onPress={() => setOpenImage(null)}
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={20} color={theme.chalk} />
          </PressableScale>
          {openImage && (
            <Image
              source={{ uri: openImage }}
              style={styles.fullImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { gap: Spacing.sm, paddingVertical: 4 },
    emptyText: { fontSize: 12, color: theme.mutedSoft, fontStyle: 'italic' },
    modalRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: '92%', height: '80%' },
    closeBtn: {
      position: 'absolute',
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
  })
}
