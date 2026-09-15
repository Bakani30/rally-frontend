import { memo } from 'react'
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg'

import { courtAspect, courtDrawable, FIBA, threePointGeometry } from '@/lib/match/courtGeometry'

const FLOOR = '#241610'
const LINE = '#f5ece0'
const HOOP = '#ff8d28'
const TINT_A = 'rgba(255,138,0,0.26)'
const TINT_B = 'rgba(128,139,195,0.26)'

type BasketballCourtSvgProps = {
  width: number
}

// Full FIBA court only — 2026-07-12 founder revision put every team size on
// the full vertical court, so half-court rendering was removed (see
// lib/match/courtGeometry.ts courtKindForTeamSize).
export const BasketballCourtSvg = memo(function BasketballCourtSvg({ width }: BasketballCourtSvgProps) {
  const box = courtDrawable('full')
  const scale = width / box.width
  const height = width * courtAspect('full')
  const m = (v: number) => v * scale
  const cx = m(box.width / 2)
  const tp = threePointGeometry()
  const keyHalf = m(FIBA.keyWidth / 2)
  const bbHalf = m(FIBA.backboardWidth / 2)
  const arcJoinY = m(tp.cornerLineLength)
  const cornerX = m(tp.cornerLineFromSideline)
  const r3 = m(tp.radius)
  const rFt = m(FIBA.freeThrowCircleRadius)
  const rNc = m(FIBA.noChargeRadius)
  const hoopY = m(FIBA.hoopFromBaseline)
  const keyY = m(FIBA.keyLength)
  const sw = Math.max(1.5, m(0.05))

  // One hoop end drawn from a given baseline (top y=0 or bottom y=height).
  const end = (flip: boolean) => {
    const y = (v: number) => (flip ? height - v : v)
    const sweepOut = flip ? 1 : 0 // arc bulging away from the baseline

    return (
      <>
        <Rect x={cx - keyHalf} y={flip ? y(keyY) : 0} width={keyHalf * 2} height={keyY} stroke={LINE} strokeWidth={sw} fill="none" />
        <Path d={`M ${cx - rFt} ${y(keyY)} A ${rFt} ${rFt} 0 0 ${sweepOut} ${cx + rFt} ${y(keyY)}`} stroke={LINE} strokeWidth={sw} fill="none" />
        <Path
          d={`M ${cornerX} ${y(0)} L ${cornerX} ${y(arcJoinY)} A ${r3} ${r3} 0 0 ${sweepOut} ${m(box.width) - cornerX} ${y(arcJoinY)} L ${m(box.width) - cornerX} ${y(0)}`}
          stroke={LINE} strokeWidth={sw} fill="none"
        />
        <Path d={`M ${cx - rNc} ${y(hoopY)} A ${rNc} ${rNc} 0 0 ${sweepOut} ${cx + rNc} ${y(hoopY)}`} stroke={LINE} strokeWidth={sw} fill="none" />
        <Line x1={cx - bbHalf} y1={y(m(FIBA.backboardFromBaseline))} x2={cx + bbHalf} y2={y(m(FIBA.backboardFromBaseline))} stroke={LINE} strokeWidth={sw * 1.6} />
        <Circle cx={cx} cy={y(hoopY)} r={Math.max(3, m(0.2286))} stroke={HOOP} strokeWidth={sw} fill="none" />
      </>
    )
  }

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <Rect x={0} y={0} width={m(box.width)} height={height} fill={FLOOR} />
      <Rect x={0} y={0} width={m(box.width)} height={height / 2} fill={TINT_A} />
      <Rect x={0} y={height / 2} width={m(box.width)} height={height / 2} fill={TINT_B} />
      <Line x1={0} y1={height / 2} x2={m(box.width)} y2={height / 2} stroke={LINE} strokeWidth={sw} />
      <Circle cx={cx} cy={height / 2} r={m(FIBA.centerCircleRadius)} stroke={LINE} strokeWidth={sw} fill="none" />
      {end(false)}
      {end(true)}
      <Rect x={0} y={0} width={m(box.width)} height={height} stroke={LINE} strokeWidth={sw} fill="none" />
    </Svg>
  )
})
