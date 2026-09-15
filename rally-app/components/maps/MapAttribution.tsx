import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'

type MapAttributionProps = {
  /** Credit string, e.g. "© OpenStreetMap contributors, OpenFreeMap". */
  attribution: string
  /** Which bottom corner to pin to. Defaults to the right. */
  corner?: 'left' | 'right'
  /** Optional offset override (e.g. to clear floating controls). */
  style?: StyleProp<ViewStyle>
}

/**
 * Minimal map credit overlay. OpenStreetMap's ODbL license requires the
 * attribution be visible to users; the native MapLibre control is disabled
 * (`attribution={false}`) in favour of this branded, theme-neutral pill so
 * the credit reads on any tile style.
 */
export function MapAttribution({ attribution, corner = 'right', style }: MapAttributionProps) {
  return (
    <View
      pointerEvents="none"
      style={[styles.container, corner === 'left' ? styles.left : styles.right, style]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {attribution}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 6,
    maxWidth: '90%',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  left: { left: 6 },
  right: { right: 6 },
  text: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 10,
    fontWeight: '500',
  },
})
