import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import { ArenaMapDetailSheet } from '@/components/arena-map/ArenaMapDetailSheet'
import { ArenaMapSurface } from '@/components/arena-map/ArenaMapSurface'
import { Fonts, type SportPalette } from '@/constants/theme'
import { useArenaMapDetail, useArenaMapSummary, useSetArenaVenueFavorite } from '@/hooks/useArenaMap'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapDetailSurfaceState, arenaMapPinIdForTap, arenaMapSheetDestination, detailTimestampLabel, distanceMeters } from '@/lib/arena-map/arenaMapPresentation'
import type { ArenaMapBbox } from '@/types/arenaMap'

const BANGKOK_INITIAL_BBOX: ArenaMapBbox = { south: 13.70, north: 13.82, west: 100.47, east: 100.59 }

export default function ArenaMapScreen() {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [bbox, setBbox] = useState(BANGKOK_INITIAL_BBOX)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deviceCoordinate, setDeviceCoordinate] = useState<{ latitude: number; longitude: number } | null>(null)
  const { data: summary, isLoading, error, refetch } = useArenaMapSummary(bbox)
  const detail = useArenaMapDetail(selectedId, Boolean(selectedId))
  const favorite = useSetArenaVenueFavorite()

  useEffect(() => { Location.getLastKnownPositionAsync().then((position) => position && setDeviceCoordinate({ latitude: position.coords.latitude, longitude: position.coords.longitude })).catch(() => undefined) }, [])

  if ((!summary && isLoading) || mapUnavailable) return <View style={styles.center}>{mapUnavailable ? <Text style={styles.message}>แผนที่ยังไม่พร้อมใช้งาน</Text> : <ActivityIndicator color={theme.orange} />}</View>
  if (error) return <View style={styles.center}><Text style={styles.message}>โหลดสนามไม่สำเร็จ</Text><Pressable style={styles.retry} onPress={() => refetch()}><Text style={styles.retryButtonText}>ลองใหม่</Text></Pressable></View>
  const selectPin = (candidate: unknown) => {
    const id = arenaMapPinIdForTap(summary?.pins ?? [], candidate)
    if (!id) return
    setSelectedId(id)
  }
  const selectedPin = summary?.pins.find((pin) => pin.id === selectedId) ?? null
  const distanceM = selectedPin && deviceCoordinate ? distanceMeters(deviceCoordinate, selectedPin.coordinate) : null
  const detailSurfaceState = arenaMapDetailSurfaceState({ hasData: Boolean(detail.data), isInitialLoading: detail.isLoading, hasError: Boolean(detail.error) })
  const detailDestination = detail.data ? arenaMapSheetDestination(detail.data) : null
  return <View style={styles.root}>
    <ArenaMapSurface
      pins={summary?.pins ?? []}
      selectedId={selectedId}
      onPinPress={selectPin}
      onViewportChange={setBbox}
      onUnavailable={() => setMapUnavailable(true)}
    />
    <View style={styles.top}><Pressable style={styles.back} onPress={() => router.back()} accessibilityLabel="กลับ"><MaterialCommunityIcons name="chevron-left" size={24} color={theme.ink} /></Pressable><View style={styles.headingCopy}><Text style={styles.heading}>สนามบาสใกล้ฉัน</Text><Text style={styles.caption}>{summary?.pins.length ?? 0} สนาม · แตะหมุดเพื่อดูรายละเอียด</Text></View></View>
    {summary?.sourceHealth && (summary.sourceHealth.venues === 'failed' || summary.sourceHealth.adHocArenas === 'failed') && <View style={styles.sourceWarning}><Text style={styles.sourceWarningText}>ข้อมูลสนามบางส่วนกำลังอัปเดต</Text></View>}
    {selectedId && detailSurfaceState === 'loading' && <View style={styles.detailLoading}><Pressable style={styles.detailDismiss} onPress={() => setSelectedId(null)} accessibilityRole="button" accessibilityLabel="ปิดรายละเอียดสนาม"><MaterialCommunityIcons name="close" size={22} color={theme.ink} /></Pressable><ActivityIndicator color={theme.orange} /></View>}
    {detail.data && <ArenaMapDetailSheet detail={detail.data} distanceM={distanceM} isStale={Boolean(detailTimestampLabel(detail.data.updatedAt)) || detailSurfaceState === 'content_stale'} onFavorite={() => detail.data?.venueId && favorite.mutate({ venueId: detail.data.venueId, favorite: !detail.data.isFavorite })} onClose={() => setSelectedId(null)} canView={Boolean(detailDestination)} onViewVenue={() => {
      if (!detailDestination) return
      if (detailDestination.kind === 'arena_session') router.push({ pathname: '/arena-session/[id]', params: { id: detailDestination.sessionId } })
      else router.push({ pathname: '/venues/[id]', params: { id: detailDestination.venueId } })
    }} />}
    {selectedId && detailSurfaceState === 'blocking_error' && <View style={styles.detailError}><Pressable style={styles.detailDismiss} onPress={() => setSelectedId(null)} accessibilityRole="button" accessibilityLabel="ปิดรายละเอียดสนาม"><MaterialCommunityIcons name="close" size={22} color={theme.ink} /></Pressable><Text style={styles.detailErrorTitle}>โหลดรายละเอียดสนามไม่สำเร็จ</Text><Pressable style={styles.detailRetry} onPress={() => detail.refetch()} accessibilityRole="button"><Text style={styles.retryText}>ลองใหม่</Text></Pressable></View>}
  </View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.arenaPage },
    message: { color: theme.ink, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiBody },
    retry: { minHeight: 44, minWidth: 80, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.bgElevated, paddingHorizontal: 16 },
    retryButtonText: { color: theme.ink, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiMedium },
    top: { position: 'absolute', top: 56, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    back: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center', shadowColor: theme.ink, shadowOpacity: .14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    headingCopy: { flexShrink: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: theme.bgOverlay },
    heading: { color: theme.ink, fontSize: 22, lineHeight: 32, fontFamily: Fonts?.thaiHead },
    caption: { color: theme.muted, fontSize: 12, lineHeight: 18, fontFamily: Fonts?.thaiBody },
    sourceWarning: { position: 'absolute', top: 128, left: 12, right: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: theme.economySoft },
    sourceWarningText: { color: theme.ink, fontSize: 12, lineHeight: 19, fontFamily: Fonts?.thaiMedium },
    detailLoading: { position: 'absolute', left: 12, right: 12, bottom: 18, height: 160, borderRadius: 24, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center' },
    detailError: { position: 'absolute', left: 12, right: 12, bottom: 18, padding: 20, borderRadius: 24, backgroundColor: theme.bgElevated },
    detailErrorTitle: { color: theme.ink, paddingRight: 44, fontSize: 18, lineHeight: 28, fontFamily: Fonts?.thaiHead },
    detailDismiss: { position: 'absolute', top: 8, right: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    detailRetry: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    retryText: { color: theme.orange, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiMedium },
  })
}
