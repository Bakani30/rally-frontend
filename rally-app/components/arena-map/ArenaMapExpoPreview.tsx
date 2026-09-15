import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, OnAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme, useThemeMode } from '@/hooks/useAppTheme'
import { ARENA_MAP_PREVIEW_SCENARIOS, arenaMapPreviewScenarioForPin, getArenaMapPreviewFixture, nextArenaMapPreviewTheme, type ArenaMapPreviewScenario } from '@/lib/arena-map/arenaMapPreview'
import { arenaMapDeadlineLabel, arenaMapDetailMetaLabel } from '@/lib/arena-map/arenaMapPresentation'
import type { ArenaMapPinDetail } from '@/types/arenaMap'
import { useThemeStore } from '@/stores/themeStore'

import { ArenaMapDetailSheet } from './ArenaMapDetailSheet'
import { ArenaMapSurface } from './ArenaMapSurface'
import { ArenaMapVenueDetail } from './ArenaMapVenueDetail'

type Destination = 'map' | 'venue' | 'session'

const scenarioLabel: Record<ArenaMapPreviewScenario, string> = { live: 'LIVE', idle: 'IDLE', expiring: 'EXPIRING', stale: 'STALE', error: 'ERROR' }

type ArenaMapExpoPreviewProps = { initialScenario: ArenaMapPreviewScenario; initialTheme: 'light' | 'dark' | null; onExit: () => void }

export function ArenaMapExpoPreview({ initialScenario, initialTheme, onExit }: ArenaMapExpoPreviewProps) {
  const theme = useSportTheme()
  const themeMode = useThemeMode()
  const setThemePreference = useThemeStore((state) => state.setPreference)
  const initialThemePreference = useRef(useThemeStore.getState().preference)
  const styles = useMemo(() => createStyles(theme), [theme])
  const { paddingTop } = useScreenInsets({ edges: ['top'], topPad: Spacing.sm })
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [scenario, setScenario] = useState(initialScenario)
  const [selectedId, setSelectedId] = useState<string | null>(() => getArenaMapPreviewFixture(initialScenario).selectedPinId)
  const [favoriteByVenue, setFavoriteByVenue] = useState<Record<string, boolean>>({ '22222222-2222-4222-8222-222222222222': true })
  const [destination, setDestination] = useState<Destination>('map')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [localNote, setLocalNote] = useState<string | null>(null)
  const fixture = useMemo(() => getArenaMapPreviewFixture(scenario), [scenario])

  useEffect(() => () => {
    void useThemeStore.getState().setPreference(initialThemePreference.current)
  }, [])

  useEffect(() => {
    if (initialTheme) void setThemePreference(initialTheme)
  }, [initialTheme, setThemePreference])

  useEffect(() => {
    const nextFixture = getArenaMapPreviewFixture(initialScenario)
    setScenario(initialScenario)
    setSelectedId(nextFixture.selectedPinId)
    setDestination('map')
    setSelectedSessionId(null)
    setLocalNote(null)
  }, [initialScenario])

  const detail = fixture.detail
    ? { ...fixture.detail, isFavorite: fixture.detail.venueId ? (favoriteByVenue[fixture.detail.venueId] ?? fixture.detail.isFavorite) : false }
    : null
  const pins = fixture.pins.map((pin) => ({
    ...pin,
    isFavorite: pin.venueId ? (favoriteByVenue[pin.venueId] ?? pin.isFavorite) : false,
  }))

  function selectScenario(next: ArenaMapPreviewScenario) {
    const nextFixture = getArenaMapPreviewFixture(next)
    setScenario(next)
    setSelectedId(nextFixture.selectedPinId)
    setDestination('map')
    setSelectedSessionId(null)
    setLocalNote(null)
  }

  function selectPin(pinId: string) {
    const next = arenaMapPreviewScenarioForPin(pinId)
    if (!next) return
    setScenario(next)
    setSelectedId(pinId)
    setDestination('map')
    setSelectedSessionId(null)
    setLocalNote(null)
  }

  function toggleFavorite() {
    if (!detail?.venueId) return
    setFavoriteByVenue((current) => ({ ...current, [detail.venueId!]: !(current[detail.venueId!] ?? detail.isFavorite) }))
    setLocalNote('บันทึกรายการโปรดเฉพาะใน Preview นี้')
  }

  function openDestination() {
    if (!detail) return
    if (detail.venueId) {
      setSelectedSessionId(detail.sessionNavigationOptions[0]?.sessionId ?? null)
      setDestination('venue')
      return
    }
    setDestination('session')
  }

  function togglePreviewTheme() {
    void setThemePreference(nextArenaMapPreviewTheme(themeMode))
  }

  if (destination === 'venue' && detail) {
    return <ArenaMapVenueDetail detail={detail} selectedSessionId={selectedSessionId} onBack={() => setDestination('map')} onFavorite={toggleFavorite} onSelectSession={setSelectedSessionId} onViewSession={() => setDestination('session')} />
  }

  if (destination === 'session' && detail) {
    return <PreviewSessionDestination detail={detail} onBack={() => setDestination(detail.venueId ? 'venue' : 'map')} styles={styles} theme={theme} />
  }

  return <View style={styles.root}>
    <ArenaMapSurface
      pins={pins}
      selectedId={selectedId}
      onPinPress={selectPin}
      onViewportChange={() => undefined}
      onUnavailable={() => setMapUnavailable(true)}
    />
    {mapUnavailable ? <View style={styles.mapLoading}>
      <MaterialCommunityIcons name="map-marker-off" size={28} color={theme.muted} />
      <Text style={styles.loadingText}>แผนที่ยังไม่พร้อมใน build นี้</Text>
    </View> : null}

    <View style={[styles.topOverlay, { paddingTop }]}> 
      <View style={styles.headerRow}>
        <PressableScale style={styles.roundButton} onPress={onExit} accessibilityRole="button" accessibilityLabel="ออกจากตัวอย่างแผนที่">
          <MaterialCommunityIcons name="chevron-left" size={26} color={theme.ink} />
        </PressableScale>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>BASKETBALL · DEV PREVIEW</Text>
          <Text style={styles.title}>สนามบาสใกล้ฉัน</Text>
        </View>
        <PressableScale style={styles.devBadge} onPress={togglePreviewTheme} accessibilityRole="button" accessibilityLabel={`เปลี่ยนเป็นธีม${themeMode === 'light' ? 'มืด' : 'สว่าง'}`}>
          <MaterialCommunityIcons name={themeMode === 'light' ? 'weather-sunny' : 'weather-night'} size={15} color={theme.bgElevated} />
          <Text style={styles.devBadgeText}>{themeMode === 'light' ? 'LIGHT' : 'DARK'}</Text>
        </PressableScale>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
        {ARENA_MAP_PREVIEW_SCENARIOS.map((candidate) => {
          const selected = scenario === candidate
          return <PressableScale key={candidate} style={[styles.scenarioButton, selected && styles.scenarioButtonSelected]} onPress={() => selectScenario(candidate)} accessibilityRole="button" accessibilityState={{ selected }}>
            <Text style={[styles.scenarioText, selected && styles.scenarioTextSelected]}>{scenarioLabel[candidate]}</Text>
          </PressableScale>
        })}
      </ScrollView>

      <View style={styles.contextPill} pointerEvents="none">
        <View style={[
          styles.contextDot,
          scenario === 'stale' && styles.contextDotWarning,
          (scenario === 'error' || scenario === 'expiring') && styles.contextDotError,
        ]} />
        <Text style={styles.contextText}>{fixture.label} · แตะหมุดเพื่อดูรายละเอียด</Text>
      </View>
      {localNote ? <Text style={styles.localNote}>{localNote}</Text> : null}
    </View>

    {detail && selectedId ? <ArenaMapDetailSheet detail={detail} distanceM={850} isStale={fixture.isStale} onFavorite={toggleFavorite} onClose={() => setSelectedId(null)} canView onViewVenue={openDestination} /> : null}

    {selectedId && fixture.hasBlockingError ? <View style={styles.errorSheet} accessibilityLiveRegion="polite">
      <Pressable onPress={() => setSelectedId(null)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="ปิดข้อผิดพลาด">
        <MaterialCommunityIcons name="close" size={22} color={theme.ink} />
      </Pressable>
      <View style={styles.errorIcon}><MaterialCommunityIcons name="cloud-alert" size={24} color={theme.risk} /></View>
      <Text style={styles.errorTitle}>โหลดรายละเอียดสนามไม่สำเร็จ</Text>
      <Text style={styles.errorBody}>หมุดและสนามอื่นยังแสดงบนแผนที่ตามปกติ</Text>
      <PressableScale style={styles.retryButton} onPress={() => selectScenario('live')} accessibilityRole="button" accessibilityLabel="ลองโหลดรายละเอียดสนามอีกครั้ง">
        <Text style={styles.retryText}>ลองใหม่</Text>
      </PressableScale>
    </View> : null}
  </View>
}

function PreviewSessionDestination({ detail, onBack, styles, theme }: { detail: ArenaMapPinDetail; onBack: () => void; styles: ReturnType<typeof createStyles>; theme: SportPalette }) {
  return <View style={styles.destinationRoot}>
    <View style={styles.destinationHeader}>
      <PressableScale style={styles.roundButton} onPress={onBack} accessibilityRole="button" accessibilityLabel="กลับ">
        <MaterialCommunityIcons name="chevron-left" size={26} color={theme.ink} />
      </PressableScale>
      <Text style={styles.destinationHeaderTitle}>รอบการแข่งขัน</Text>
      <View style={styles.localBadge}><Text style={styles.localBadgeText}>LOCAL</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.destinationContent}>
      <Text style={styles.destinationEyebrow}>{arenaMapDetailMetaLabel(detail.type, detail.format, null)}</Text>
      <Text style={styles.destinationTitle}>{detail.name}</Text>
      <Text style={styles.destinationOwner}>{detail.venueId ? 'ดูแลโดย' : 'จัดโดย'} {detail.ownerOrHost.label}</Text>
      {detail.liveScore ? <View style={styles.scoreCard}>
        <Text style={styles.scoreTeam}>{detail.liveScore.homeLabel}</Text>
        <Text style={styles.scoreValue}>{detail.liveScore.homeScore}–{detail.liveScore.awayScore}</Text>
        <Text style={styles.scoreTeam}>{detail.liveScore.awayLabel}</Text>
      </View> : <View style={styles.idleCard}><MaterialCommunityIcons name="basketball" size={24} color={theme.orange} /><Text style={styles.idleText}>ยังไม่มีรอบที่กำลังแข่ง</Text></View>}
      {detail.queuePreview.teams.length ? <View style={styles.infoCard}><Text style={styles.infoTitle}>คิวถัดไป</Text><Text style={styles.infoBody}>{detail.queuePreview.teams.join(' · ')}{detail.queuePreview.remainingCount ? ` +${detail.queuePreview.remainingCount}` : ''}</Text></View> : null}
      {detail.deadline ? <View style={styles.deadlineCard}><Text style={styles.infoTitle}>เวลาคงเหลือ</Text><Text style={styles.deadlineValue}>{arenaMapDeadlineLabel(detail.deadline, detail.serverTime)}</Text></View> : null}
      <Text style={styles.previewFootnote}>ข้อมูลในหน้านี้เป็นตัวอย่างสำหรับตรวจ UX เท่านั้น</Text>
    </ScrollView>
  </View>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaPage },
    mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: theme.arenaPage },
    loadingText: { color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.thaiMedium },
    topOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
    headerRow: { marginHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    roundButton: { width: 44, height: 44, borderRadius: Radius.pill, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center', shadowColor: theme.ink, shadowOpacity: .14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    headerCopy: { flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.lg, justifyContent: 'center', backgroundColor: theme.bgOverlay },
    eyebrow: { color: theme.orange, fontSize: 9, lineHeight: 13, fontFamily: Fonts?.rounded, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme.ink, fontSize: 22, lineHeight: 32, fontFamily: Fonts?.thaiHead },
    devBadge: { minWidth: 76, minHeight: 44, paddingHorizontal: 10, borderRadius: Radius.pill, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.ink },
    devBadgeText: { color: theme.bgElevated, fontSize: 11, lineHeight: 15, fontFamily: Fonts?.rounded, fontWeight: '900', letterSpacing: 1 },
    switcher: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: 6 },
    scenarioButton: { minHeight: 44, paddingHorizontal: 13, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.bgOverlay },
    scenarioButtonSelected: { backgroundColor: theme.ink, borderColor: theme.ink },
    scenarioText: { color: theme.ink, fontSize: 10, lineHeight: 14, fontFamily: Fonts?.rounded, fontWeight: '900', letterSpacing: .5 },
    scenarioTextSelected: { color: theme.bgElevated },
    contextPill: { alignSelf: 'center', marginTop: Spacing.sm, minHeight: 34, maxWidth: '88%', paddingHorizontal: 12, borderRadius: Radius.pill, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.bgOverlay },
    contextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.trust },
    contextDotWarning: { backgroundColor: theme.economy },
    contextDotError: { backgroundColor: theme.risk },
    contextText: { flexShrink: 1, color: theme.ink, fontSize: 11, lineHeight: 18, fontFamily: Fonts?.thaiMedium },
    localNote: { alignSelf: 'center', marginTop: 5, color: theme.muted, fontSize: 10, lineHeight: 16, fontFamily: Fonts?.thaiBody },
    errorSheet: { position: 'absolute', left: 12, right: 12, bottom: 18, padding: 20, borderRadius: 24, backgroundColor: theme.bgElevated, shadowColor: theme.ink, shadowOpacity: .16, shadowRadius: 20, elevation: 9 },
    closeButton: { position: 'absolute', top: 8, right: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    errorIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.riskSoft },
    errorTitle: { marginTop: 10, color: theme.ink, fontSize: 20, lineHeight: 30, fontFamily: Fonts?.thaiHead },
    errorBody: { marginTop: 3, maxWidth: '88%', color: theme.muted, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiBody },
    retryButton: { marginTop: 14, minHeight: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.orange },
    retryText: { color: OnAccent.onLight, fontSize: 16, lineHeight: 24, fontFamily: Fonts?.thaiMedium },
    destinationRoot: { flex: 1, backgroundColor: theme.arenaPage },
    destinationHeader: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    destinationHeaderTitle: { flex: 1, color: theme.ink, fontSize: 18, lineHeight: 28, fontFamily: Fonts?.thaiHead },
    localBadge: { minHeight: 32, paddingHorizontal: 10, borderRadius: Radius.pill, justifyContent: 'center', backgroundColor: theme.trustSoft },
    localBadgeText: { color: theme.trust, fontSize: 10, lineHeight: 14, fontFamily: Fonts?.rounded, fontWeight: '900' },
    destinationContent: { padding: 16, paddingBottom: 40, gap: 14 },
    destinationEyebrow: { color: theme.orange, fontSize: 12, lineHeight: 19, fontFamily: Fonts?.thaiMedium },
    destinationTitle: { color: theme.ink, fontSize: 30, lineHeight: 42, fontFamily: Fonts?.thaiHead },
    destinationOwner: { color: theme.muted, marginTop: -8, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiMedium },
    scoreCard: { padding: 18, borderRadius: Radius.xl, backgroundColor: theme.fightBg, alignItems: 'center', gap: 6 },
    scoreTeam: { color: theme.fightMuted, fontSize: 12, lineHeight: 19, fontFamily: Fonts?.thaiMedium },
    scoreValue: { color: theme.fightInk, fontSize: 44, lineHeight: 50, fontFamily: Fonts?.rounded, fontWeight: '900', fontStyle: 'italic', fontVariant: ['tabular-nums'] },
    idleCard: { minHeight: 100, borderRadius: Radius.xl, backgroundColor: theme.bgElevated, alignItems: 'center', justifyContent: 'center', gap: 8 },
    idleText: { color: theme.muted, fontSize: 14, lineHeight: 22, fontFamily: Fonts?.thaiBody },
    infoCard: { padding: 16, borderRadius: Radius.xl, backgroundColor: theme.bgElevated, gap: 5 },
    deadlineCard: { padding: 16, borderRadius: Radius.xl, backgroundColor: theme.riskSoft, gap: 5 },
    infoTitle: { color: theme.muted, fontSize: 12, lineHeight: 19, fontFamily: Fonts?.thaiMedium },
    infoBody: { color: theme.ink, fontSize: 17, lineHeight: 26, fontFamily: Fonts?.thaiMedium },
    deadlineValue: { color: theme.risk, fontSize: 24, lineHeight: 34, fontFamily: Fonts?.thaiHead, fontVariant: ['tabular-nums'] },
    previewFootnote: { color: theme.muted, fontSize: 11, lineHeight: 18, fontFamily: Fonts?.thaiBody },
  })
}
