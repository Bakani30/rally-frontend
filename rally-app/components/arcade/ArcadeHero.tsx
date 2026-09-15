import { Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Arcade, Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ArcadeHeroProps = {
  spendablePoints: number
  streakDays: number
  onPress: () => void
}

const HERO_MIN_HEIGHT = 152

export function ArcadeHero({ spendablePoints, streakDays, onPress }: ArcadeHeroProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <PressableScale
      style={styles.shadow}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open wallet spendable points"
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
    >
      <View style={styles.card}>
        <View style={styles.surfaceField} />

        <View style={styles.copy}>
          <View style={styles.scorePanel}>
            <View style={styles.scorePanelInner}>
              <View style={styles.cardTopRow}>
                <View style={styles.pointsIconPlate}>
                  <MaterialCommunityIcons name="cash-multiple" size={16} color={theme.economy} />
                </View>
                <Text style={styles.pointsLabel}>RALLY VAULT</Text>
              </View>
              <View style={styles.pointsValueRow}>
                <Text style={styles.pointsNumber} numberOfLines={1} adjustsFontSizeToFit>
                  {spendablePoints.toLocaleString()}
                </Text>
                <Text style={styles.pointsUnit}>PTS</Text>
              </View>
              <View style={styles.bottomRow}>
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill} />
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaPill}>
                    <MaterialCommunityIcons name="fire" size={13} color={theme.economy} />
                    <Text style={styles.metaPillText}>{streakDays}</Text>
                  </View>
                  <View style={styles.seasonBadge}>
                    <MaterialCommunityIcons name="trending-up" size={13} color={theme.blue} />
                    <Text style={styles.seasonText}>S1</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </PressableScale>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    shadow: {
      borderRadius: Radius.xxl,
      ...Platform.select({
        web: { boxShadow: `10px 12px 0 ${theme.arcadeShadow}` },
        default: {
          shadowColor: theme.arcadeCabinetEdge,
          shadowOffset: Arcade.shadow.hardOffset,
          shadowOpacity: 0.36,
          shadowRadius: Arcade.shadow.radius,
          elevation: 8,
        },
      }),
    },
    card: {
      minHeight: HERO_MIN_HEIGHT,
      overflow: 'hidden',
      borderRadius: Radius.xxl,
      borderWidth: Arcade.border.hero + 1,
      borderColor: theme.arcadeCabinetEdge,
      backgroundColor: theme.arcadeCabinet,
      padding: 14,
    },
    surfaceField: {
      position: 'absolute',
      left: 5,
      right: 5,
      top: 5,
      bottom: 5,
      borderRadius: Radius.xxl - 6,
      borderWidth: 1,
      borderColor: theme.economy,
      backgroundColor: theme.fightPanel,
    },
    copy: {
      minHeight: HERO_MIN_HEIGHT - 28,
      justifyContent: 'center',
      paddingRight: 0,
    },
    scorePanel: {
      alignSelf: 'stretch',
      minHeight: HERO_MIN_HEIGHT - 28,
      paddingHorizontal: 18,
      paddingVertical: 15,
      borderRadius: Radius.lg,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    scorePanelInner: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 7,
    },
    cardTopRow: {
      minHeight: 31,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    pointsIconPlate: {
      width: 34,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.arcadeCabinet,
      borderWidth: 1,
      borderColor: theme.economy,
    },
    pointsLabel: {
      color: theme.fightInk,
      flexShrink: 1,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 1.4,
      textAlign: 'right',
      textTransform: 'uppercase',
    },
    pointsValueRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingLeft: 2,
    },
    pointsNumber: {
      flexShrink: 1,
      color: theme.economy,
      fontSize: 50,
      lineHeight: 52,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    pointsUnit: {
      color: theme.economy,
      fontSize: 16,
      lineHeight: 30,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    bottomRow: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: Radius.pill,
      backgroundColor: theme.fightLine,
      overflow: 'hidden',
    },
    progressFill: {
      width: '72%',
      height: '100%',
      borderRadius: Radius.pill,
      backgroundColor: theme.orange,
    },
    metaRow: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaPill: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.fightLine,
      backgroundColor: theme.arcadeCabinet,
    },
    metaPillText: {
      color: theme.economy,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    seasonBadge: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.blue,
      backgroundColor: theme.arcadeCabinet,
    },
    seasonText: {
      color: theme.blue,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.4,
    },
  })
}
