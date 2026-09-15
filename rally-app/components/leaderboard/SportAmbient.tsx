import { Platform, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Drifter } from '@/components/motion/Drifter'
import { ActivityColor } from '@/constants/theme'
import type { LeaderboardCategory } from '@/lib/leaderboard/leaderboardConfig'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

type Mote = {
  kind: 'icon' | 'streak'
  icon?: IconName
  left: `${number}%`
  top: `${number}%`
  size: number
  color: string
  bobY: number
  driftX: number
  rotateDeg: number
  durationMs: number
  delayMs: number
}

function fade(hex: string, a: number): string {
  const v = Math.max(0, Math.min(255, Math.round(a * 255)))
  return `${hex}${v.toString(16).padStart(2, '0')}`
}

const BASKETBALL: Mote[] = [
  { kind: 'icon', icon: 'basketball', left: '8%', top: '16%', size: 30, color: fade(ActivityColor.basketball, 0.09), bobY: 12, driftX: 8, rotateDeg: 18, durationMs: 5200, delayMs: 0 },
  { kind: 'icon', icon: 'basketball', left: '78%', top: '26%', size: 22, color: fade(ActivityColor.basketball, 0.07), bobY: 9, driftX: 7, rotateDeg: 22, durationMs: 6100, delayMs: 600 },
  { kind: 'icon', icon: 'basketball', left: '62%', top: '64%', size: 34, color: fade(ActivityColor.basketball, 0.08), bobY: 14, driftX: 9, rotateDeg: 16, durationMs: 5600, delayMs: 1200 },
  { kind: 'icon', icon: 'basketball', left: '18%', top: '78%', size: 24, color: fade(ActivityColor.basketball, 0.07), bobY: 10, driftX: 8, rotateDeg: 20, durationMs: 6400, delayMs: 300 },
  { kind: 'icon', icon: 'basketball', left: '40%', top: '40%', size: 20, color: fade(ActivityColor.basketball, 0.06), bobY: 8, driftX: 6, rotateDeg: 24, durationMs: 5900, delayMs: 1800 },
]

const RUNNING: Mote[] = [
  { kind: 'streak', left: '6%', top: '20%', size: 84, color: fade(ActivityColor.running, 0.1), bobY: 4, driftX: 26, rotateDeg: 0, durationMs: 3600, delayMs: 0 },
  { kind: 'streak', left: '52%', top: '32%', size: 62, color: fade(ActivityColor.running, 0.08), bobY: 3, driftX: 30, rotateDeg: 0, durationMs: 3200, delayMs: 500 },
  { kind: 'streak', left: '20%', top: '48%', size: 96, color: fade(ActivityColor.running, 0.07), bobY: 4, driftX: 34, rotateDeg: 0, durationMs: 4000, delayMs: 1100 },
  { kind: 'streak', left: '60%', top: '60%', size: 70, color: fade(ActivityColor.running, 0.09), bobY: 3, driftX: 28, rotateDeg: 0, durationMs: 3400, delayMs: 200 },
  { kind: 'streak', left: '12%', top: '74%', size: 80, color: fade(ActivityColor.running, 0.07), bobY: 4, driftX: 32, rotateDeg: 0, durationMs: 3800, delayMs: 1500 },
  { kind: 'streak', left: '46%', top: '86%', size: 58, color: fade(ActivityColor.running, 0.06), bobY: 3, driftX: 24, rotateDeg: 0, durationMs: 3000, delayMs: 800 },
]

const BADMINTON: Mote[] = [
  { kind: 'icon', icon: 'badminton', left: '12%', top: '18%', size: 28, color: fade(ActivityColor.badminton, 0.1), bobY: 16, driftX: 10, rotateDeg: 26, durationMs: 5000, delayMs: 0 },
  { kind: 'icon', icon: 'badminton', left: '74%', top: '30%', size: 22, color: fade(ActivityColor.badminton, 0.08), bobY: 14, driftX: 9, rotateDeg: 30, durationMs: 5800, delayMs: 700 },
  { kind: 'icon', icon: 'badminton', left: '56%', top: '62%', size: 32, color: fade(ActivityColor.badminton, 0.09), bobY: 18, driftX: 11, rotateDeg: 22, durationMs: 5400, delayMs: 1300 },
  { kind: 'icon', icon: 'badminton', left: '24%', top: '80%', size: 24, color: fade(ActivityColor.badminton, 0.07), bobY: 15, driftX: 9, rotateDeg: 28, durationMs: 6000, delayMs: 400 },
  { kind: 'icon', icon: 'badminton', left: '42%', top: '44%', size: 20, color: fade(ActivityColor.badminton, 0.06), bobY: 12, driftX: 8, rotateDeg: 32, durationMs: 5600, delayMs: 1900 },
]

const MOTES: Record<LeaderboardCategory, Mote[]> = {
  basketball: BASKETBALL,
  running: RUNNING,
  badminton: BADMINTON,
}

type SportAmbientProps = {
  activity: LeaderboardCategory
}

/**
 * Subtle per-sport background motion behind the ranking content. Low-opacity
 * motes drift slowly so they read as arena ambiance without competing with the
 * leaderboard. Decorative, non-interactive, trimmed on Android for battery.
 */
export function SportAmbient({ activity }: SportAmbientProps) {
  const all = MOTES[activity]
  // Trim the herd on Android to keep the UI thread light.
  const motes = Platform.OS === 'android' ? all.filter((_, i) => i % 3 !== 2) : all

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {motes.map((mote, index) => (
        <Drifter
          key={`${activity}:${index}`}
          style={{ position: 'absolute', left: mote.left, top: mote.top }}
          bobY={mote.bobY}
          driftX={mote.driftX}
          rotateDeg={mote.rotateDeg}
          durationMs={mote.durationMs}
          delayMs={mote.delayMs}
        >
          {mote.kind === 'icon' && mote.icon ? (
            <MaterialCommunityIcons name={mote.icon} size={mote.size} color={mote.color} />
          ) : (
            <View style={{ width: mote.size, height: 3, borderRadius: 2, backgroundColor: mote.color }} />
          )}
        </Drifter>
      ))}
    </View>
  )
}
