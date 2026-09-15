import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useLocalSearchParams } from 'expo-router'
import { guardedRouter } from '@/lib/navigation/guardedRouter'
import { useSportTheme } from '@/hooks/useAppTheme'

export default function RefereeSubmitRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const theme = useSportTheme()

  useEffect(() => {
    if (!id) return
    guardedRouter.replace(`/match/${id}`, {
      actionKey: `match:${id}:referee-submit-redirect`,
    })
  }, [id])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: 'Referee' }} />
      <ActivityIndicator color={theme.green} />
    </View>
  )
}
