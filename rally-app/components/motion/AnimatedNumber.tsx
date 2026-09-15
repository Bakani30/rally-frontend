import { useEffect, useRef, useState } from 'react'
import { Text, type TextStyle, type StyleProp } from 'react-native'

const FRAME_UPDATE_MS = 50

type AnimatedNumberProps = {
  value: number
  duration?: number
  style?: StyleProp<TextStyle>
  formatter?: (n: number) => string
  animateFromZero?: boolean
}

// Count-up tween for hero numbers — points, pot size, rating.
// animateFromZero starts the display at 0 so the value rolls up on first mount.
export function AnimatedNumber({
  value,
  duration = 900,
  style,
  formatter,
  animateFromZero = false,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(animateFromZero ? 0 : value)
  const displayRef = useRef(animateFromZero ? 0 : value)

  useEffect(() => {
    let raf: number | null = null
    let start: number | null = null
    let lastPaint = 0
    const from = displayRef.current
    const delta = value - from

    if (delta === 0) return

    const step = (time: number) => {
      if (start === null) start = time
      const progress = Math.min(1, (time - start) / Math.max(1, duration))
      const eased = 1 - Math.pow(1 - progress, 3)

      if (progress === 1 || time - lastPaint >= FRAME_UPDATE_MS) {
        lastPaint = time
        const next = Math.round(from + delta * eased)
        displayRef.current = next
        setDisplay(next)
      }

      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => {
      if (raf !== null) cancelAnimationFrame(raf)
    }
  }, [value, duration])

  const text = formatter ? formatter(display) : display.toLocaleString()
  return <Text style={style}>{text}</Text>
}
