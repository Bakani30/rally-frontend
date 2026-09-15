import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { ArenaMapVenueDetail } from '@/components/arena-map/ArenaMapVenueDetail'
import { useArenaMapDetail, useSetArenaVenueFavorite } from '@/hooks/useArenaMap'
import { arenaMapDetailDestination } from '@/lib/arena-map/arenaMapPresentation'

export default function VenueDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const venueId = typeof id === 'string' ? id : null
  const detail = useArenaMapDetail(venueId ? `venue:${venueId}` : null, Boolean(venueId))
  const favorite = useSetArenaVenueFavorite()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  useEffect(() => {
    const firstOption = detail.data?.sessionNavigationOptions[0]
    if (firstOption && !detail.data?.sessionNavigationOptions.some((option) => option.sessionId === selectedSessionId)) setSelectedSessionId(firstOption.sessionId)
  }, [detail.data?.id, detail.data?.sessionNavigationOptions, selectedSessionId])

  if (!venueId) return <View style={styles.center}><Text style={styles.message}>ไม่พบสนามนี้</Text></View>
  if (detail.isLoading) return <View style={styles.center}><ActivityIndicator color="#eb773c" /></View>
  if (!detail.data) return <View style={styles.center}><Text style={styles.message}>โหลดรายละเอียดสนามไม่สำเร็จ</Text></View>

  const destination = arenaMapDetailDestination(detail.data, selectedSessionId)
  const selectedSession = destination?.kind === 'arena_session' ? destination : null
  return <ArenaMapVenueDetail
    detail={detail.data}
    selectedSessionId={selectedSessionId}
    onBack={() => router.back()}
    onFavorite={() => detail.data?.venueId && favorite.mutate({ venueId: detail.data.venueId, favorite: !detail.data.isFavorite })}
    onSelectSession={setSelectedSessionId}
    onViewSession={() => selectedSession && router.push({ pathname: '/arena-session/[id]', params: { id: selectedSession.sessionId } })}
  />
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f2ed' },
  message: { color: '#161616' },
})
