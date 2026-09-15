import { StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ContributionEditor } from '@/components/match/ContributionEditor'
import { Radius, Sport, Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { matchesTabDictionary } from '@/lib/i18n/dictionaries/matchesTab'
import type { ContributionEntry, SubmissionActivityType } from '@/lib/activities/submission/submissionTypes'
import type { TeamScoreReadiness } from '@/lib/match/teamSportResultMoment'
import type { WearScoreDraft } from '@/stores/wearScoreDraftStore'
import type { MatchParticipant, Side } from '@/types/match'

type TeamSportSubmitPanelProps = {
  activityType: SubmissionActivityType
  teamSizePerSide: number
  mySide: Side | undefined | null
  teamScore: string
  onTeamScoreChange: (score: string) => void
  myTeamParticipants: MatchParticipant[]
  contributions: ContributionEntry[]
  onContributionsChange: (contributions: ContributionEntry[]) => void
  teamScoreForSummary: number | null
  readiness: TeamScoreReadiness
  canUseWearScoreDraft: boolean
  wearScoreDraft: WearScoreDraft | undefined
}

export function TeamSportSubmitPanel({
  activityType,
  teamSizePerSide,
  mySide,
  teamScore,
  onTeamScoreChange,
  myTeamParticipants,
  contributions,
  onContributionsChange,
  teamScoreForSummary,
  readiness,
  canUseWearScoreDraft,
  wearScoreDraft,
}: TeamSportSubmitPanelProps) {
  const { t } = useI18n(matchesTabDictionary)
  const activeSide = mySide === 0 || mySide === 1 ? mySide : null

  return (
    <View style={styles.stack}>
      <TeamScoreVault
        activityType={activityType === 'badminton' ? 'badminton' : 'basketball'}
        teamSizePerSide={teamSizePerSide}
        side0Score={activeSide === 0 ? teamScore : ''}
        side1Score={activeSide === 1 ? teamScore : ''}
        editable={activeSide !== null}
        onSide0ScoreChange={activeSide === 0 ? onTeamScoreChange : undefined}
        onSide1ScoreChange={activeSide === 1 ? onTeamScoreChange : undefined}
        readinessLabel={readiness.label}
        readinessTone={READINESS_TONE[readiness.kind]}
      />

      {canUseWearScoreDraft && wearScoreDraft && (
        <View style={styles.wearCard}>
          <MaterialCommunityIcons name="watch-variant" size={18} color={Sport.green} />
          <View style={{ flex: 1 }}>
            <Text style={styles.wearTitle}>{t('wearScoreDraftTitle')}</Text>
            <Text style={styles.wearHint}>{t('wearScoreDraftHint', { count: wearScoreDraft.events.length })}</Text>
          </View>
          <Text style={styles.wearScore}>{wearScoreDraft.teamScore} {t('ptsUnitLower')}</Text>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>{t('playerContributionsLabel')}</Text>
          {teamScoreForSummary !== null && (
            <Text style={styles.sectionMeta}>{t('ptsTotalLabel', { count: teamScoreForSummary })}</Text>
          )}
        </View>

        {myTeamParticipants.length === 1 ? (
          <View style={styles.autoContribution}>
            <View style={styles.avatarDot}>
              <Text style={styles.avatarDotText}>{activeSide === 1 ? 'B' : 'A'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoTitle}>{t('soloSideScoreTitle')}</Text>
              <Text style={styles.autoHint}>{t('soloSideScoreHint')}</Text>
            </View>
            <Text style={styles.autoPoints}>{teamScoreForSummary ?? 0} {t('ptsUnitLower')}</Text>
          </View>
        ) : (
          <ContributionEditor
            participants={myTeamParticipants}
            contributions={contributions}
            onChange={onContributionsChange}
            teamScore={teamScoreForSummary}
          />
        )}
      </View>
    </View>
  )
}

export type TeamScoreVaultProps = {
  activityType: 'basketball' | 'badminton'
  teamSizePerSide: number
  side0Score: string
  side1Score: string
  editable: boolean
  onSide0ScoreChange?: (value: string) => void
  onSide1ScoreChange?: (value: string) => void
  readinessLabel: string
  readinessTone: 'pending' | 'ready' | 'risk' | 'confirmed'
}

export function TeamScoreVault({
  activityType,
  teamSizePerSide,
  side0Score,
  side1Score,
  editable,
  onSide0ScoreChange,
  onSide1ScoreChange,
  readinessLabel,
  readinessTone,
}: TeamScoreVaultProps) {
  const tone = VAULT_READINESS_TONE[readinessTone]
  const side0Editable = editable && Boolean(onSide0ScoreChange)
  const side1Editable = editable && Boolean(onSide1ScoreChange)
  const showYouTag = side0Editable !== side1Editable

  return (
    <View style={styles.scoreboard}>
      <View style={styles.topRow}>
        <View style={styles.kickerRow}>
          <MaterialCommunityIcons
            name={activityType === 'basketball' ? 'basketball' : 'badminton'}
            size={18}
            color={Sport.amber}
          />
          <Text style={styles.kicker}>{activityType.toUpperCase()}</Text>
        </View>
        <Text style={styles.teamSize}>{teamSizePerSide}v{teamSizePerSide}</Text>
      </View>

      <View style={styles.sidesRow}>
        <ScoreSide
          side={0}
          editable={side0Editable}
          showYouTag={showYouTag && side0Editable}
          score={side0Score}
          onScoreChange={onSide0ScoreChange}
        />
        <Text style={styles.versus}>VS</Text>
        <ScoreSide
          side={1}
          editable={side1Editable}
          showYouTag={showYouTag && side1Editable}
          score={side1Score}
          onScoreChange={onSide1ScoreChange}
        />
      </View>

      <View style={[styles.readyPill, { borderColor: tone.border, backgroundColor: tone.bg }]}>
        <MaterialCommunityIcons name={tone.icon} size={15} color={tone.fg} />
        <Text style={[styles.readyText, { color: tone.fg }]}>{readinessLabel}</Text>
      </View>
    </View>
  )
}

type ScoreSideProps = {
  side: Side
  editable: boolean
  showYouTag: boolean
  score: string
  onScoreChange?: (score: string) => void
}

function ScoreSide({ side, editable, showYouTag, score, onScoreChange }: ScoreSideProps) {
  const { t } = useI18n(matchesTabDictionary)
  const color = side === 0 ? Sport.red : Sport.blue
  const sideLetter = side === 0 ? 'A' : 'B'
  return (
    <View style={[styles.sidePanel, editable && { borderColor: color, backgroundColor: side === 0 ? Sport.redSoft : Sport.blueSoft }]}>
      <Text style={[styles.sideLabel, { color }]}>{t('sideLabelWithLetter', { side: sideLetter })}</Text>
      {editable ? (
        <TextInput
          style={styles.scoreInput}
          placeholder="0"
          placeholderTextColor={Sport.mutedSoft}
          keyboardType="number-pad"
          value={score}
          onChangeText={onScoreChange}
          accessibilityLabel={t('sideScoreA11y', { side: sideLetter })}
        />
      ) : (
        <View style={styles.waitingScore}>
          <Text style={styles.waitingDash}>--</Text>
          <Text style={styles.waitingText}>{t('waitingLabel')}</Text>
        </View>
      )}
      {showYouTag && <Text style={styles.youTag}>{t('youLabel')}</Text>}
    </View>
  )
}

const READINESS_TONE: Record<
  TeamScoreReadiness['kind'],
  TeamScoreVaultProps['readinessTone']
> = {
  needs_score: 'pending',
  needs_contributions: 'pending',
  over_contributed: 'risk',
  ready: 'ready',
}

const VAULT_READINESS_TONE: Record<
  TeamScoreVaultProps['readinessTone'],
  {
    fg: string
    bg: string
    border: string
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
  }
> = {
  pending: { fg: Sport.amber, bg: Sport.amberSoft, border: Sport.lineStrong, icon: 'numeric' },
  ready: { fg: Sport.green, bg: Sport.greenSoft, border: Sport.lineStrong, icon: 'shield-check' },
  risk: { fg: Sport.red, bg: Sport.redSoft, border: Sport.lineStrong, icon: 'alert-circle-outline' },
  confirmed: { fg: Sport.green, bg: Sport.greenSoft, border: Sport.lineStrong, icon: 'check-circle-outline' },
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.md },
  scoreboard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.lineStrong,
    backgroundColor: Sport.fightPanel,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: {
    color: Sport.fightInk,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  teamSize: {
    color: Sport.fightMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sidesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
  },
  versus: {
    alignSelf: 'center',
    color: Sport.amber,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sidePanel: {
    flex: 1,
    minHeight: 132,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.fightLine,
    backgroundColor: Sport.arcadePanelAlt,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  scoreInput: {
    minWidth: 86,
    minHeight: 58,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    color: Sport.fightInk,
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  waitingScore: { alignItems: 'center', gap: 2 },
  waitingDash: {
    color: Sport.fightInkSoft,
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  waitingText: {
    color: Sport.fightMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  youTag: {
    color: Sport.fightInk,
    backgroundColor: Sport.green,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    overflow: 'hidden',
  },
  readyPill: {
    minHeight: 40,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: Spacing.md,
  },
  readyText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  wearCard: {
    minHeight: 60,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: `${Sport.green}55`,
    backgroundColor: Sport.greenSoft,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wearTitle: { color: Sport.ink, fontSize: 14, fontWeight: '900' },
  wearHint: { color: Sport.muted, fontSize: 12, marginTop: 2 },
  wearScore: {
    color: Sport.green,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  label: {
    color: Sport.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sectionMeta: {
    color: Sport.amber,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  autoContribution: {
    minHeight: 64,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surface,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarDot: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Sport.surfaceStrong,
  },
  avatarDotText: {
    color: Sport.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  autoTitle: { color: Sport.ink, fontSize: 14, fontWeight: '900' },
  autoHint: { color: Sport.muted, fontSize: 12, marginTop: 2 },
  autoPoints: {
    color: Sport.amber,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
})
