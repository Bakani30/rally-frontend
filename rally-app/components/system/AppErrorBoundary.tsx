import type { ErrorBoundaryProps } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

// Root error boundary picked up by expo-router (re-exported as `ErrorBoundary`
// from app/_layout.tsx). Kept intentionally dependency-light — no theme hooks,
// no providers — so a render error anywhere in the tree degrades to this retry
// screen instead of a white-screen crash. Matters most during rapid OTA updates.
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>เกิดข้อผิดพลาด</Text>
      <Text style={styles.body}>แอปสะดุดชั่วคราว ลองใหม่อีกครั้งได้เลย</Text>
      <Pressable onPress={retry} style={styles.button} accessibilityRole="button">
        <Text style={styles.buttonLabel}>ลองอีกครั้ง</Text>
      </Pressable>
    </View>
  )
}

const styles = {
  root: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#11121c',
    padding: 24,
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800' as const, marginBottom: 8 },
  body: { color: '#9aa0b4', fontSize: 14, textAlign: 'center' as const, marginBottom: 24 },
  button: {
    backgroundColor: '#d9ff3a',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  buttonLabel: { color: '#11121c', fontSize: 15, fontWeight: '800' as const },
}
