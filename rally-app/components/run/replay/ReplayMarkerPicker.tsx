import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { RallyPalette } from '@/constants/theme'
import { normalizeReplayEmoji } from '@/lib/replay/replayEmoji'
import { GlassSurface } from './GlassSurface'

const QUICK_EMOJIS = ['🏃', '🔥', '⚡', '🚀', '🐕', '🦊']
const EMOJI_FONT_FAMILY = Platform.OS === 'ios' ? 'AppleColorEmoji' : undefined

type Props = {
  visible: boolean
  avatarUrl: string | null
  emoji: string | null
  initials: string
  hasCustom: boolean
  onClose: () => void
  onPickPhoto: () => void
  onPickEmoji: (emoji: string) => void
  onReset: () => void
}

export function ReplayMarkerPicker({
  visible,
  avatarUrl,
  emoji,
  initials,
  hasCustom,
  onClose,
  onPickPhoto,
  onPickEmoji,
  onReset,
}: Props) {
  const [draftEmoji, setDraftEmoji] = useState(emoji ?? '')

  useEffect(() => {
    if (visible) setDraftEmoji(emoji ?? '')
  }, [emoji, visible])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassSurface style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>RUNNER MARKER</Text>
              <Text style={styles.title}>ปรับแต่งจุดผู้เล่น</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ปิด"
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close" size={21} color="#24302d" />
            </Pressable>
          </View>

          <View style={styles.previewRow}>
            <View style={styles.previewMarker}>
              {emoji ? (
                <Text style={styles.previewEmoji}>{emoji}</Text>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.previewImage} contentFit="cover" />
              ) : (
                <Text style={styles.previewInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>นี่คือจุดที่กำลังวิ่ง</Text>
              <Text style={styles.previewHint}>แตะจุดบนแผนที่เมื่อไหร่ก็เปลี่ยนได้</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="เลือกรูปจากเครื่อง"
            style={styles.actionRow}
            onPress={onPickPhoto}
          >
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="image-outline" size={22} color={RallyPalette.blue} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>เลือกรูปจากเครื่อง</Text>
              <Text style={styles.actionHint}>ใช้รูปโปรไฟล์หรือสติกเกอร์ที่บันทึกไว้ใน Photos</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#7b8882" />
          </Pressable>

          <View style={styles.emojiBlock}>
            <Text style={styles.sectionTitle}>เลือก emoji</Text>
            <View style={styles.emojiRow}>
              {QUICK_EMOJIS.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`ใช้ ${item}`}
                  style={[styles.emojiButton, emoji === item && styles.emojiButtonActive]}
                  onPress={() => onPickEmoji(item)}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="พิมพ์ emoji หรือเปิดคีย์บอร์ด emoji"
              onChangeText={(value) => {
                setDraftEmoji(normalizeReplayEmoji(value))
              }}
              value={draftEmoji}
              placeholder="พิมพ์ emoji ที่ต้องการ…"
              placeholderTextColor="#89958f"
              style={styles.emojiInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (draftEmoji) onPickEmoji(draftEmoji)
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="ใช้ emoji นี้"
              style={styles.applyEmojiButton}
              onPress={() => {
                if (draftEmoji) onPickEmoji(draftEmoji)
              }}
            >
              <Text style={styles.applyEmojiText}>ใช้ emoji นี้</Text>
            </Pressable>
          </View>

          {hasCustom && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="กลับไปใช้รูปโปรไฟล์"
              style={styles.resetButton}
              onPress={onReset}
            >
              <Text style={styles.resetText}>กลับไปใช้รูปโปรไฟล์</Text>
            </Pressable>
          )}
        </GlassSurface>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 16, 0.42)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  sheet: {
    backgroundColor: 'rgba(239, 244, 239, 0.78)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    padding: 20,
    gap: 16,
    shadowColor: '#13221d',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  eyebrow: { color: RallyPalette.blue, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#17201d', fontSize: 23, fontWeight: '900', marginTop: 3 },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(229, 237, 232, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(228, 237, 231, 0.82)',
  },
  previewMarker: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: RallyPalette.blue,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },
  previewEmoji: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 31 },
  previewInitials: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  previewCopy: { flex: 1, gap: 3 },
  previewTitle: { color: '#22302a', fontSize: 14, fontWeight: '900' },
  previewHint: { color: '#607069', fontSize: 12, lineHeight: 17 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 48,
    paddingVertical: 3,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 122, 224, 0.12)',
  },
  actionCopy: { flex: 1, gap: 2 },
  actionTitle: { color: '#22302a', fontSize: 14, fontWeight: '900' },
  actionHint: { color: '#67756e', fontSize: 11, lineHeight: 15 },
  emojiBlock: { gap: 10 },
  sectionTitle: { color: '#22302a', fontSize: 14, fontWeight: '900' },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emojiButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(111, 129, 119, 0.16)',
  },
  emojiButtonActive: { borderColor: RallyPalette.blue, backgroundColor: 'rgba(31, 122, 224, 0.1)' },
  emoji: { fontFamily: EMOJI_FONT_FAMILY, fontSize: 25 },
  emojiInput: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    color: '#22302a',
    fontFamily: EMOJI_FONT_FAMILY,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(111, 129, 119, 0.16)',
  },
  resetButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  resetText: { color: RallyPalette.blue, fontSize: 13, fontWeight: '900' },
  applyEmojiButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  applyEmojiText: { color: RallyPalette.blue, fontSize: 13, fontWeight: '900' },
})
