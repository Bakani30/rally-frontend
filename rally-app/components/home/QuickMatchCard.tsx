import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { RallyText } from '@/components/ui/RallyText'
import { OnAccent, Radius, ShortcutAccent } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type QuickMatchCardProps = {
  label: string | null
  busy: boolean
  onPress: () => void
  onLongPress: () => void
  variant?: 'home' | 'compact'
}

const FALLBACK_LABEL = 'ตั้งค่าแมตช์แรก'

// Solid-accent color model (Profile anchor): a single vivid orange tile with
// fixed-contrast foreground, matching HomeShortcutRail's tile conventions.
export function QuickMatchCard({ label, busy, onPress, onLongPress, variant = 'home' }: QuickMatchCardProps) {
  const compact = variant === 'compact'
  const theme = useSportTheme()
  const fg = compact ? theme.arcadeCtaText : OnAccent.onColor

  return (
    <PressableScale
      style={[
        styles.tile,
        compact ? [styles.tileCompact, { backgroundColor: theme.green }] : styles.tileHome,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel="แมตช์ด่วน"
      disabled={busy}
    >
      <View style={styles.iconPlate}>
        {busy ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <MaterialCommunityIcons name="lightning-bolt" size={compact ? 18 : 22} color={fg} />
        )}
      </View>
      <View style={styles.copy}>
        <RallyText
          variant="head"
          style={[styles.heading, { color: fg }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          แมตช์ด่วน
        </RallyText>
        <RallyText
          variant="body"
          style={[styles.subtitle, { color: fg }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label ?? FALLBACK_LABEL}
        </RallyText>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.xl,
    backgroundColor: ShortcutAccent.orange,
  },
  tileHome: {
    minHeight: 72,
    padding: 14,
  },
  tileCompact: {
    minHeight: 56,
    padding: 11,
    borderRadius: Radius.lg,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  // NO fontWeight/lineHeight here: "แมตช์ด่วน" is Thai text with combining
  // marks (สระ/วรรณยุกต์) that iOS drops when the line box is squeezed by an
  // explicit lineHeight or the wrong weight metrics — see
  // project_thai_lineheight_drops_marks memory. Weight comes from the
  // "head" variant's font family (RallyText), not fontWeight.
  heading: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.92,
  },
})
