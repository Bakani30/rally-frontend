import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { PIN_CAP } from '@/lib/match/pinnedMatchConfig'
import type { ProfilePinnedMatch } from '@/lib/match/featuredMatchTypes'

export type ProfileFeaturedMatchViewProps = {
  pins: ProfilePinnedMatch[]
  isOwner?: boolean
  onOpenPinPicker?: () => void
  renderMatch?: (pin: ProfilePinnedMatch) => ReactNode
  renderHighlight?: (pin: ProfilePinnedMatch, index: number) => ReactNode
}

/** Shared pinned-match presentation. Media behavior is injected by the production adapter. */
export function ProfileFeaturedMatchView({
  pins,
  isOwner = false,
  onOpenPinPicker,
  renderMatch,
  renderHighlight,
}: ProfileFeaturedMatchViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const visiblePins = pins.slice(0, PIN_CAP)
  if (visiblePins.length === 0 && !isOwner) return null
  const hasRoomToPin = isOwner && visiblePins.length < PIN_CAP
  return (
    <View style={styles.section}>
      <RallyText variant="head" lang="en" style={styles.titleEn}>Pinned matches</RallyText>
      <RallyText variant="body" style={styles.titleTh}>แมตช์ที่ปักหมุด · สูงสุด {PIN_CAP}</RallyText>
      <View style={styles.list}>
        {visiblePins.map((pin, index) => (
          <View key={pin.matchId} style={styles.pinItem}>
            {renderMatch?.(pin)}
            {renderHighlight?.(pin, index)}
          </View>
        ))}
        {hasRoomToPin && onOpenPinPicker ? (
          <PressableScale style={styles.addSlot} onPress={onOpenPinPicker} accessibilityRole="button" accessibilityLabel="ปักหมุดแมตช์จากประวัติ">
            <RallyText variant="head" lang="en" style={styles.addSlotEn}>+ Pin a match</RallyText>
            <RallyText variant="body" style={styles.addSlotTh}>ปักหมุดจากประวัติ</RallyText>
          </PressableScale>
        ) : null}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: { width: 360, maxWidth: '100%', alignSelf: 'stretch' },
    titleEn: { color: theme.ink, fontSize: 17, fontWeight: '900', fontStyle: 'italic' },
    titleTh: { color: theme.muted, fontSize: 11, fontWeight: '500', marginTop: 2, marginBottom: Spacing.sm },
    list: { gap: Spacing.sm },
    pinItem: { gap: Spacing.sm },
    addSlot: { minHeight: 44, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.line, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, gap: 2 },
    addSlotEn: { color: theme.muted, fontSize: 13, fontWeight: '900', fontStyle: 'italic' },
    addSlotTh: { color: theme.mutedSoft, fontSize: 10, fontWeight: '500' },
  })
}
