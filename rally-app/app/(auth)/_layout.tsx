import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" dangerouslySingular />
      <Stack.Screen name="sign-up" dangerouslySingular />
      <Stack.Screen name="set-username" dangerouslySingular />
      <Stack.Screen name="reset-password" dangerouslySingular />
    </Stack>
  )
}
