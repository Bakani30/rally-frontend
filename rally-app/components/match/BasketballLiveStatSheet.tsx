import { useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { getSportPalette, Radius, Spacing, type SportPalette } from '@/constants/theme'
import type { BasketballLobbyCourtParticipant } from '@/lib/match/basketballLobbyCourt'
import {
  addPoints,
  addThreePointer,
  BASKETBALL_STAT_SHEET_POINT_STEPS,
  clearStat,
  normalizeStatLine,
  removePoints,
  removeThreePointer,
  type BasketballStatKey,
} from '@/lib/match/basketballStatSheetControls'
import type { BasketballLiveStatLine } from '@/lib/match/basketballLiveScoring'

type BasketballLiveStatSheetProps = {
  visible: boolean
  participant: BasketballLobbyCourtParticipant | null
  stats: BasketballLiveStatLine
  canEdit: boolean
  /** Points a behind-the-arc shot is worth: 2 for half-court (1v1/2v2/3v3), 3 for 5v5. */
  longRangePointValue: number
  pending?: boolean
  saveState?: 'idle' | 'saving' | 'saved' | 'error'
  onChangeStats: (stats: BasketballLiveStatLine) => void
  onClose: () => void
}

type StatControlConfig = {
  key: BasketballStatKey
  label: string
  value: number
  addLabel?: string
  subtractLabel?: string
}

export function BasketballLiveStatSheet({
  visible,
  participant,
  stats,
  canEdit,
  longRangePointValue,
  pending = false,
  saveState = 'idle',
  onChangeStats,
  onClose,
}: BasketballLiveStatSheetProps) {
  const theme = getSportPalette('dark')
  const styles = createStyles(theme)
  const longShotLabel = longRangePointValue === 3 ? '3PM' : '2PT'
  const [selectedStatKey, setSelectedStatKey] = useState<BasketballStatKey>('points')
  const disabled = !canEdit || pending
  const saveLabel = saveState === 'saving'
    ? 'กำลังบันทึก'
    : saveState === 'saved'
      ? 'บันทึกแล้ว'
      : saveState === 'error'
        ? 'บันทึกไม่สำเร็จ'
        : canEdit
          ? 'Live Draft'
          : 'ดูได้อย่างเดียว'

  const selectedStatLabel = statLabelFor(selectedStatKey, longShotLabel)
  const selectedStatValue = stats[selectedStatKey]
  const selectedCanClear = selectedStatValue > 0
  const statControls = useMemo<StatControlConfig[]>(() => [
    {
      key: 'points',
      label: 'PTS',
      value: stats.points,
      addLabel: '+1 / +2',
      subtractLabel: '-1 / -2',
    },
    { key: 'rebounds', label: 'REB', value: stats.rebounds },
    { key: 'assists', label: 'AST', value: stats.assists },
    { key: 'blocks', label: 'BLK', value: stats.blocks },
    {
      key: 'threePointersMade',
      label: longShotLabel,
      value: stats.threePointersMade,
      addLabel: `+${longRangePointValue} PTS`,
      subtractLabel: `-${longRangePointValue} PTS`,
    },
  ], [longRangePointValue, longShotLabel, stats.assists, stats.blocks, stats.points, stats.rebounds, stats.threePointersMade])
  const selectedControl = statControls.find((item) => item.key === selectedStatKey) ?? statControls[0]

  const commitStats = (nextStats: BasketballLiveStatLine) => {
    if (disabled) return
    onChangeStats(normalizeStatLine(nextStats, longRangePointValue))
  }

  const patchStats = (patch: Partial<BasketballLiveStatLine>) => {
    commitStats({
      ...stats,
      ...patch,
    })
  }

  const handleAddStat = (key: BasketballStatKey, amount: 1 | 2 = 1) => {
    setSelectedStatKey(key)
    if (key === 'points') {
      commitStats(addPoints(stats, amount))
      return
    }
    if (key === 'threePointersMade') {
      commitStats(addThreePointer(stats, longRangePointValue))
      return
    }
    patchStats({ [key]: stats[key] + 1 })
  }

  const handleRemoveStat = (key: BasketballStatKey, amount: 1 | 2 = 1) => {
    setSelectedStatKey(key)
    if (key === 'points') {
      commitStats(removePoints(stats, amount, longRangePointValue))
      return
    }
    if (key === 'threePointersMade') {
      commitStats(removeThreePointer(stats, longRangePointValue))
      return
    }
    patchStats({ [key]: Math.max(0, stats[key] - 1) })
  }

  const handleClearSelected = () => {
    setSelectedStatKey(selectedStatKey)
    commitStats(clearStat(stats, selectedStatKey, longRangePointValue))
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>LIVE STATS</Text>
              <RallyText style={styles.title} numberOfLines={1}>{participant?.name ?? 'Player'}</RallyText>
            </View>
            <View style={[
              styles.savePill,
              saveState === 'error' && styles.savePillError,
              saveState === 'saved' && styles.savePillSaved,
            ]}>
              <MaterialCommunityIcons
                name={saveState === 'error' ? 'alert-circle-outline' : saveState === 'saved' ? 'check-circle' : 'cloud-sync-outline'}
                size={13}
                color={saveState === 'error' ? theme.red : saveState === 'saved' ? theme.green : theme.inkSoft}
              />
              <RallyText style={[
                styles.savePillText,
                saveState === 'error' && styles.savePillTextError,
                saveState === 'saved' && styles.savePillTextSaved,
              ]}>
                {saveLabel}
              </RallyText>
            </View>
            <PressableScale
              style={styles.closeIconButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="ปิดหน้ากรอก stats"
            >
              <MaterialCommunityIcons name="close" size={18} color={theme.ink} />
            </PressableScale>
          </View>

          <View style={styles.summaryRow}>
            {statControls.map((item) => (
              <Pressable
                key={item.key}
                style={[
                  styles.summaryChip,
                  selectedStatKey === item.key && styles.summaryChipSelected,
                ]}
                onPress={() => setSelectedStatKey(item.key)}
                accessibilityRole="button"
                accessibilityLabel={`เลือก ${item.label}`}
              >
                <Text style={[
                  styles.summaryLabel,
                  selectedStatKey === item.key && styles.summaryLabelSelected,
                ]}>
                  {item.label}
                </Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </Pressable>
            ))}
          </View>

          <ActiveStatControl
            config={selectedControl}
            disabled={disabled}
            longRangePointValue={longRangePointValue}
            longShotLabel={longShotLabel}
            theme={theme}
            styles={styles}
            onAdd={(amount) => handleAddStat(selectedControl.key, amount)}
            onRemove={(amount) => handleRemoveStat(selectedControl.key, amount)}
          />

          <View style={styles.footerActions}>
            <PressableScale
              style={[styles.clearButton, (!selectedCanClear || disabled) && styles.disabledButton]}
              onPress={handleClearSelected}
              disabled={!selectedCanClear || disabled}
              accessibilityRole="button"
              accessibilityLabel={`ล้าง ${selectedStatLabel}`}
            >
              <MaterialCommunityIcons name="backspace-outline" size={15} color={theme.ink} />
              <RallyText style={styles.clearButtonText}>ล้าง {selectedStatLabel}</RallyText>
            </PressableScale>
            <PressableScale
              style={styles.doneButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="ปิดหน้ากรอก stats"
            >
              <RallyText variant="head" style={styles.doneButtonText}>ปิด</RallyText>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function ActiveStatControl({
  config,
  disabled,
  longRangePointValue,
  longShotLabel,
  theme,
  styles,
  onAdd,
  onRemove,
}: {
  config: StatControlConfig
  disabled: boolean
  longRangePointValue: number
  longShotLabel: string
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
  onAdd: (amount: 1 | 2) => void
  onRemove: (amount: 1 | 2) => void
}) {
  const isPoints = config.key === 'points'
  const removeDisabled = disabled || config.value <= 0

  return (
    <View style={styles.activePanel}>
      <View style={styles.activeHeader}>
        <View>
          <Text style={styles.activeLabel}>{config.label}</Text>
          <RallyText style={styles.activeHint}>
            {config.key === 'threePointersMade'
              ? `${longShotLabel} + เพิ่ม PTS ${longRangePointValue}`
              : config.key === 'points'
                ? `แต้มปกติ, ไม่มี +${longRangePointValue}`
                : 'เพิ่มหรือลด stat นี้'}
          </RallyText>
        </View>
        <Text style={styles.activeValue}>{config.value}</Text>
      </View>
      {isPoints ? (
        <View style={styles.pointsControls}>
          {BASKETBALL_STAT_SHEET_POINT_STEPS.map((amount) => (
            <TinyButton
              key={`minus-${amount}`}
              label={`-${amount}`}
              disabled={removeDisabled}
              styles={styles}
              onPress={() => onRemove(amount)}
            />
          ))}
          <Text style={styles.pointsValue}>{config.value}</Text>
          {BASKETBALL_STAT_SHEET_POINT_STEPS.map((amount) => (
            <TinyButton
              key={`plus-${amount}`}
              label={`+${amount}`}
              disabled={disabled}
              styles={styles}
              onPress={() => onAdd(amount)}
              accent
            />
          ))}
        </View>
      ) : (
        <View style={styles.singleControlRow}>
          <IconButton
            icon="minus"
            disabled={removeDisabled}
            theme={theme}
            styles={styles}
            onPress={() => onRemove(1)}
            label={`ลด ${config.label}`}
          />
          <Text style={styles.statValue}>{config.value}</Text>
          <IconButton
            icon="plus"
            disabled={disabled}
            theme={theme}
            styles={styles}
            onPress={() => onAdd(1)}
            label={`เพิ่ม ${config.label}`}
            accent={config.key === 'threePointersMade'}
          />
        </View>
      )}
      {config.subtractLabel ? <Text style={styles.controlNote}>{config.subtractLabel}</Text> : null}
    </View>
  )
}

function IconButton({
  icon,
  disabled,
  theme,
  styles,
  onPress,
  label,
  accent = false,
}: {
  icon: 'plus' | 'minus'
  disabled: boolean
  theme: SportPalette
  styles: ReturnType<typeof createStyles>
  onPress: () => void
  label: string
  accent?: boolean
}) {
  return (
    <PressableScale
      style={[styles.iconButton, accent && styles.iconButtonAccent, disabled && styles.iconButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <MaterialCommunityIcons
        name={icon}
        size={17}
        color={disabled ? theme.inkSoft : accent ? theme.bg : theme.ink}
      />
    </PressableScale>
  )
}

function TinyButton({
  label,
  disabled,
  accent = false,
  styles,
  onPress,
}: {
  label: string
  disabled: boolean
  accent?: boolean
  styles: ReturnType<typeof createStyles>
  onPress: () => void
}) {
  return (
    <PressableScale
      style={[styles.tinyButton, accent && styles.tinyButtonAccent, disabled && styles.iconButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} PTS`}
    >
      <Text style={[styles.tinyButtonText, accent && styles.tinyButtonTextAccent]}>{label}</Text>
    </PressableScale>
  )
}

function statLabelFor(key: BasketballStatKey, longShotLabel: string): string {
  if (key === 'points') return 'PTS'
  if (key === 'rebounds') return 'REB'
  if (key === 'assists') return 'AST'
  if (key === 'blocks') return 'BLK'
  return longShotLabel
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.70)',
  },
  sheet: {
    width: '100%',
    maxWidth: 342,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(235,119,60,0.46)',
    backgroundColor: theme.bgElevated,
    padding: Spacing.md,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: theme.line,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: theme.amber,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    marginTop: 2,
  },
  savePill: {
    minHeight: 26,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#242424',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  savePillSaved: {
    borderColor: `${theme.green}6b`,
    backgroundColor: theme.greenSoft,
  },
  savePillError: {
    borderColor: 'rgba(199,63,65,0.42)',
    backgroundColor: theme.redSoft,
  },
  savePillText: {
    color: theme.inkSoft,
    fontSize: 10,
  },
  savePillTextSaved: {
    color: theme.greenVivid,
  },
  savePillTextError: {
    color: theme.red,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 5,
  },
  summaryChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryChipSelected: {
    borderColor: theme.orange,
    backgroundColor: '#2b2b2b',
  },
  summaryLabel: {
    color: theme.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  summaryLabelSelected: {
    color: theme.orange,
  },
  summaryValue: {
    color: theme.ink,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  disabledButton: {
    opacity: 0.5,
  },
  activePanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#242424',
    padding: 12,
    gap: 10,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  activeLabel: {
    color: theme.orange,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  activeHint: {
    color: theme.inkSoft,
    fontSize: 10,
    marginTop: 2,
  },
  activeValue: {
    minWidth: 56,
    color: theme.ink,
    textAlign: 'right',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  pointsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  pointsValue: {
    flex: 1,
    color: theme.ink,
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  singleControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statValue: {
    minWidth: 40,
    color: theme.ink,
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  controlNote: {
    color: theme.inkSoft,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303030',
    borderWidth: 1,
    borderColor: theme.line,
  },
  iconButtonAccent: {
    backgroundColor: theme.orange,
    borderColor: theme.orange,
  },
  iconButtonDisabled: {
    opacity: 0.45,
  },
  tinyButton: {
    minWidth: 46,
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyButtonAccent: {
    borderColor: theme.orange,
    backgroundColor: theme.orange,
  },
  tinyButtonText: {
    color: theme.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  tinyButtonTextAccent: {
    color: theme.bg,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303030',
    borderWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    gap: 6,
  },
  clearButtonText: {
    color: theme.ink,
    fontSize: 12,
  },
  doneButton: {
    minWidth: 108,
    minHeight: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.orange,
  },
  doneButtonText: {
    color: theme.bg,
    fontSize: 13,
  },
})
}
