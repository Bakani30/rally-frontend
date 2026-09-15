import { useEffect, useState } from 'react'
import { Text, type TextProps } from 'react-native'

const FRAME_UPDATE_MS = 33

type Props = TextProps & {
  value: number
  duration?: number
  delay?: number
  trigger?: number | string
  animated?: boolean
  format?: (n: number) => string
}

export function CountUp({
  value,
  duration = 900,
  delay = 0,
  trigger = 0,
  animated = true,
  format = (n) => n.toLocaleString(),
  style,
  ...rest
}: Props) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!animated) {
      setN(value)
      return
    }

    setN(0)
    let raf: number | null = null
    let start: number | null = null
    let lastPaint = 0
    let lastValue = 0
    const startTimer = setTimeout(() => {
      const step = (t: number) => {
        if (start === null) start = t
        const p = Math.min(1, (t - start) / Math.max(1, duration))
        const eased = 1 - Math.pow(1 - p, 3)
        if (p === 1 || t - lastPaint >= FRAME_UPDATE_MS) {
          lastPaint = t
          const next = Math.round(value * eased)
          if (next !== lastValue || p === 1) {
            lastValue = next
            setN(next)
          }
        }
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)
    return () => {
      clearTimeout(startTimer)
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [value, duration, delay, trigger, animated])

  return (
    <Text style={style} {...rest}>
      {format(n)}
    </Text>
  )
}
