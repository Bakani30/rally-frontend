import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

export type ProfileShortcutRowViewProps = {
  onOpenMatches: () => void
  onOpenWallet: () => void
}

/** Presentation-only shortcut row. */
export function ProfileShortcutRowView({ onOpenMatches, onOpenWallet }: ProfileShortcutRowViewProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  return (
    <View style={styles.row}>
      <ShortcutCard label="แมตช์" title="Matches" icon="sword-cross" color={theme.red} onPress={onOpenMatches} styles={styles} />
      <ShortcutCard label="วอลเล็ต" title="Wallet" icon="wallet-outline" color={theme.blue} onPress={onOpenWallet} styles={styles} />
    </View>
  )
}

type ShortcutCardProps = {
  label: string
  title: string
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  color: string
  onPress: () => void
  styles: ReturnType<typeof createStyles>
}

function ShortcutCard({ label, title, icon, color, onPress, styles }: ShortcutCardProps) {
  const theme = useSportTheme()
  return (
    <PressableScale style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <View style={styles.labelBox}>
        <RallyText variant="head" lang="en" style={styles.label} numberOfLines={1}>{title}</RallyText>
        <RallyText variant="body" style={styles.sub} numberOfLines={1}>{label}</RallyText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.mutedSoft} />
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
    card: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 48, paddingHorizontal: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface },
    labelBox: { flex: 1 },
    label: { color: theme.inkSoft, fontSize: 13, letterSpacing: 0.6 },
    sub: { color: theme.muted, fontSize: 10, fontWeight: '500' },
  })
}
