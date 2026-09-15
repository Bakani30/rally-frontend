import { View } from 'react-native'
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg'
import type { SportPalette } from '@/constants/theme'
import type { StatHexAxis } from '@/lib/coach/analysis/basketballStatHexagon'

type StatHexagonRadarProps = {
  axes: StatHexAxis[]
  theme: SportPalette
  size?: number
  showLabels?: boolean
  surface?: 'dark' | 'light' | 'mono'
  accent?: string
}

type RadarColors = {
  ring: string
  spoke: string
  comparison: string
  polygon: string
  polygonFill: string
  dot: string
  dotStroke: string
  label: string
}

function radarColors(theme: SportPalette, surface: 'dark' | 'light' | 'mono'): RadarColors {
  if (surface === 'mono') {
    return {
      ring: '#d9d6cd',
      spoke: '#e6e3da',
      comparison: '#b4b2a9',
      polygon: '#161616',
      polygonFill: 'rgba(22,22,22,0.10)',
      dot: '#161616',
      dotStroke: '#ffffff',
      label: '#161616',
    }
  }
  if (surface === 'light') {
    return {
      ring: '#d9d6cd',
      spoke: '#ebe8df',
      comparison: '#b4b2a9',
      polygon: theme.orange,
      polygonFill: `${theme.orange}38`,
      dot: theme.orange,
      dotStroke: '#ffffff',
      label: '#161616',
    }
  }
  return {
    ring: theme.line,
    spoke: theme.line,
    comparison: theme.inkSoft,
    polygon: theme.orange,
    polygonFill: `${theme.orange}44`,
    dot: theme.amber,
    dotStroke: theme.bg,
    label: theme.ink,
  }
}

function point(index: number, total: number, center: number, radius: number): string {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total
  return `${Number((center + Math.cos(angle) * radius).toFixed(1))},${Number((center + Math.sin(angle) * radius).toFixed(1))}`
}

// Missing axes would otherwise collapse to the exact center (score 0),
// which reads as a broken/degenerate polygon rather than a partial stat
// line. Floor them at a small radius so the shape still reads as a chart.
const MISSING_AXIS_FLOOR = 0.08

function axisRadiusScale(axis: StatHexAxis): number {
  return axis.state === 'missing' ? MISSING_AXIS_FLOOR : axis.score / 100
}

export function StatHexagonRadar({ axes, theme, size = 300, showLabels = true, surface = 'dark', accent }: StatHexagonRadarProps) {
  const base = radarColors(theme, surface)
  const c: RadarColors = accent
    ? { ...base, polygon: accent, polygonFill: `${accent}38`, dot: accent }
    : base
  const center = size / 2
  const radius = size * (showLabels ? 0.34 : 0.42)
  const n = axes.length
  const ring = (scale: number) => axes.map((_, i) => point(i, n, center, radius * scale)).join(' ')
  const thisMatch = axes.map((a, i) => point(i, n, center, radius * axisRadiusScale(a))).join(' ')
  const comparison = axes.map((a, i) => point(i, n, center, radius * ((a.comparisonScore ?? a.score) / 100))).join(' ')

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Polygon points={ring(1)} fill="none" stroke={c.ring} strokeWidth="1.2" />
        <Polygon points={ring(0.66)} fill="none" stroke={c.spoke} strokeWidth="1" />
        <Polygon points={ring(0.33)} fill="none" stroke={c.spoke} strokeWidth="1" />
        {axes.map((a, i) => {
          const [x, y] = point(i, n, center, radius).split(',')
          return <Line key={`spoke-${a.key}`} x1={center} y1={center} x2={x} y2={y} stroke={c.spoke} strokeWidth="1" />
        })}
        <Polygon points={comparison} fill="none" stroke={c.comparison} strokeWidth="1.5" strokeDasharray="4 4" />
        <Polygon points={thisMatch} fill={c.polygonFill} stroke={c.polygon} strokeWidth="3" />
        {axes.map((a, i) => {
          const [x, y] = point(i, n, center, radius * axisRadiusScale(a)).split(',')
          const missing = a.state === 'missing'
          return (
            <Circle
              key={`dot-${a.key}`}
              cx={x}
              cy={y}
              r={4}
              fill={missing ? 'none' : c.dot}
              stroke={missing ? c.dot : c.dotStroke}
              strokeWidth="2"
              opacity={missing ? 0.4 : 1}
            />
          )
        })}
        {showLabels && axes.map((a, i) => {
          const [lx, ly] = point(i, n, center, radius + size * 0.07).split(',')
          return (
            <SvgText key={`label-${a.key}`} x={lx} y={Number(ly)} fill={c.label} fontSize={size * 0.042} fontWeight="900" textAnchor="middle">
              {a.rpgLabel}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  )
}
