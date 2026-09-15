import { Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

type EffortGaugeProps = {
  value: number
  max?: number
  color: string
  size?: number
}

// Small circular gauge for an effort/intensity value (0..max).
export function EffortGauge({ value, max = 100, color, size = 48 }: EffortGaugeProps) {
  const stroke = 5
  const r = (size - stroke) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0))

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke="#f1efe8" strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 14, fontWeight: '900', color: '#161616', fontVariant: ['tabular-nums'] }}>
        {Math.round(value)}
      </Text>
    </View>
  )
}
