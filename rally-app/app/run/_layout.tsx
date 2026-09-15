import { Stack } from 'expo-router'
import { AlphaRunningGateBoundary } from '@/components/run/AlphaRunningGateBoundary'

export default function RunLayout() {
  return (
    <AlphaRunningGateBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="active" dangerouslySingular />
        <Stack.Screen name="summary/[sessionId]" dangerouslySingular />
        <Stack.Screen name="sync" dangerouslySingular />
      </Stack>
    </AlphaRunningGateBoundary>
  )
}
