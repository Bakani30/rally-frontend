import { Platform, StyleSheet, View, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileAccent, ProfileOnAccent } from '@/components/profile/profileColors'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type ProfileEntryGridViewProps = {
  checkinOpen: boolean
  checkedInToday: boolean
  onOpenReferee: () => void
  onToggleCheckin: () => void
  onOpenCosmetics: () => void
}

/** Presentation-only profile entry grid. */
export function ProfileEntryGridView({ checkinOpen, checkedInToday, onOpenReferee, onToggleCheckin, onOpenCosmetics }: ProfileEntryGridViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.row}>
      <EntryCard bg={ProfileAccent.indigo} fg={ProfileOnAccent.onColor} icon="whistle-outline" title="Referee" subtitle="ผู้ตัดสิน" accessibilityLabel="ผู้ตัดสิน" onPress={onOpenReferee} styles={styles} />
      <EntryCard bg={ProfileAccent.orange} fg={ProfileOnAccent.onColor} icon={checkedInToday ? 'star' : 'star-outline'} title="Check-in" subtitle="เช็คอิน" accessibilityLabel="เช็คอินรายวัน" expanded={checkinOpen} onPress={onToggleCheckin} styles={styles} />
      <EntryCard bg={ProfileAccent.yellow} fg={ProfileOnAccent.onLight} icon="hanger" title="Cosmetics" subtitle="ตกแต่งโปรไฟล์" accessibilityLabel="ไอเทมตกแต่ง" onPress={onOpenCosmetics} styles={styles} />
    </View>
  )
}

type EntryCardProps = { bg: string; fg: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string; accessibilityLabel: string; onPress: () => void; expanded?: boolean; styles: ReturnType<typeof createStyles> }
function EntryCard({ bg, fg, icon, title, subtitle, accessibilityLabel, onPress, expanded, styles }: EntryCardProps) {
  return <PressableScale style={[styles.card, { backgroundColor: bg }, expanded ? styles.cardActive : null]} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={expanded === undefined ? undefined : { expanded }}><View style={styles.iconCircle}><MaterialCommunityIcons name={icon} size={20} color={fg} /></View><RallyText variant="head" lang="en" style={[styles.title, { color: fg }]} numberOfLines={1}>{title}</RallyText><RallyText variant="body" style={[styles.sub, { color: fg }]} numberOfLines={1}>{subtitle}</RallyText></PressableScale>
}

function createStyles(theme: SportPalette) { return StyleSheet.create({ row: { flexDirection: 'row', gap: Spacing.sm, width: '100%' }, card: { flex: 1, minHeight: 104, borderRadius: Radius.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, gap: 6, ...cardShadow() }, cardActive: { borderWidth: 2, borderColor: theme.ink }, iconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.24)' }, title: { fontSize: 13, fontWeight: '900', letterSpacing: 0.2, marginTop: 2 }, sub: { fontSize: 10, fontWeight: '500', opacity: 0.92 } }) }
function cardShadow(): ViewStyle { return Platform.OS === 'web' ? { boxShadow: '0 4px 10px rgba(0,0,0,0.14)' } as unknown as ViewStyle : { shadowColor: 'rgba(0,0,0,0.5)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 } }
