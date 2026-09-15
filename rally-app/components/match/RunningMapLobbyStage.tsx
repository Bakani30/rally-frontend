import { useMemo, useRef, useState, type ComponentProps } from 'react'
import {
  Animated,
  PanResponder,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { MapLibreRunView } from '@/components/maps/MapLibreRunView'
import { PressableScale } from '@/components/motion/PressableScale'
import { ScreenBackButton } from '@/components/navigation/ScreenBackButton'
import { ProfileAvatar } from '@/components/profile/ProfileAvatar'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import type { RunLobbyLocationState } from '@/hooks/useRunLobbyLocation'
import type {
  RunningLobbyLayout,
  RunningLobbyRefereeSlot,
  RunningLobbySlot,
  RunningLobbyParticipantToken,
} from '@/lib/match/runningLobbyLayout'
import type { TeammateView } from '@/lib/run-tracking/team/teamRunPresenceState'
import {
  RunningMapLobbyArena as Arena,
  runningMapLobbyStageStyles as styles,
} from './runningMapLobbyStageStyles'

export type RunningMapLobbyAction = {
  key: string
  label: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  disabled?: boolean
  busy?: boolean
  tone?: 'primary' | 'quiet' | 'danger'
  onPress: () => void
}

export type RunningMapLobbyRefereeAction = {
  label: string
  status: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  disabled?: boolean
  busy?: boolean
  onPress?: () => void
}

export type RunningMapLobbyLiveStats = {
  teammateDistanceLabel: string
  teamDistanceLabel: string
  teamPointsLabel: string
}

type RunningMapLobbyStageProps = {
  layout: RunningLobbyLayout
  location: RunLobbyLocationState
  potLabel: string | null
  joinCode: string | null
  topInset?: number
  liveStats: RunningMapLobbyLiveStats
  teammates?: TeammateView[]
  participantDistanceLabels?: Record<string, string>
  refereeAction?: RunningMapLobbyRefereeAction | null
  primaryAction: RunningMapLobbyAction
  sidecarAction: RunningMapLobbyAction | null
  secondaryActions: RunningMapLobbyAction[]
  onCopyCode?: () => void
  onPressParticipant?: (participant: RunningLobbyParticipantToken) => void
}

export function RunningMapLobbyStage({
  layout,
  location,
  potLabel,
  joinCode,
  topInset = 0,
  liveStats,
  teammates = [],
  participantDistanceLabels = {},
  refereeAction,
  primaryAction,
  sidecarAction,
  secondaryActions,
  onCopyCode,
  onPressParticipant,
}: RunningMapLobbyStageProps) {
  const { height } = useWindowDimensions()
  const gpsState = getGpsState(location)
  const [sheetExpanded, setSheetExpanded] = useState(true)
  const sheetDragY = useRef(new Animated.Value(0)).current
  const sheetTouchStartY = useRef<number | null>(null)
  const sheetTouchLastY = useRef<number | null>(null)
  const rosterScrollOffsetY = useRef(0)
  const rosterTouchStartY = useRef<number | null>(null)
  const rosterTouchLastY = useRef<number | null>(null)
  const secondaryVisibleActions = secondaryActions.filter((action) => action.tone !== 'danger')
  const headerModeLabel = getHeaderModeLabel(layout.mode)
  const stageHeight = Math.max(720, Math.round(height))
  const overlayTop = Math.max(16, topInset + 8)
  const statusTop = overlayTop + 74
  const liveUserIds = new Set(teammates.map((teammate) => teammate.location.userId))
  const liveDistanceLabels = Object.fromEntries(
    teammates
      .filter((teammate) => typeof teammate.location.distanceMeters === 'number')
      .map((teammate) => [teammate.location.userId, formatRosterDistance(teammate.location.distanceMeters ?? 0)]),
  )
  const sheetPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        const nextY = sheetExpanded
          ? Math.max(0, gesture.dy)
          : Math.min(0, gesture.dy)
        sheetDragY.setValue(nextY)
      },
      onPanResponderRelease: (_event, gesture) => {
        Animated.spring(sheetDragY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          mass: 0.75,
          useNativeDriver: true,
        }).start()
        if (gesture.dy > 28 || gesture.vy > 0.45) {
          setSheetExpanded(false)
          return
        }
        if (gesture.dy < -28 || gesture.vy < -0.45) {
          setSheetExpanded(true)
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetDragY, {
          toValue: 0,
          damping: 22,
          stiffness: 260,
          mass: 0.75,
          useNativeDriver: true,
        }).start()
      },
    }),
    [sheetDragY, sheetExpanded],
  )
  const handlePressTeammate = (userId: string) => {
    const participant = layout.slots.find((slot) => slot.participant?.userId === userId)?.participant
    if (participant) onPressParticipant?.(participant)
  }
  const handleSheetTouchStart = (event: GestureResponderEvent) => {
    sheetTouchStartY.current = event.nativeEvent.pageY
    sheetTouchLastY.current = event.nativeEvent.pageY
  }
  const handleSheetTouchMove = (event: GestureResponderEvent) => {
    sheetTouchLastY.current = event.nativeEvent.pageY
  }
  const handleSheetTouchEnd = () => {
    const startY = sheetTouchStartY.current
    const lastY = sheetTouchLastY.current
    sheetTouchStartY.current = null
    sheetTouchLastY.current = null
    if (startY == null || lastY == null) return
    const deltaY = lastY - startY
    if (deltaY > 10) {
      setSheetExpanded(false)
      return
    }
    if (deltaY < -10) setSheetExpanded(true)
  }
  const handleRosterScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < -8) setSheetExpanded(false)
  }
  const handleRosterScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    rosterScrollOffsetY.current = event.nativeEvent.contentOffset.y
  }
  const handleRosterTouchStart = (event: GestureResponderEvent) => {
    rosterTouchStartY.current = event.nativeEvent.pageY
    rosterTouchLastY.current = event.nativeEvent.pageY
  }
  const handleRosterTouchMove = (event: GestureResponderEvent) => {
    rosterTouchLastY.current = event.nativeEvent.pageY
  }
  const handleRosterTouchEnd = () => {
    const startY = rosterTouchStartY.current
    const lastY = rosterTouchLastY.current
    rosterTouchStartY.current = null
    rosterTouchLastY.current = null
    if (startY == null || lastY == null) return
    if (rosterScrollOffsetY.current <= 1 && lastY - startY > 30) setSheetExpanded(false)
  }

  return (
    <View style={[styles.stage, { height: stageHeight }]}>
      <View style={styles.mapShell}>
        <MapLibreRunView
          path={[]}
          warmStartLocation={location.warmStartLocation}
          isLive={false}
          lockCameraToUser
          showStylePicker={false}
          showRecenterControl={false}
          tone="runLight"
          preferCockpitDefaultStyle
          mapBorderRadius={0}
          teammates={teammates}
          teammateRelation={layout.mode === 'crew_map' ? 'ally' : 'rival'}
          onPressTeammate={handlePressTeammate}
        />
        <View pointerEvents="none" style={styles.mapMist} />
        <View style={[styles.floatingHeader, { top: overlayTop }]}>
          <ScreenBackButton
            style={styles.headerBack}
            backgroundColor={Arena.surfaceRaised}
            borderColor={Arena.border}
            iconColor={Arena.text}
          />
          <View style={styles.headerTitleBlock}>
            <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
              {headerModeLabel}
            </Text>
          </View>
          <View style={styles.headerRightRail}>
            <MiniChip icon="account-check-outline" label={`${layout.readyCountLabel}`} />
            {joinCode && onCopyCode ? (
              <PressableScale style={styles.codeChip} onPress={onCopyCode} accessibilityRole="button" accessibilityLabel={`คัดลอกรหัส ${joinCode}`}>
                <Text style={styles.codeText}>{joinCode}</Text>
              </PressableScale>
            ) : null}
          </View>
        </View>
        <View style={[styles.mapStatusRail, { top: statusTop }]} pointerEvents="box-none">
          <GpsStatusChip state={gpsState} />
          <LiveStatChip icon="account-multiple-outline" label="เพื่อน" value={liveStats.teammateDistanceLabel} />
          <LiveStatChip icon="map-marker-distance" label="รวม" value={liveStats.teamDistanceLabel} />
          <LiveStatChip
            icon="star-four-points-outline"
            label="แต้ม"
            value={liveStats.teamPointsLabel}
            tone="points"
          />
        </View>
      </View>

      <Animated.View
        style={[
          styles.bottomRail,
          !sheetExpanded && styles.bottomRailCollapsed,
          { transform: [{ translateY: sheetDragY }] },
        ]}
        {...sheetPanResponder.panHandlers}
      >
        <View
          style={styles.sheetGestureZone}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={handleSheetTouchEnd}
          accessibilityState={{ expanded: sheetExpanded }}
          accessibilityLabel={sheetExpanded ? 'ปัดลงเพื่อพับรายชื่อผู้วิ่ง' : 'ปัดขึ้นเพื่อเปิดรายชื่อผู้วิ่ง'}
          {...sheetPanResponder.panHandlers}
        >
          <View style={styles.sheetHandleRow}>
            <View style={styles.sheetHandle} />
            <MaterialCommunityIcons
              name={sheetExpanded ? 'chevron-down' : 'chevron-up'}
              size={16}
              color={Arena.muted}
            />
          </View>
          <View style={styles.rosterHeader}>
            <View style={styles.rosterTitleBlock}>
              <Text style={styles.rosterTitle}>Runners</Text>
              <Text style={styles.rosterMeta} numberOfLines={1}>
                {layout.readyCountLabel} ready{potLabel ? ` | ${potLabel}` : ''}
              </Text>
            </View>
            <View style={styles.rosterLivePill}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color={Arena.trust} />
              <Text style={styles.rosterLiveText}>{liveUserIds.size} live</Text>
            </View>
          </View>
        </View>
        {sheetExpanded ? (
          <ScrollView
            style={styles.rosterList}
            contentContainerStyle={styles.rosterListContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            bounces
            alwaysBounceVertical
            scrollEventThrottle={16}
            onScroll={handleRosterScroll}
            onScrollEndDrag={handleRosterScrollEndDrag}
            onTouchStart={handleRosterTouchStart}
            onTouchMove={handleRosterTouchMove}
            onTouchEnd={handleRosterTouchEnd}
            onTouchCancel={handleRosterTouchEnd}
          >
            {layout.slots.map((slot) => (
            <RosterSlotRow
              key={slot.key}
              slot={slot}
              live={!!slot.participant && liveUserIds.has(slot.participant.userId)}
              distanceLabel={slot.participant
                ? liveDistanceLabels[slot.participant.userId] ??
                  participantDistanceLabels[slot.participant.userId] ??
                  '0 m'
                : null}
              onPressParticipant={onPressParticipant}
            />
            ))}
            {layout.refereeSlot ? (
              <RefereeRosterRow slot={layout.refereeSlot} action={refereeAction} />
            ) : null}
          </ScrollView>
        ) : null}
        <View style={styles.primaryActionDock}>
          <ActionButton action={primaryAction} variant="primary" />
          {sidecarAction ? <ActionButton action={sidecarAction} variant="sidecar" /> : null}
        </View>
        {sheetExpanded && secondaryVisibleActions.length > 0 ? (
          <View style={styles.secondaryRow}>
            {secondaryVisibleActions.map((action) => (
              <ActionButton key={action.key} action={action} />
            ))}
          </View>
        ) : null}
      </Animated.View>
    </View>
  )
}

function getHeaderModeLabel(mode: RunningLobbyLayout['mode']) {
  if (mode === 'crew_map') return 'Team Run'
  if (mode === 'one_v_one_5k') return '5K Pace'
  return 'Referee Result'
}

function LiveStatChip({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
  value: string
  tone?: 'default' | 'points'
}) {
  return (
    <View style={[styles.liveStatChip, tone === 'points' && styles.liveStatChipPoints]}>
      <MaterialCommunityIcons
        name={icon}
        size={12}
        color={tone === 'points' ? Arena.economy : Arena.trust}
      />
      <Text style={[styles.liveStatLabel, tone === 'points' && styles.liveStatLabelPoints]}>{label}</Text>
      <Text style={[styles.liveStatValue, tone === 'points' && styles.liveStatValuePoints]}>{value}</Text>
    </View>
  )
}

function GpsStatusChip({
  state,
}: {
  state: ReturnType<typeof getGpsState>
}) {
  return (
    <View style={[
      styles.gpsStatusChip,
      state.quiet && styles.gpsStatusChipQuiet,
      state.tone === 'danger' && styles.gpsStatusChipDanger,
    ]}>
      {!state.quiet && state.label ? (
        <Text style={[styles.gpsStatusText, { color: state.color }]}>{state.label}</Text>
      ) : null}
      <MaterialCommunityIcons
        name={state.icon}
        size={state.quiet ? 18 : 17}
        color={state.color}
      />
    </View>
  )
}

function RosterSlotRow({
  slot,
  live,
  distanceLabel,
  onPressParticipant,
}: {
  slot: RunningLobbySlot
  live: boolean
  distanceLabel: string | null
  onPressParticipant?: (participant: RunningLobbyParticipantToken) => void
}) {
  const participant = slot.participant
  const invite = slot.invite
  const occupied = slot.state === 'occupied'
  const pending = slot.state === 'pending'
  const label = participant?.name ?? invite?.name ?? slot.label
  const initials = participant?.initials ?? invite?.initials ?? slot.shortLabel
  const statusLabel = occupied
    ? participant?.isMe ? 'YOU' : live ? 'LIVE' : participant?.accepted ? 'NO GPS' : 'WAITING'
    : pending ? 'INVITED' : 'OPEN'
  const roleLabel = slot.side === 1
    ? 'Runner B'
    : slot.side === 0 && slot.key.startsWith('side:')
      ? 'Runner A'
      : slot.label

  return (
    <PressableScale
      style={[
        styles.rosterRow,
        occupied && styles.rosterRowOccupied,
      ]}
      disabled={!participant || !onPressParticipant}
      onPress={() => participant && onPressParticipant?.(participant)}
      accessibilityRole={participant ? 'button' : undefined}
      accessibilityLabel={participant ? `ดู ${participant.name}` : roleLabel}
    >
      <View style={styles.rosterAvatarWrap}>
        {participant ? (
          <ProfileFrame frameAssetRef={null} size={38}>
            <ProfileAvatar avatarUrl={participant.avatarUrl} initials={initials} size={38} />
          </ProfileFrame>
        ) : (
          <View style={[styles.rosterAvatarFallback, pending && styles.rosterAvatarPending]}>
            <Text style={styles.rosterAvatarText}>{initials}</Text>
          </View>
        )}
      </View>
      <View style={styles.rosterCopy}>
        <View style={styles.rosterNameRow}>
          <Text style={styles.rosterName} numberOfLines={1}>{label}</Text>
          {occupied && participant?.isHost ? (
            <MaterialCommunityIcons name="crown-outline" size={13} color={Arena.economy} />
          ) : null}
        </View>
        <Text style={styles.rosterRole} numberOfLines={1}>
          {distanceLabel ? `${roleLabel} | ${distanceLabel}` : roleLabel}
        </Text>
      </View>
      <View style={[
        styles.rosterStatusPill,
        live && styles.rosterStatusLive,
        !occupied && styles.rosterStatusQuiet,
      ]}>
        <Text style={[
          styles.rosterStatusText,
          live && styles.rosterStatusTextLive,
        ]}>
          {statusLabel}
        </Text>
      </View>
    </PressableScale>
  )
}

function RefereeRosterRow({
  slot,
  action,
}: {
  slot: RunningLobbyRefereeSlot
  action?: RunningMapLobbyRefereeAction | null
}) {
  const disabled = !action?.onPress || action.disabled || action.busy
  const pending = slot.state === 'invited'
  // Pending prefers the action label ("รอตอบรับ · <name>") — the referee token
  // name would otherwise win and hide the waiting state.
  const label = pending
    ? action?.label ?? slot.label
    : slot.referee?.name ?? action?.label ?? slot.label
  const status = action?.busy ? 'ADDING' : action?.status ?? (slot.state === 'assigned' ? 'ASSIGNED' : 'REF SLOT')

  return (
    <PressableScale
      style={[
        styles.rosterRow,
        styles.refRosterRow,
        slot.state === 'assigned' && styles.refRosterAssigned,
        pending && styles.refRosterPending,
        disabled && styles.rosterRowDisabled,
      ]}
      onPress={() => action?.onPress?.()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Running referee"
    >
      <View style={styles.refIcon}>
        <MaterialCommunityIcons
          name={action?.icon ?? 'whistle-outline'}
          size={15}
          color={slot.state === 'assigned' ? Arena.trust : pending ? Arena.warning : Arena.accent}
        />
      </View>
      <View style={styles.rosterCopy}>
        <Text style={styles.rosterName} numberOfLines={1}>{label}</Text>
        <Text style={styles.rosterRole} numberOfLines={1}>Referee</Text>
      </View>
      <View style={styles.rosterStatusPill}>
        <Text style={styles.rosterStatusText}>{status}</Text>
      </View>
    </PressableScale>
  )
}

function MiniChip({
  icon,
  label,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  label: string
}) {
  return (
    <View style={styles.miniChip}>
      <MaterialCommunityIcons name={icon} size={13} color={Arena.mutedStrong} />
      <Text style={styles.miniChipText}>{label}</Text>
    </View>
  )
}

function ActionButton({
  action,
  variant = 'secondary',
}: {
  action: RunningMapLobbyAction
  variant?: 'primary' | 'sidecar' | 'secondary'
}) {
  const disabled = action.disabled || action.busy
  return (
    <PressableScale
      style={[
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        variant === 'sidecar' && styles.actionButtonSidecar,
        action.tone === 'danger' && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={action.onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons
        name={action.busy ? 'loading' : action.icon}
        size={17}
        color={action.tone === 'danger' ? Arena.danger : Arena.text}
      />
      <Text style={[
        styles.actionButtonText,
        variant === 'primary' && styles.actionButtonTextPrimary,
        action.tone === 'danger' && styles.actionButtonTextDanger,
      ]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {action.label}
      </Text>
    </PressableScale>
  )
}

function getGpsState(location: RunLobbyLocationState): {
  label: string | null
  color: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  tone: 'normal' | 'danger'
  quiet: boolean
} {
  if (location.permission === 'requesting') {
    return { label: 'LOCK', color: Arena.warning, icon: 'crosshairs-question', tone: 'normal', quiet: false }
  }
  if (location.permission === 'denied') {
    return { label: 'OFF', color: Arena.danger, icon: 'map-marker-off-outline', tone: 'danger', quiet: false }
  }
  if (location.warmStartLocation) {
    return { label: null, color: Arena.trust, icon: 'signal-cellular-3', tone: 'normal', quiet: true }
  }
  if (location.isSearchingGps) {
    return { label: 'LOCK', color: Arena.warning, icon: 'crosshairs-gps', tone: 'normal', quiet: false }
  }
  return { label: 'MAP', color: Arena.mutedStrong, icon: 'map-outline', tone: 'normal', quiet: false }
}

function formatRosterDistance(distanceMeters: number): string {
  return `${(Math.max(0, distanceMeters) / 1000).toFixed(2)} km`
}
