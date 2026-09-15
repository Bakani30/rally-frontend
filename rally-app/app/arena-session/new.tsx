import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'

import { PressableScale } from '@/components/motion/PressableScale'
import { useScreenInsets } from '@/components/layout/useScreenInsets'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAuth } from '@/hooks/useAuth'
import { useMyParties } from '@/hooks/useParty'
import { useRunLobbyLocation } from '@/hooks/useRunLobbyLocation'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useArenaSessionFlow } from '@/hooks/useArenaSessionFlow'
import {
  createArenaSessionCreateNavigationLatch,
  resolveArenaSessionArenaId,
  type ArenaSessionCreateNavigationPhase,
} from '@/lib/arena-sessions/arenaSessionService'
import { getHostedPartiesForArenaSession, selectPartyForArenaSession } from '@/lib/party/partyService'
import type { ArenaSessionActivity, ArenaSessionTeamSize } from '@/types/arenaSession'

const TEAM_SIZES: ArenaSessionTeamSize[] = [1, 2, 3, 5]

export default function NewArenaSessionScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { paddingTop, paddingBottom } = useScreenInsets({
    edges: ['top', 'bottom'],
    topPad: Spacing.md,
    bottomPad: 120,
  })
  const { user } = useAuth()
  const params = useLocalSearchParams<{ partyId?: string | string[] }>()
  const requestedPartyId = firstParam(params.partyId)
  const flow = useArenaSessionFlow({ userId: user?.id, enabled: Boolean(user) })
  const myPartiesQuery = useMyParties({ enabled: Boolean(user) })
  const [title, setTitle] = useState('Saturday Court')
  const [activityType, setActivityType] = useState<ArenaSessionActivity>('basketball')
  const [teamSize, setTeamSize] = useState<ArenaSessionTeamSize>(3)
  const [selectedPartyId, setSelectedPartyId] = useState<string | undefined>(requestedPartyId)
  const createNavigationLatch = useRef(createArenaSessionCreateNavigationLatch())
  const [createPhase, setCreatePhase] = useState<ArenaSessionCreateNavigationPhase>('idle')
  const location = useRunLobbyLocation({ enabled: createPhase !== 'idle' })
  const hostedParties = useMemo(() => getHostedPartiesForArenaSession(myPartiesQuery.data ?? [], {
    hostUserId: user?.id,
    activityType,
    teamSize,
  }), [activityType, myPartiesQuery.data, teamSize, user?.id])
  const defaultParty = useMemo(() => selectPartyForArenaSession(myPartiesQuery.data ?? [], {
    hostUserId: user?.id,
    activityType,
    teamSize,
    requestedPartyId,
  }), [activityType, myPartiesQuery.data, requestedPartyId, teamSize, user?.id])
  const selectedParty = hostedParties.find((party) => party.id === selectedPartyId) ?? null
  const isCreateFrozen = createPhase !== 'idle' || flow.createMutation.isPending

  useEffect(() => {
    if (isCreateFrozen) return
    if (selectedPartyId && hostedParties.some((party) => party.id === selectedPartyId)) return
    setSelectedPartyId(defaultParty?.id)
  }, [defaultParty?.id, hostedParties, isCreateFrozen, selectedPartyId])

  useEffect(() => {
    if (createPhase !== 'awaiting_location' || !location.warmStartLocation) return
    if (!createNavigationLatch.current.claimTransport()) return
    setCreatePhase('creating')

    const input = {
      title: title.trim(),
      activityType,
      teamSize,
      ruleText: 'Casual Arena Session',
      targetScore: 11,
      timeLimitSeconds: 600,
      joinMode: 'open' as const,
      mode: 'casual' as const,
      anchorLat: location.warmStartLocation.lat,
      anchorLng: location.warmStartLocation.lng,
    }

    void flow.createMutation.mutateAsync(input)
      .then((output) => {
        // This must happen before router.replace. React Query success and
        // snapshot invalidation can rerender this screen before the route is
        // committed, so state alone is not a re-entry guard.
        if (!createNavigationLatch.current.succeed()) return
        setCreatePhase('succeeded')
        const arenaId = resolveArenaSessionArenaId({}, output)
        router.replace({
          pathname: '/arena-session/[id]',
          params: { id: arenaId, ...(selectedPartyId ? { partyId: selectedPartyId } : {}) },
        } as never)
      })
      .catch((error: unknown) => {
        if (!createNavigationLatch.current.fail()) return
        setCreatePhase('idle')
        Alert.alert('สร้าง Session ไม่สำเร็จ', error instanceof Error ? error.message : 'ลองใหม่อีกครั้ง')
      })
  }, [activityType, createPhase, flow.createMutation, location.warmStartLocation, selectedPartyId, teamSize, title])

  useEffect(() => {
    if (createPhase !== 'awaiting_location' || !location.error) return
    if (!createNavigationLatch.current.fail()) return
    setCreatePhase('idle')
    Alert.alert('ต้องใช้ตำแหน่งสนาม', location.error)
  }, [createPhase, location.error])

  function handleCreate() {
    if (title.trim().length < 2 || !createNavigationLatch.current.begin()) return
    setCreatePhase('awaiting_location')
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.container, { paddingTop, paddingBottom }]}
      >
        <View style={styles.header}>
          <PressableScale
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="กลับ"
            disabled={isCreateFrozen}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={theme.arcadeCtaText} />
          </PressableScale>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CASUAL SESSION</Text>
            <Text style={styles.title}>สร้าง Session</Text>
            <Text style={styles.subtitle}>ตั้งสนามสั้น ๆ แล้วให้ Party เข้าแถวเดียวกัน</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>รายละเอียดสนาม</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="ชื่อ Session"
            placeholderTextColor={theme.mutedSoft}
            maxLength={80}
            editable={!isCreateFrozen}
          />
          <View style={styles.optionRow}>
            {(['basketball', 'badminton'] as const).map((option) => {
              const active = activityType === option
              return (
                <PressableScale
                  key={option}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => setActivityType(option)}
                  accessibilityRole="button"
                  accessibilityLabel={option}
                  disabled={isCreateFrozen}
                >
                  <MaterialCommunityIcons name={option === 'basketball' ? 'basketball' : 'badminton'} size={18} color={active ? theme.arcadeCtaText : theme.ink} />
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{option === 'basketball' ? 'บาส' : 'แบด'}</Text>
                </PressableScale>
              )
            })}
          </View>
          <Text style={styles.label}>ขนาดทีม</Text>
          <View style={styles.sizeRow}>
            {TEAM_SIZES.map((size) => {
              const active = teamSize === size
              return (
                <PressableScale
                  key={size}
                  style={[styles.sizeOption, active && styles.sizeOptionActive]}
                  onPress={() => setTeamSize(size)}
                  accessibilityRole="button"
                  accessibilityLabel={`${size} คนต่อทีม`}
                  disabled={isCreateFrozen}
                >
                  <Text style={[styles.sizeText, active && styles.sizeTextActive]}>{size}v{size}</Text>
                </PressableScale>
              )
            })}
          </View>
          {hostedParties.length > 1 ? (
            <View style={styles.partyPicker}>
              <Text style={styles.label}>เลือก Party</Text>
              {hostedParties.map((party) => (
                <PressableScale
                  key={party.id}
                  style={[styles.partyOption, selectedPartyId === party.id && styles.partyOptionActive]}
                  onPress={() => setSelectedPartyId(party.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`เลือก Party ${party.name}`}
                  disabled={isCreateFrozen}
                >
                  <Text style={styles.partyOptionText}>{party.name}</Text>
                  <Text style={styles.partyOptionMeta}>{party.team_size} คน/ทีม</Text>
                </PressableScale>
              ))}
            </View>
          ) : null}
          {selectedParty ? (
            <View style={styles.partySelected}>
              <Text style={styles.partySelectedTitle}>Party ที่เลือก: {selectedParty.name}</Text>
              <Text style={styles.hint}>คุณเป็น Host · รายละเอียด Party จะถูกโหลดในหน้า staging</Text>
            </View>
          ) : myPartiesQuery.isPending ? (
            <Text style={styles.hint}>กำลังหา Party ที่เข้ากับกีฬาและขนาดทีม...</Text>
          ) : myPartiesQuery.error ? (
            <Text style={styles.hint}>โหลด Party ไม่สำเร็จ · สร้าง Session ต่อได้โดยไม่ผูก Party</Text>
          ) : (
            <Text style={styles.hint}>ยังไม่มี Party Host ที่เข้ากับกีฬาและขนาดทีมนี้</Text>
          )}
          <Text style={styles.hint}>Session จะใช้ตำแหน่งปัจจุบันของคุณเป็นจุดสนามเมื่อกดสร้าง เพื่อให้ตรวจตำแหน่งฝั่ง Host ได้</Text>
        </View>

        {isCreateFrozen ? (
          <View style={styles.waitingPanel}>
            <ActivityIndicator size="small" color={theme.trust} />
            <Text style={styles.waitingText}>
              {location.error
                ? location.error
                : createPhase === 'awaiting_location' || location.isSearchingGps
                  ? 'กำลังหาตำแหน่งสนาม...'
                  : createPhase === 'succeeded'
                    ? 'กำลังเปิด Arena Session...'
                    : 'กำลังสร้าง Session...'}
            </Text>
          </View>
        ) : null}

        <PressableScale
          style={[styles.primaryButton, (title.trim().length < 2 || isCreateFrozen) && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={title.trim().length < 2 || isCreateFrozen}
          accessibilityRole="button"
          accessibilityLabel="สร้าง Arena Session"
        >
          <MaterialCommunityIcons name="stadium" size={18} color={theme.arcadeCtaText} />
          <Text style={styles.primaryButtonText}>สร้าง Arena Session</Text>
        </PressableScale>
      </ScrollView>
    </>
  )
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.arenaBg },
    container: { padding: 20, gap: Spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.xxl, borderWidth: 2, borderColor: theme.arcadeCabinetEdge, backgroundColor: theme.arcadePanel, padding: 14 },
    backButton: { width: 42, height: 42, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.arcadeCabinet },
    headerCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.trust, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    title: { color: theme.ink, fontSize: 28, lineHeight: 33, fontWeight: '900' },
    subtitle: { color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '800' },
    panel: { borderRadius: Radius.xxl, borderWidth: 2, borderColor: theme.arcadeCabinetEdge, backgroundColor: theme.arcadePanel, padding: 14, gap: 12 },
    panelTitle: { color: theme.ink, fontSize: 16, fontWeight: '900' },
    input: { minHeight: 48, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: theme.lineStrong, backgroundColor: theme.arcadePanelAlt, color: theme.ink, fontSize: 14, fontWeight: '800', paddingHorizontal: 12 },
    optionRow: { flexDirection: 'row', gap: 8 },
    option: { flex: 1, minHeight: 46, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: theme.lineStrong, backgroundColor: theme.arcadePanelAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    optionActive: { backgroundColor: theme.orange, borderColor: theme.orange },
    optionText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    optionTextActive: { color: theme.arcadeCtaText },
    label: { color: theme.muted, fontSize: 11, fontWeight: '900' },
    sizeRow: { flexDirection: 'row', gap: 8 },
    sizeOption: { flex: 1, minHeight: 44, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: theme.lineStrong, backgroundColor: theme.arcadePanelAlt, alignItems: 'center', justifyContent: 'center' },
    sizeOptionActive: { backgroundColor: theme.arcadeCabinet, borderColor: theme.arcadeCabinet },
    sizeText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    sizeTextActive: { color: theme.chalk },
    hint: { color: theme.muted, fontSize: 11, lineHeight: 17, fontWeight: '700' },
    partyPicker: { gap: 8 },
    partyOption: { minHeight: 46, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: theme.lineStrong, backgroundColor: theme.arcadePanelAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
    partyOptionActive: { borderColor: theme.trust, backgroundColor: theme.trustSoft },
    partyOptionText: { color: theme.ink, fontSize: 13, fontWeight: '900' },
    partyOptionMeta: { color: theme.muted, fontSize: 11, fontWeight: '800' },
    partySelected: { borderRadius: Radius.lg, backgroundColor: theme.arcadePanelAlt, padding: 10, gap: 2 },
    partySelectedTitle: { color: theme.ink, fontSize: 12, fontWeight: '900' },
    waitingPanel: { minHeight: 46, borderRadius: Radius.lg, backgroundColor: theme.arcadeCabinet, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
    waitingText: { color: theme.chalk, fontSize: 12, fontWeight: '800' },
    primaryButton: { minHeight: 50, borderRadius: Radius.lg, backgroundColor: theme.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryButtonText: { color: theme.arcadeCtaText, fontSize: 14, fontWeight: '900' },
    buttonDisabled: { opacity: 0.5 },
  })
}
