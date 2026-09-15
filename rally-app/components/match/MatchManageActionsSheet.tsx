import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']

export type MatchManageAction = {
  key: string
  label: string
  hint?: string
  icon: IconName
  tone?: 'neutral' | 'danger' | 'warning'
  disabled?: boolean
  busy?: boolean
  onPress: () => void
}

type MatchManageActionsSheetProps = {
  visible: boolean
  title?: string
  actions: MatchManageAction[]
  onClose: () => void
}

export function MatchManageActionsSheet({
  visible,
  title = 'จัดการแมตช์',
  actions,
  onClose,
}: MatchManageActionsSheetProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)
  const tones = tonesFor(theme)
  const visibleActions = actions.filter((action) => !action.disabled)

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <PressableScale style={styles.closeButton} onPress={onClose} accessibilityLabel="ปิดเมนูจัดการ">
              <MaterialCommunityIcons name="close" size={18} color={theme.inkSoft} />
            </PressableScale>
          </View>

          {visibleActions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>ยังไม่มี action เพิ่มเติมตอนนี้</Text>
            </View>
          ) : (
            <View style={styles.actionList}>
              {visibleActions.map((action) => {
                const tone = tones[action.tone ?? 'neutral']
                return (
                  <PressableScale
                    key={action.key}
                    style={[styles.actionRow, action.busy && styles.disabled]}
                    onPress={() => {
                      onClose()
                      action.onPress()
                    }}
                    disabled={action.busy}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
                      <MaterialCommunityIcons name={action.icon} size={18} color={tone.fg} />
                    </View>
                    <View style={styles.actionCopy}>
                      <Text style={[styles.actionLabel, { color: tone.fg }]}>
                        {action.busy ? 'กำลังดำเนินการ…' : action.label}
                      </Text>
                      {action.hint ? <Text style={styles.actionHint}>{action.hint}</Text> : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
                  </PressableScale>
                )
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function tonesFor(theme: SportPalette) {
  return {
    neutral: { fg: theme.inkSoft, bg: theme.surfaceStrong },
    danger: { fg: theme.red, bg: theme.redSoft },
    warning: { fg: theme.amber, bg: theme.amberSoft },
  }
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.bgElevated,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: theme.lineStrong,
  },
  headerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  title: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: theme.surface,
  },
  actionList: { gap: Spacing.sm },
  actionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: 2 },
  actionLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  actionHint: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  empty: {
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    backgroundColor: theme.surface,
  },
  emptyText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.6 },
})
}
