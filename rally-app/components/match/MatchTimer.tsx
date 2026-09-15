import { memo, useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { PressableScale } from '@/components/motion/PressableScale'

type Props = {
  // When provided the timer counts elapsed seconds since this ISO timestamp.
  // Accurate even when the user leaves and returns to the screen.
  startedAt?: string | null
  // Start the timer automatically on mount (e.g. team sports).
  autoStart?: boolean
}

function elapsedFromTimestamp(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
}

function MatchTimerInner({ startedAt, autoStart = false }: Props) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const [running, setRunning] = useState(autoStart)
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? elapsedFromTimestamp(startedAt) : 0,
  )
  // Track whether the user manually stopped so we don't auto-reset.
  const manuallyStopped = useRef(false)

  // When startedAt changes (e.g. initial load), sync elapsed and auto-start.
  useEffect(() => {
    if (!startedAt) return
    setElapsed(elapsedFromTimestamp(startedAt))
    if (autoStart && !manuallyStopped.current) {
      setRunning(true)
    }
  }, [startedAt, autoStart])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      // If we have a server timestamp, stay anchored to it so drift doesn't accumulate.
      if (startedAt) {
        setElapsed(elapsedFromTimestamp(startedAt))
      } else {
        setElapsed((prev) => prev + 1)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [running, startedAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  function toggle() {
    if (running) {
      manuallyStopped.current = true
      setRunning(false)
    } else {
      manuallyStopped.current = false
      setRunning(true)
    }
  }

  function reset() {
    manuallyStopped.current = false
    setRunning(false)
    setElapsed(startedAt ? elapsedFromTimestamp(startedAt) : 0)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </Text>
      <View style={styles.actions}>
        <PressableScale
          style={[styles.button, running ? styles.stopButton : styles.startButton]}
          onPress={toggle}
        >
          <MaterialCommunityIcons name={running ? 'stop' : 'play'} size={20} color={theme.surface} />
          <Text style={styles.buttonText}>{running ? 'STOP' : 'START'}</Text>
        </PressableScale>
        {elapsed > 0 && !running && (
          <PressableScale style={styles.resetButton} onPress={reset}>
            <MaterialCommunityIcons name="refresh" size={20} color={theme.muted} />
          </PressableScale>
        )}
      </View>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.line,
    marginTop: 16,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.ink,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  startButton: { backgroundColor: theme.orange },
  stopButton: { backgroundColor: theme.red },
  buttonText: {
    color: theme.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  resetButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: theme.bg,
  },
  })
}

export const MatchTimer = memo(MatchTimerInner)
