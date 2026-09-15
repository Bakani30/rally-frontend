import { memo, useEffect, useId, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Pattern,
  Polygon,
  Polyline,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg'

// ============================================================
// Cyberpunk Title Frame — built to the Rally "cosmetic motion budget":
//   1. a crisp STATIC SVG base that renders ONCE (memoized, no per-frame
//      SVG mutation, no SVG filters), and
//   2. exactly ONE cheap ambient animation — a scan-sweep rendered as a
//      GPU-composited <Animated.View> overlay (UI-thread transform/opacity).
//
// This is intentionally light enough to render many at once (e.g. every
// lobby marker) with a SINGLE representation everywhere — no per-context
// variants. Premium feel comes from crisp detail + the (separate) unlock
// reveal moment + social visibility, not from constant heavy motion.
// See skills/cosmetics-profile/SKILL.md → "Cosmetic motion budget".
// ============================================================

type CyberpunkTitleFrameProps = {
  title: string
  width?: number
  accentColor?: string
  glitchIntensity?: number
  variant?: 'full' | 'compact'
}

const CYAN = '#00e7ff'
const DEFAULT_ACCENT = '#FF1F3D'

// Source polygon point strings (1600x600 space).
const FRONT = '476,222 1124,222 1158,256 1158,344 1124,378 476,378 442,344 442,256'
const BACK = '462,210 1138,210 1176,250 1176,350 1138,390 462,390 424,350 424,250'
const INNER = '492,236 1108,236 1138,262 1138,338 1108,364 492,364 462,338 462,262'
const DIAMOND = '800,150 844,194 800,238 756,194'
const DIAMOND_INNER = '800,164 830,194 800,224 770,194'

const VIEWBOX = {
  full: { x: 288, y: 140, w: 1024, h: 320 },
  compact: { x: 424, y: 206, w: 752, h: 188 },
} as const

const CHEVRON_Y = [278, 292, 306, 320]

export const CyberpunkTitleFrame = memo(function CyberpunkTitleFrame({
  title,
  width = 240,
  accentColor = DEFAULT_ACCENT,
  variant = 'full',
}: CyberpunkTitleFrameProps) {
  const vb = VIEWBOX[variant]
  const height = width * (vb.h / vb.w)
  const accent = accentColor || DEFAULT_ACCENT
  const full = variant === 'full'
  const text = (title || '').toUpperCase()

  // SVG-safe per-instance id prefix (useId returns colons).
  const rawId = useId()
  const id = useMemo(() => {
    const u = rawId.replace(/[^a-zA-Z0-9]/g, '')
    return {
      plate: `cpPlate_${u}`,
      edge: `cpEdge_${u}`,
      energy: `cpEnergy_${u}`,
      scan: `cpScan_${u}`,
      hazard: `cpHazard_${u}`,
      clip: `cpClip_${u}`,
    }
  }, [rawId])

  // The ONE ambient animation: a scan band sweeping top→bottom. It is a plain
  // composited view (UI thread), so the static SVG below is never re-rendered.
  const sweep = useSharedValue(0)
  const bandHeight = Math.max(6, height * 0.16)
  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.linear }),
      -1,
      false,
    )
  }, [sweep])
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(sweep.value, [0, 1], [0, height + bandHeight]) }],
  }))

  return (
    <View style={[styles.root, { width, height }]}>
      <Svg width={width} height={height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        <Defs>
          <LinearGradient id={id.plate} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2a0810" />
            <Stop offset="0.35" stopColor="#120207" />
            <Stop offset="1" stopColor="#030001" />
          </LinearGradient>
          <LinearGradient id={id.edge} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ff5b6e" />
            <Stop offset="0.5" stopColor="#e01030" />
            <Stop offset="1" stopColor="#7a0418" />
          </LinearGradient>
          <RadialGradient id={id.energy} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={accent} stopOpacity={0.55} />
            <Stop offset="0.5" stopColor="#c0001f" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#c0001f" stopOpacity={0} />
          </RadialGradient>
          <Pattern id={id.scan} width="6" height="6" patternUnits="userSpaceOnUse">
            <Rect width="6" height="6" fill="transparent" />
            <Rect width="6" height="1.4" y="0" fill="#000" opacity={0.55} />
          </Pattern>
          <Pattern id={id.hazard} width="22" height="22" patternUnits="userSpaceOnUse">
            <Path d="M-6 22 L22 -6 M2 30 L30 2" stroke={accent} strokeWidth={6} opacity={0.18} />
          </Pattern>
          <ClipPath id={id.clip}>
            <Polygon points={FRONT} />
          </ClipPath>
        </Defs>

        {/* energy field (radial gradient — soft without a blur filter) */}
        <Ellipse cx={800} cy={300} rx={440} ry={150} fill={`url(#${id.energy})`} opacity={0.8} />

        {full && (
          <>
            {/* static RGB ghost plate outlines (chromatic aberration) */}
            <Polygon points={FRONT} fill="none" stroke={CYAN} strokeWidth={2} opacity={0.5} transform="translate(-4,1)" />
            <Polygon points={FRONT} fill="none" stroke={accent} strokeWidth={2} opacity={0.5} transform="translate(4,-1)" />
          </>
        )}

        {/* back plate + side notches */}
        <Polygon points={BACK} fill="#0a0103" stroke={`url(#${id.edge})`} strokeWidth={2} opacity={0.9} />
        <G fill="#150206" stroke={`url(#${id.edge})`} strokeWidth={2}>
          <Polygon points="442,272 408,300 442,328" />
          <Polygon points="1158,272 1192,300 1158,328" />
        </G>

        {/* front plate */}
        <Polygon points={FRONT} fill={`url(#${id.plate})`} stroke={`url(#${id.edge})`} strokeWidth={3} />

        {/* clipped interior texture (all static) */}
        <G clipPath={`url(#${id.clip})`}>
          <Rect x={442} y={222} width={716} height={156} fill={`url(#${id.hazard})`} opacity={0.5} />
          <Rect x={442} y={222} width={716} height={156} fill={`url(#${id.scan})`} opacity={0.5} />
          <Rect x={442} y={262} width={716} height={4} fill={CYAN} opacity={0.4} />
          <Rect x={442} y={332} width={716} height={3} fill={accent} opacity={0.5} />
        </G>

        {/* inner border */}
        <Polygon points={INNER} fill="none" stroke={accent} strokeWidth={1.4} opacity={0.7} />

        {/* title — RGB-split, static */}
        <G>
          {([
            { x: 797, fill: CYAN, opacity: 0.4 },
            { x: 803, fill: accent, opacity: 0.4 },
            { x: 800, fill: '#ffffff', opacity: 1 },
          ] as const).map((layer, i) => (
            <SvgText
              key={i}
              x={layer.x}
              y={319}
              fill={layer.fill}
              opacity={layer.opacity}
              fontFamily="Orbitron_800ExtraBold"
              fontWeight="800"
              fontSize={54}
              letterSpacing={10}
              textAnchor="middle"
            >
              {text}
            </SvgText>
          ))}
        </G>

        {/* shoulder chevrons */}
        <G stroke={accent} strokeWidth={4} strokeLinecap="round" opacity={0.8}>
          {CHEVRON_Y.map((y) => (
            <Line key={`cl${y}`} x1={498} y1={y} x2={520} y2={y} />
          ))}
          {CHEVRON_Y.map((y) => (
            <Line key={`cr${y}`} x1={1102} y1={y} x2={1080} y2={y} />
          ))}
        </G>

        {/* corner rivets */}
        <G fill="#3a0a12" stroke={`url(#${id.edge})`} strokeWidth={1.5}>
          <Circle cx={490} cy={236} r={5} />
          <Circle cx={1110} cy={236} r={5} />
          <Circle cx={490} cy={364} r={5} />
          <Circle cx={1110} cy={364} r={5} />
        </G>

        {full && (
          <>
            {/* bottom data bits */}
            <G>
              <Rect x={640} y={356} width={30} height={6} fill={accent} />
              <Rect x={676} y={356} width={30} height={6} fill={accent} opacity={0.5} />
              <Rect x={712} y={356} width={14} height={6} fill={accent} />
              <Rect x={874} y={356} width={20} height={6} fill={CYAN} opacity={0.6} />
              <Rect x={900} y={356} width={34} height={6} fill={accent} opacity={0.5} />
            </G>

            {/* outer corner brackets */}
            <G fill="none" stroke={accent} strokeWidth={4} strokeLinecap="square">
              <Polyline points="430,200 404,200 404,232" />
              <Polyline points="1170,200 1196,200 1196,232" />
              <Polyline points="430,400 404,400 404,368" />
              <Polyline points="1170,400 1196,400 1196,368" />
            </G>

            {/* top diamond emblem (static) */}
            <G>
              <Ellipse cx={800} cy={194} rx={120} ry={56} fill={`url(#${id.energy})`} opacity={0.7} />
              <G fill={accent} opacity={0.85}>
                <Polygon points="688,194 706,176 712,182 700,194 712,206 706,212" />
                <Polygon points="912,194 894,176 888,182 900,194 888,206 894,212" />
              </G>
              <Polygon points={DIAMOND} fill="#0a0103" stroke={`url(#${id.edge})`} strokeWidth={2.5} />
              <Polygon points={DIAMOND_INNER} fill={`url(#${id.hazard})`} />
              <Polygon points={DIAMOND_INNER} fill="none" stroke={accent} strokeWidth={1.5} />
              <Rect x={796} y={178} width={8} height={20} fill={accent} />
              <Rect x={796} y={204} width={8} height={8} fill={accent} />
            </G>

            {/* bottom indicator triangle */}
            <G>
              <Polygon points="770,390 830,390 800,420" fill="#0a0103" stroke={`url(#${id.edge})`} strokeWidth={2} />
              <Polygon points="784,390 816,390 800,406" fill={accent} />
            </G>

            {/* side data ticks */}
            <G>
              <Rect x={356} y={262} width={10} height={12} fill={accent} />
              <Rect x={356} y={278} width={10} height={12} fill={accent} opacity={0.4} />
              <Rect x={356} y={294} width={10} height={12} fill={accent} />
              <Rect x={356} y={310} width={10} height={12} fill={CYAN} opacity={0.5} />
              <Rect x={356} y={326} width={10} height={12} fill={accent} opacity={0.3} />
              <Rect x={1234} y={262} width={10} height={12} fill={accent} />
              <Rect x={1234} y={278} width={10} height={12} fill={CYAN} opacity={0.5} />
              <Rect x={1234} y={294} width={10} height={12} fill={accent} opacity={0.4} />
              <Rect x={1234} y={310} width={10} height={12} fill={accent} />
              <Rect x={1234} y={326} width={10} height={12} fill={accent} opacity={0.3} />
            </G>

            {/* scattered status dots */}
            <G fill={accent}>
              <Circle cx={600} cy={170} r={3} />
              <Circle cx={1010} cy={432} r={3} />
              <Circle cx={300} cy={350} r={2.5} />
              <Circle cx={1300} cy={250} r={2.5} fill={CYAN} />
            </G>
          </>
        )}
      </Svg>

      {/* the single ambient animation: a composited scan band */}
      <Animated.View
        pointerEvents="none"
        style={[styles.band, { top: -bandHeight, height: bandHeight, backgroundColor: CYAN }, sweepStyle]}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0.12,
  },
})
