import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { ArenaSessionSnapshot } from '@/types/arenaSession'

type QueueTeam = Pick<ArenaSessionSnapshot['teams'][number], 'teamId' | 'name' | 'partyName' | 'members' | 'queuePosition'>

type ArenaSessionHostControlsSheetProps = {
  visible: boolean
  queuedTeams: QueueTeam[]
  canOpen: boolean
  canAdvance: boolean
  canReorder: boolean
  canBeginDrain: boolean
  canClose: boolean
  pending?: boolean
  onCloseSheet: () => void
  onOpen: () => void
  onAdvanceQueue: () => void
  onReorderQueue: (input: { expectedTeamIds: string[]; orderedTeamIds: string[] }) => void
  onBeginDrain: () => void
  onCloseSession: () => void
}

const ROW_HEIGHT = 64

export function ArenaSessionHostControlsSheet({
  visible,
  queuedTeams,
  canOpen,
  canAdvance,
  canReorder,
  canBeginDrain,
  canClose,
  pending = false,
  onCloseSheet,
  onOpen,
  onAdvanceQueue,
  onReorderQueue,
  onBeginDrain,
  onCloseSession,
}: ArenaSessionHostControlsSheetProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const expectedTeamIds = useMemo(() => queuedTeams.map((team) => team.teamId), [queuedTeams])
  const [draftTeams, setDraftTeams] = useState(queuedTeams)
  const dragState = useRef<{ teamId: string; lastStep: number } | null>(null)

  useEffect(() => {
    if (visible) setDraftTeams(queuedTeams)
  }, [queuedTeams, visible])

  const changed = expectedTeamIds.join('|') !== draftTeams.map((team) => team.teamId).join('|')

  function moveTeam(teamId: string, direction: -1 | 1) {
    setDraftTeams((current) => {
      const index = current.findIndex((team) => team.teamId === teamId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current
      const next = [...current]
      const [team] = next.splice(index, 1)
      next.splice(targetIndex, 0, team)
      return next
    })
  }

  function responderFor(teamId: string) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !pending && canReorder,
      onMoveShouldSetPanResponder: (_, gesture) => !pending && canReorder && Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => {
        dragState.current = { teamId, lastStep: 0 }
      },
      onPanResponderMove: (_, gesture) => {
        const state = dragState.current
        if (!state || state.teamId !== teamId) return
        const step = Math.trunc(gesture.dy / ROW_HEIGHT)
        if (step === state.lastStep) return
        const direction: -1 | 1 = step > state.lastStep ? 1 : -1
        moveTeam(teamId, direction)
        state.lastStep += direction
      },
      onPanResponderRelease: () => {
        dragState.current = null
      },
      onPanResponderTerminate: () => {
        dragState.current = null
      },
    })
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCloseSheet}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onCloseSheet} accessibilityLabel="ปิดการจัดการสนาม" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.eyebrow}>HOST CONTROLS</Text>
              <Text style={styles.title}>จัดการสนาม</Text>
            </View>
            <PressableScale style={styles.dismissButton} onPress={onCloseSheet} accessibilityLabel="ปิด">
              <MaterialCommunityIcons name="close" size={20} color={theme.ink} />
            </PressableScale>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.contentScrollContent}
            showsVerticalScrollIndicator
            accessibilityLabel="รายการควบคุมสนาม"
          >
            {canOpen ? (
              <ControlButton label="เปิด Session" icon="door-open" onPress={onOpen} disabled={pending} styles={styles} />
            ) : null}
            {canAdvance ? (
              <ControlButton label="เลื่อนคิว" icon="skip-next" onPress={onAdvanceQueue} disabled={pending} styles={styles} />
            ) : null}

            {canReorder ? (
              <View style={styles.queuePanel}>
                <View style={styles.queueHeading}>
                  <View>
                    <Text style={styles.queueTitle}>จัดลำดับคิว</Text>
                    <Text style={styles.queueHint}>ลากทีมเพื่อเปลี่ยนลำดับทีมที่รอ</Text>
                  </View>
                  <Text style={styles.queueCount}>{draftTeams.length}</Text>
                </View>
                {draftTeams.length === 0 ? (
                  <Text style={styles.emptyQueue}>ยังไม่มีทีมรอคิว</Text>
                ) : (
                  draftTeams.map((team, index) => (
                    <View key={team.teamId} style={styles.queueRow} {...responderFor(team.teamId).panHandlers}>
                      <Text style={styles.queueNumber}>{index + 1}</Text>
                      <View style={styles.teamCopy}>
                        <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
                        <Text style={styles.teamMeta} numberOfLines={1}>{team.partyName ?? `${team.members.length} คน`}</Text>
                      </View>
                      <MaterialCommunityIcons name="drag-vertical" size={24} color={theme.mutedSoft} />
                    </View>
                  ))
                )}
                <ControlButton
                  label={pending ? 'กำลังบันทึก...' : 'บันทึกลำดับคิว'}
                  icon="content-save-outline"
                  onPress={() => onReorderQueue({ expectedTeamIds, orderedTeamIds: draftTeams.map((team) => team.teamId) })}
                  disabled={pending || !changed}
                  styles={styles}
                />
              </View>
            ) : null}

            {canBeginDrain ? (
              <OutlineButton label="เริ่มปิดสนาม (20 นาที)" icon="timer-outline" onPress={onBeginDrain} disabled={pending} styles={styles} theme={theme} />
            ) : null}
            {canClose ? (
              <OutlineButton label="ปิด Session" icon="stop-circle-outline" onPress={onCloseSession} disabled={pending} danger styles={styles} theme={theme} />
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function ControlButton({ label, icon, onPress, disabled, styles }: {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  onPress: () => void
  disabled: boolean
  styles: ReturnType<typeof createStyles>
}) {
  return (
    <PressableScale style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled} accessibilityRole="button">
      <MaterialCommunityIcons name={icon} size={19} color={OnAccent.onLight} />
      <Text style={styles.primaryButtonText}>{label}</Text>
    </PressableScale>
  )
}

function OutlineButton({ label, icon, onPress, disabled, styles, theme, danger = false }: {
  label: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  onPress: () => void
  disabled: boolean
  styles: ReturnType<typeof createStyles>
  theme: SportPalette
  danger?: boolean
}) {
  return (
    <PressableScale style={[styles.outlineButton, danger && styles.outlineButtonDanger, disabled && styles.disabled]} onPress={onPress} disabled={disabled} accessibilityRole="button">
      <MaterialCommunityIcons name={icon} size={19} color={danger ? theme.risk : theme.ink} />
      <Text style={[styles.outlineButtonText, danger && styles.outlineButtonTextDanger]}>{label}</Text>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  const styles = StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
    sheet: { backgroundColor: theme.bgElevated, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderWidth: 1, borderColor: theme.line, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: Spacing.sm, maxHeight: '90%' },
    handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: theme.mutedSoft, marginBottom: Spacing.xs },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs },
    eyebrow: { color: theme.orange, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
    title: { color: theme.ink, fontSize: 24, fontWeight: '800', marginTop: 2 },
    dismissButton: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line },
    contentScroll: { flexShrink: 1 },
    contentScrollContent: { gap: Spacing.sm, paddingBottom: Spacing.xs },
    primaryButton: { minHeight: 52, borderRadius: Radius.lg, backgroundColor: theme.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
    primaryButtonText: { color: OnAccent.onLight, fontSize: 17, fontWeight: '800' },
    queuePanel: { backgroundColor: theme.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, padding: Spacing.sm, gap: Spacing.xs },
    queueHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.xs },
    queueTitle: { color: theme.ink, fontSize: 17, fontWeight: '800' },
    queueHint: { color: theme.muted, fontSize: 13, marginTop: 2 },
    queueCount: { color: theme.orange, fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'right' },
    queueRow: { height: ROW_HEIGHT, borderRadius: Radius.md, backgroundColor: theme.bgElevated, borderWidth: 1, borderColor: theme.line, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    queueNumber: { width: 22, color: theme.orange, fontSize: 16, fontWeight: '800', textAlign: 'center' },
    teamCopy: { flex: 1, minWidth: 0 },
    teamName: { color: theme.ink, fontSize: 15, fontWeight: '800' },
    teamMeta: { color: theme.muted, fontSize: 12, marginTop: 1 },
    emptyQueue: { color: theme.muted, fontSize: 14, paddingVertical: Spacing.md, textAlign: 'center' },
    outlineButton: { minHeight: 52, borderRadius: Radius.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md },
    outlineButtonDanger: { borderColor: theme.risk },
    outlineButtonText: { color: theme.ink, fontSize: 16, fontWeight: '800' },
    outlineButtonTextDanger: { color: theme.risk },
    disabled: { opacity: 0.5 },
  })
  return styles
}
