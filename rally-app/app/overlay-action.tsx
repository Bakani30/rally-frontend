import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import { useSportTheme } from '@/hooks/useAppTheme'
import { useAndroidOverlayAction } from '@/hooks/useAndroidOverlayAction'
import {
  getFirstRouteParam,
  normalizeOverlayAction,
  type OverlayActionRouteParams,
} from '@/lib/overlay/rallyIslandSurface'

export default function OverlayActionScreen() {
  const theme = useSportTheme()
  const params = useLocalSearchParams<OverlayActionRouteParams>()
  const { status, message } = useAndroidOverlayAction(params)
  const action = normalizeOverlayAction(getFirstRouteParam(params.action))
  const shouldSkipPanel =
    action === 'expand_in_app' ||
    action === 'accept_invite' ||
    action === 'decline_invite' ||
    action === 'accept_friend_request' ||
    action === 'dismiss_friend_request'

  if (shouldSkipPanel) return null

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <View style={[styles.panel, { backgroundColor: theme.arcadePanel, borderColor: theme.lineStrong }]}>
        <ActivityIndicator color={status === 'error' ? theme.red : theme.amber} />
        <Text style={[styles.text, { color: theme.chalk }]}>{message}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    minWidth: 220,
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
})
