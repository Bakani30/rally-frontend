import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg'

import { RallyPalette } from '@/constants/theme'
import type { ElevationProfile } from '@/lib/replay/replayPath'

/**
 * Elevation-vs-distance strip for the replay screen. Fills toward the current
 * progress and marks the runner's position, mirroring the sample-video chart.
 * Rendered only when the run carries altitude (iOS); the parent hides it
 * otherwise.
 */

type ReplayElevationChartProps = {
  profile: ElevationProfile
  progressDistanceMeters: number
  totalMeters: number
  width: number
  height?: number
}

const H_PAD = 6
const V_PAD = 10

function interpolateAltitude(
  samples: ElevationProfile['samples'],
  distance: number,
): number {
  if (samples.length === 0) return 0
  if (distance <= samples[0].distanceMeters) return samples[0].altitude
  const last = samples[samples.length - 1]
  if (distance >= last.distanceMeters) return last.altitude
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]
    const b = samples[i]
    if (distance <= b.distanceMeters) {
      const span = b.distanceMeters - a.distanceMeters
      const frac = span > 0 ? (distance - a.distanceMeters) / span : 0
      return a.altitude + (b.altitude - a.altitude) * frac
    }
  }
  return last.altitude
}

export function ReplayElevationChart({
  profile,
  progressDistanceMeters,
  totalMeters,
  width,
  height = 64,
}: ReplayElevationChartProps) {
  const { linePoints, fillPath, cursor } = useMemo(() => {
    const { samples, minAltitude, maxAltitude } = profile
    const innerW = Math.max(1, width - H_PAD * 2)
    const innerH = Math.max(1, height - V_PAD * 2)
    const range = maxAltitude - minAltitude || 1
    const span = totalMeters || 1

    const toX = (d: number) => H_PAD + (d / span) * innerW
    const toY = (alt: number) => V_PAD + innerH - ((alt - minAltitude) / range) * innerH

    const pts = samples.map((s) => `${toX(s.distanceMeters).toFixed(1)},${toY(s.altitude).toFixed(1)}`)
    const line = pts.join(' ')

    const clampedProgress = Math.max(0, Math.min(progressDistanceMeters, span))
    const cursorX = toX(clampedProgress)
    const cursorY = toY(interpolateAltitude(samples, clampedProgress))

    // Fill under the revealed portion only.
    const revealed = samples.filter((s) => s.distanceMeters <= clampedProgress)
    const fillPts = revealed.map((s) => `${toX(s.distanceMeters).toFixed(1)} ${toY(s.altitude).toFixed(1)}`)
    let fill = ''
    if (fillPts.length > 0) {
      const startX = toX(revealed[0].distanceMeters).toFixed(1)
      const baseY = (height - V_PAD).toFixed(1)
      fill =
        `M ${startX} ${baseY} ` +
        fillPts.map((p) => `L ${p}`).join(' ') +
        ` L ${cursorX.toFixed(1)} ${cursorY.toFixed(1)}` +
        ` L ${cursorX.toFixed(1)} ${baseY} Z`
    }

    return { linePoints: line, fillPath: fill, cursor: { x: cursorX, y: cursorY } }
  }, [profile, progressDistanceMeters, totalMeters, width, height])

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {fillPath ? <Path d={fillPath} fill="rgba(31,122,224,0.18)" /> : null}
        <Polyline
          points={linePoints}
          fill="none"
          stroke="rgba(90,107,99,0.55)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Line x1={cursor.x} y1={V_PAD} x2={cursor.x} y2={height - V_PAD} stroke="rgba(31,122,224,0.4)" strokeWidth={1} />
        <Circle cx={cursor.x} cy={cursor.y} r={4} fill={RallyPalette.blue} stroke="#ffffff" strokeWidth={1.5} />
      </Svg>
      <View style={styles.labels} pointerEvents="none">
        <Text style={styles.label}>{Math.round(profile.maxAltitude)} m</Text>
        <Text style={styles.label}>{Math.round(profile.minAltitude)} m</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  labels: {
    position: 'absolute',
    right: 8,
    top: 4,
    bottom: 4,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: { color: '#5a6b63', fontSize: 10, fontWeight: '700' },
})
