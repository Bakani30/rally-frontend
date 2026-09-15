import { memo } from 'react'
import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { BasketballLobbyCourt, type BasketballCourtPhase } from '@/components/match/BasketballLobbyCourt'
import { BasketballLiveScoreboard, type BasketballLiveScoreboardProps } from '@/components/match/live/BasketballLiveScoreboard'
import { LobbyVaultHeader } from '@/components/match/LobbyVaultHeader'
import { LobbyActionDock } from '@/components/match/LobbyActionDock'
import { Spacing } from '@/constants/theme'
import type {
  BasketballLobbyCourtLayout,
  BasketballLobbyCourtParticipant,
  BasketballLobbyPositionKey,
} from '@/lib/match/basketballLobbyCourt'
import type { Side } from '@/types/match'

export type BasketballCourtLobbyAction = {
  key: string
  label: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  disabled?: boolean
  busy?: boolean
  tone?: 'primary' | 'quiet' | 'danger'
  onPress: () => void
}

export type BasketballCourtLobbyRefereeSlot = {
  label: string
  status: string
  icon: ComponentProps<typeof MaterialCommunityIcons>['name']
  avatarUrl?: string | null
  disabled?: boolean
  busy?: boolean
  onPress?: () => void
}

export type BasketballCourtLobbyScoreboard = {
  sideAScore: number
  sideBScore: number
  label?: string
}

export type BasketballCourtLiveToggle = {
  enabled: boolean
  busy: boolean
  onPress: () => void
}

type BasketballCourtLobbyStageProps = {
  formatLabel: string
  readyCountLabel: string
  potLabel: string | null
  myStakeLabel?: string | null
  scoreboard?: BasketballCourtLobbyScoreboard | null
  liveScoreboard?: BasketballLiveScoreboardProps | null
  liveToggle?: BasketballCourtLiveToggle
  joinCode: string | null
  refereeSlot?: BasketballCourtLobbyRefereeSlot
  layout: BasketballLobbyCourtLayout
  phase?: BasketballCourtPhase
  primaryAction: BasketballCourtLobbyAction
  sidecarAction: BasketballCourtLobbyAction | null
  secondaryActions: BasketballCourtLobbyAction[]
  positionBusy?: boolean
  onSelectPosition?: (input: { side: Side; positionKey: BasketballLobbyPositionKey }) => void
  onInviteToSlot?: (input: { side: Side; positionKey: BasketballLobbyPositionKey }) => void
  onPressParticipant?: (participant: BasketballLobbyCourtParticipant) => void
  canPressParticipant?: (participant: BasketballLobbyCourtParticipant) => boolean
  onCopyCode?: () => void
}

export const BasketballCourtLobbyStage = memo(function BasketballCourtLobbyStage({
  formatLabel,
  readyCountLabel,
  potLabel,
  myStakeLabel,
  scoreboard,
  liveScoreboard,
  liveToggle,
  joinCode,
  refereeSlot,
  layout,
  phase = 'lobby',
  primaryAction,
  sidecarAction,
  secondaryActions,
  positionBusy = false,
  onSelectPosition,
  onInviteToSlot,
  onPressParticipant,
  canPressParticipant,
  onCopyCode,
}: BasketballCourtLobbyStageProps) {
  return (
    <View style={styles.stage}>
      {liveScoreboard ? (
        <BasketballLiveScoreboard {...liveScoreboard} />
      ) : (
        <LobbyVaultHeader
          activityType={layout.activityType}
          sportLabel={layout.activityType === 'badminton' ? 'BADMINTON' : 'BASKETBALL'}
          formatLabel={formatLabel}
          readyCountLabel={readyCountLabel}
          potLabel={potLabel}
          scoreboard={scoreboard}
          joinCode={joinCode}
          refereeSlot={refereeSlot}
          onCopyCode={onCopyCode}
        />
      )}

      <BasketballLobbyCourt
        layout={layout}
        selecting={positionBusy}
        phase={phase}
        onSelectPosition={onSelectPosition}
        onInviteToSlot={onInviteToSlot}
        onPressParticipant={onPressParticipant}
        canPressParticipant={canPressParticipant}
      />

      <LobbyActionDock
        activityType={layout.activityType}
        primaryAction={primaryAction}
        myStakeLabel={myStakeLabel}
        sidecarAction={sidecarAction}
        secondaryActions={secondaryActions}
        liveToggle={liveToggle}
      />
    </View>
  )
})

const styles = StyleSheet.create({
  stage: {
    gap: Spacing.sm,
  },
})
