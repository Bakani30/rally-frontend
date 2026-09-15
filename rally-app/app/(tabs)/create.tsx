import { Redirect } from 'expo-router'

// This screen exists only for Expo Router to register the tab route.
// The tab button overrides onPress to push /match/new directly, so this
// screen never actually renders during normal navigation.
export default function CreateTab() {
  return <Redirect href="/match/new" />
}
