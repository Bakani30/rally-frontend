import { memo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg'

import type { SportReelKey } from '@/lib/match/sportReel'

type SportFloorBackdropProps = {
  sportKey: SportReelKey
}

const STROKE: Record<SportReelKey, string> = {
  running: 'rgba(217,255,79,0.18)',
  basketball: 'rgba(255,232,204,0.38)',
  badminton: 'rgba(171,238,209,0.23)',
  volleyball: 'rgba(122,113,107,0.28)',
  tennis: 'rgba(122,113,107,0.28)',
  golf: 'rgba(122,113,107,0.28)',
  boxing: 'rgba(122,113,107,0.28)',
}

const VIEW_BOX = '0 0 390 900'
const LINE_WIDTH = 5

function RunningBackdrop({ stroke }: { stroke: string }) {
  return (
    <>
      <G stroke={stroke} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path
          d="M-260 438C-80 386 80 390 230 340C370 286 510 210 650 226"
          strokeWidth={28}
          opacity={0.17}
        />
        <Path
          d="M-260 438C-80 386 80 390 230 340C370 286 510 210 650 226"
          strokeWidth={8}
          opacity={0.34}
        />
        <Path
          d="M-270 764C-90 710 80 724 230 650C380 576 500 518 660 530"
          strokeWidth={26}
          opacity={0.16}
        />
        <Path
          d="M-270 764C-90 710 80 724 230 650C380 576 500 518 660 530"
          strokeWidth={8}
          opacity={0.3}
        />
        <Path
          d="M-280 928C-80 884 72 884 230 808C380 734 520 690 670 702"
          strokeWidth={24}
          opacity={0.14}
        />
        <Path
          d="M-280 928C-80 884 72 884 230 808C380 734 520 690 670 702"
          strokeWidth={7}
          opacity={0.28}
        />
      </G>
      <G stroke={stroke} strokeWidth={5.4} fill="none" strokeLinecap="round" opacity={0.76}>
        <Path d="M-260 424L650 132" />
        <Path d="M-260 550L650 258" />
        <Path d="M-260 676L650 384" />
        <Path d="M-260 802L650 510" />
        <Path d="M-260 928L650 636" />
      </G>
    </>
  )
}

function BasketballBackdrop({ stroke }: { stroke: string }) {
  const topEndMarkings = (
    <>
      <Path d="M-47 -122L-47 34A261 261 0 0 0 437 34L437 -122" />
      <Path d="M107 -122V87H283V-122" />
      <Path d="M129 87A66 66 0 0 1 261 87" />
      <Path d="M261 87A66 66 0 0 1 129 87" opacity={0.28} strokeDasharray="9 9" />
      <Line x1="107" y1="87" x2="283" y2="87" />

      <Path d="M151 -64A44 44 0 0 1 239 -64" opacity={0.78} />
      <Line x1="151" y1="-64" x2="151" y2="-78" opacity={0.78} />
      <Line x1="239" y1="-64" x2="239" y2="-78" opacity={0.78} />
      <Line x1="150" y1="-78" x2="240" y2="-78" opacity={0.84} />
      <Circle cx="195" cy="-64" r="8" opacity={0.9} />

      <Line x1="107" y1="48" x2="91" y2="48" opacity={0.42} />
      <Line x1="107" y1="4" x2="91" y2="4" opacity={0.42} />
      <Line x1="107" y1="-40" x2="91" y2="-40" opacity={0.42} />
      <Line x1="283" y1="48" x2="299" y2="48" opacity={0.42} />
      <Line x1="283" y1="4" x2="299" y2="4" opacity={0.42} />
      <Line x1="283" y1="-40" x2="299" y2="-40" opacity={0.42} />
    </>
  )

  const bottomEndMarkings = (
    <>
      <Path d="M-47 912L-47 756A261 261 0 0 1 437 756L437 912" />
      <Path d="M107 912V703H283V912" />
      <Path d="M129 703A66 66 0 0 0 261 703" />
      <Path d="M261 703A66 66 0 0 0 129 703" opacity={0.28} strokeDasharray="9 9" />
      <Line x1="107" y1="703" x2="283" y2="703" />

      <Path d="M151 854A44 44 0 0 0 239 854" opacity={0.78} />
      <Line x1="151" y1="854" x2="151" y2="868" opacity={0.78} />
      <Line x1="239" y1="854" x2="239" y2="868" opacity={0.78} />
      <Line x1="150" y1="868" x2="240" y2="868" opacity={0.84} />
      <Circle cx="195" cy="854" r="8" opacity={0.9} />

      <Line x1="107" y1="742" x2="91" y2="742" opacity={0.42} />
      <Line x1="107" y1="786" x2="91" y2="786" opacity={0.42} />
      <Line x1="107" y1="830" x2="91" y2="830" opacity={0.42} />
      <Line x1="283" y1="742" x2="299" y2="742" opacity={0.42} />
      <Line x1="283" y1="786" x2="299" y2="786" opacity={0.42} />
      <Line x1="283" y1="830" x2="299" y2="830" opacity={0.42} />
    </>
  )

  const topShotMarks = (
    <>
      <Circle cx="66" cy="106" r="5" />
      <Circle cx="106" cy="140" r="4" />
      <Circle cx="154" cy="170" r="6" />
      <Circle cx="236" cy="170" r="5" />
      <Circle cx="288" cy="140" r="4" />
      <Circle cx="326" cy="106" r="6" />
      <Circle cx="124" cy="20" r="4" />
      <Circle cx="268" cy="20" r="5" />
      <Circle cx="168" cy="-46" r="4" />
      <Circle cx="220" cy="-46" r="6" />
      <Circle cx="195" cy="-102" r="7" />
    </>
  )

  const bottomShotMarks = (
    <>
      <Circle cx="66" cy="684" r="5" />
      <Circle cx="106" cy="650" r="4" />
      <Circle cx="154" cy="620" r="6" />
      <Circle cx="236" cy="620" r="5" />
      <Circle cx="288" cy="650" r="4" />
      <Circle cx="326" cy="684" r="6" />
      <Circle cx="124" cy="770" r="4" />
      <Circle cx="268" cy="770" r="5" />
      <Circle cx="168" cy="836" r="4" />
      <Circle cx="220" cy="836" r="6" />
      <Circle cx="195" cy="892" r="7" />
    </>
  )

  return (
    <>
      <G transform="rotate(-6 195 650)">
        <G stroke="rgba(88,36,18,0.14)" strokeWidth={2.8} fill="none" strokeLinecap="round" opacity={0.78}>
          <Line x1="-70" y1="-150" x2="-70" y2="946" />
          <Line x1="-8" y1="-150" x2="-8" y2="958" />
          <Line x1="54" y1="-150" x2="54" y2="946" />
          <Line x1="116" y1="-150" x2="116" y2="958" />
          <Line x1="178" y1="-150" x2="178" y2="946" />
          <Line x1="240" y1="-150" x2="240" y2="958" />
          <Line x1="302" y1="-150" x2="302" y2="946" />
          <Line x1="364" y1="-150" x2="364" y2="958" />
          <Line x1="426" y1="-150" x2="426" y2="946" />
        </G>
        <G fill={stroke} opacity={0.075}>
          <Path d="M-80 -122H132L86 60H-80Z" />
          <Path d="M242 38H470L420 214H206Z" />
          <Path d="M-80 395H118L76 560H-80Z" />
          <Path d="M226 412H470L410 638H180Z" />
          <Path d="M-80 732H124L82 912H-80Z" />
          <Path d="M248 766H470V912H218Z" />
        </G>
        <G stroke={stroke} strokeWidth={5.2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5}>
          <Path d="M-80 -122H470" />
          <Path d="M-80 395H470" />
          <Path d="M-80 912H470" />
          <Path d="M-80 -122V912" />
          <Path d="M470 -122V912" />
          <Circle cx="195" cy="395" r="66" opacity={0.42} />
          {topEndMarkings}
          {bottomEndMarkings}
        </G>
        <G fill="rgba(255,232,204,0.24)" opacity={0.42}>
          {topShotMarks}
          {bottomShotMarks}
        </G>
      </G>
    </>
  )
}

function BadmintonBackdrop({ stroke }: { stroke: string }) {
  const courtWidth = 400
  const courtHeight = courtWidth * (13.4 / 6.1)
  const left = (390 - courtWidth) / 2
  const right = left + courtWidth
  const top = (900 - courtHeight) / 2
  const bottom = top + courtHeight
  const centerX = left + courtWidth / 2
  const netY = top + courtHeight / 2
  const singlesInset = courtWidth * ((6.1 - 5.18) / 2 / 6.1)
  const singlesLeft = left + singlesInset
  const singlesRight = right - singlesInset
  const shortServiceOffset = courtHeight * (1.98 / 13.4)
  const longServiceOffset = courtHeight * (0.76 / 13.4)
  const shortTop = netY - shortServiceOffset
  const shortBottom = netY + shortServiceOffset
  const longTop = top + longServiceOffset
  const longBottom = bottom - longServiceOffset

  return (
    <G transform={`rotate(8 ${centerX} ${netY})`}>
      <G fill="none">
        <Path d={`M${left - 26} ${top - 20}H${right + 26}V${bottom + 28}H${left - 26}Z`} fill="rgba(15,83,70,0.09)" />
        <Path d={`M${left} ${top}H${right}V${netY}H${left}Z`} fill="rgba(134,216,168,0.045)" />
        <Path d={`M${left} ${netY}H${right}V${bottom}H${left}Z`} fill="rgba(10,73,62,0.055)" />
        <Path d={`M${left} ${top}H${singlesLeft}V${bottom}H${left}Z`} fill="rgba(134,216,168,0.032)" />
        <Path d={`M${singlesRight} ${top}H${right}V${bottom}H${singlesRight}Z`} fill="rgba(134,216,168,0.032)" />
        <Path d={`M${singlesLeft} ${shortTop}H${centerX}V${longTop}H${singlesLeft}Z`} fill="rgba(18,86,72,0.052)" />
        <Path d={`M${centerX} ${shortBottom}H${singlesRight}V${longBottom}H${centerX}Z`} fill="rgba(18,86,72,0.052)" />
      </G>

      <G stroke="rgba(7,65,55,0.14)" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.28}>
        <Line x1={left - 46} y1={top + 146} x2={right + 46} y2={top + 126} />
        <Line x1={left - 46} y1={netY + 72} x2={right + 46} y2={netY + 54} />
        <Line x1={left - 46} y1={bottom - 154} x2={right + 46} y2={bottom - 174} />
      </G>

      <G stroke={stroke} strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.58}>
        <Rect x={left} y={top} width={courtWidth} height={courtHeight} rx={14} />
        <Line x1={singlesLeft} y1={top} x2={singlesLeft} y2={bottom} />
        <Line x1={singlesRight} y1={top} x2={singlesRight} y2={bottom} />
        <Line x1={left} y1={longTop} x2={right} y2={longTop} />
        <Line x1={left} y1={shortTop} x2={right} y2={shortTop} />
        <Line x1={left} y1={shortBottom} x2={right} y2={shortBottom} />
        <Line x1={left} y1={longBottom} x2={right} y2={longBottom} />
        <Line x1={centerX} y1={top} x2={centerX} y2={shortTop} />
        <Line x1={centerX} y1={shortBottom} x2={centerX} y2={bottom} />
      </G>

      <G>
        <Rect x={left - 26} y={netY - 6} width={courtWidth + 52} height={12} rx={6} fill="rgba(171,238,209,0.075)" />
        <Line x1={left - 20} y1={netY} x2={right + 20} y2={netY} stroke={stroke} strokeWidth={5} strokeLinecap="round" opacity={0.28} />
        <Line x1={left - 20} y1={netY - 12} x2={right + 20} y2={netY - 12} stroke="rgba(249,246,240,0.12)" strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={left - 20} y1={netY + 12} x2={right + 20} y2={netY + 12} stroke="rgba(249,246,240,0.08)" strokeWidth={2.2} strokeLinecap="round" />
        <Line x1={left - 10} y1={netY - 42} x2={left - 10} y2={netY + 42} stroke={stroke} strokeWidth={4} strokeLinecap="round" opacity={0.28} />
        <Line x1={right + 10} y1={netY - 42} x2={right + 10} y2={netY + 42} stroke={stroke} strokeWidth={4} strokeLinecap="round" opacity={0.28} />
      </G>

      <G stroke="rgba(249,246,240,0.08)" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.3}>
        <Path d={`M${left + 54} ${top + 170}C${left + 96} ${top + 154} ${left + 126} ${top + 180} ${left + 166} ${top + 158}`} />
        <Path d={`M${left + 64} ${bottom - 138}C${left + 118} ${bottom - 160} ${left + 162} ${bottom - 126} ${left + 210} ${bottom - 150}`} />
      </G>
    </G>
  )
}

function VolleyballBackdrop({ stroke }: { stroke: string }) {
  return (
    <G stroke={stroke} strokeWidth={LINE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="34" y="236" width="322" height="644" rx="18" />
      <Line x1="34" y1="558" x2="356" y2="558" />
      <Line x1="34" y1="436" x2="356" y2="436" />
      <Line x1="34" y1="680" x2="356" y2="680" />
      <Line x1="116" y1="236" x2="116" y2="880" />
      <Line x1="274" y1="236" x2="274" y2="880" />
    </G>
  )
}

function TennisBackdrop({ stroke }: { stroke: string }) {
  return (
    <G stroke={stroke} strokeWidth={LINE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="38" y="220" width="314" height="660" rx="18" />
      <Line x1="38" y1="550" x2="352" y2="550" />
      <Line x1="72" y1="430" x2="318" y2="430" />
      <Line x1="72" y1="670" x2="318" y2="670" />
      <Line x1="195" y1="430" x2="195" y2="670" />
      <Line x1="72" y1="220" x2="72" y2="880" />
      <Line x1="318" y1="220" x2="318" y2="880" />
    </G>
  )
}

function GolfBackdrop({ stroke }: { stroke: string }) {
  return (
    <G stroke={stroke} strokeWidth={LINE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <Ellipse cx="188" cy="646" rx="196" ry="288" transform="rotate(-12 188 646)" />
      <Ellipse cx="218" cy="606" rx="86" ry="128" transform="rotate(-12 218 606)" />
      <Path d="M214 468L214 642" />
      <Path d="M214 468L274 490L214 512" fill={stroke} strokeWidth={0} />
    </G>
  )
}

function BoxingBackdrop({ stroke }: { stroke: string }) {
  return (
    <G stroke={stroke} strokeWidth={LINE_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-3 195 560)">
      <Rect x="30" y="244" width="330" height="636" rx="24" />
      <Line x1="30" y1="394" x2="360" y2="394" />
      <Line x1="30" y1="560" x2="360" y2="560" />
      <Line x1="30" y1="726" x2="360" y2="726" />
      <Rect x="18" y="232" width="54" height="54" rx="10" />
      <Rect x="318" y="232" width="54" height="54" rx="10" />
      <Rect x="18" y="838" width="54" height="54" rx="10" />
      <Rect x="318" y="838" width="54" height="54" rx="10" />
    </G>
  )
}

export const SportFloorBackdrop = memo(function SportFloorBackdrop({ sportKey }: SportFloorBackdropProps) {
  const stroke = STROKE[sportKey]

  return (
    <View style={styles.backdrop} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMid slice">
        {sportKey === 'running' && <RunningBackdrop stroke={stroke} />}
        {sportKey === 'basketball' && <BasketballBackdrop stroke={stroke} />}
        {sportKey === 'badminton' && <BadmintonBackdrop stroke={stroke} />}
        {sportKey === 'volleyball' && <VolleyballBackdrop stroke={stroke} />}
        {sportKey === 'tennis' && <TennisBackdrop stroke={stroke} />}
        {sportKey === 'golf' && <GolfBackdrop stroke={stroke} />}
        {sportKey === 'boxing' && <BoxingBackdrop stroke={stroke} />}
      </Svg>
    </View>
  )
})

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
})
