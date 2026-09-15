import { useEffect, useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Circle, Line, Rect } from 'react-native-svg'

import {
  buildArenaCourtMarkers,
  type ArenaCourtMarker,
} from '@/components/arena-session/arenaSessionLiveCourtGeometry'
import { createArenaSessionLiveCourtStyles } from '@/components/arena-session/arenaSessionLiveCourtStyles'
import { OnAccent, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { ArenaSessionActivity, ArenaSessionSnapshot } from '@/types/arenaSession'

type LiveRound = NonNullable<ArenaSessionSnapshot['liveRound']>
type LiveSide = LiveRound['champion']
type LiveMember = LiveSide['members'][number]
type Team = ArenaSessionSnapshot['teams'][number]

const BASKETBALL_COURT = require('../../assets/images/courts/basketball-court-5v5.png')
const BADMINTON_COURT = require('../../assets/images/courts/badminton-court.png')

export type ArenaSessionLiveCourtProps = {
  liveRound: LiveRound
  teams: Team[]
  activityType: ArenaSessionActivity
  startedAt?: string | null
  endedAt?: string | null
}

type ArenaSessionCourtPreviewProps = {
  activityType: ArenaSessionActivity
}

export function ArenaSessionCourtPreview({ activityType }: ArenaSessionCourtPreviewProps) {
  const theme = useSportTheme()
  const styles = createArenaSessionLiveCourtStyles(theme)

  return (
    <View style={styles.previewCourt} accessibilityLabel="สนามแข่งขัน">
      <Image
        source={activityType === 'basketball' ? BASKETBALL_COURT : BADMINTON_COURT}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <View style={styles.previewShade} />
    </View>
  )
}

export function ArenaSessionLiveCourt({
  liveRound,
  teams,
  activityType,
  startedAt,
  endedAt,
}: ArenaSessionLiveCourtProps) {
  const theme = useSportTheme()
  const styles = createArenaSessionLiveCourtStyles(theme)
  const championName = teamName(teams, liveRound.champion.teamId)
  const challengerName = teamName(teams, liveRound.challenger.teamId)
  const isLive = liveRound.status === 'in_progress'
  const elapsed = useElapsedTime(startedAt, endedAt, isLive)
  const championMarkers = useMemo(
    () => buildArenaCourtMarkers(liveRound.champion.members, 'champion', activityType),
    [activityType, liveRound.champion.members],
  )
  const challengerMarkers = useMemo(
    () => buildArenaCourtMarkers(liveRound.challenger.members, 'challenger', activityType),
    [activityType, liveRound.challenger.members],
  )

  return (
    <View style={styles.section} accessibilityLabel="ภาพการแข่งขันบนสนาม">
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>LIVE COURT</Text>
          <Text style={styles.title}>{isLive ? 'เกมที่กำลังแข่ง' : 'เกมปัจจุบัน'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{isLive ? 'LIVE' : 'CURRENT'}</Text>
        </View>
      </View>

      <View
        style={styles.scoreVault}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={`${championName} ${scoreLabel(liveRound.champion.score)} ต่อ ${scoreLabel(liveRound.challenger.score)} เวลา ${elapsed} สถานะ ${roundStatusLabel(liveRound.status)}`}
      >
        <ScoreTeam
          name={championName}
          score={liveRound.champion.score}
          champion
          styles={styles}
          theme={theme}
        />
        <View style={styles.scoreCenter}>
          <Text style={styles.scoreDivider}>–</Text>
          <View style={styles.clockChip}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={theme.fightInkSoft} />
            <Text style={styles.clockText}>{elapsed}</Text>
          </View>
        </View>
        <ScoreTeam
          name={challengerName}
          score={liveRound.challenger.score}
          styles={styles}
          theme={theme}
        />
      </View>

      <View style={styles.matchMeta}>
        <Text style={styles.matchStatus}>{roundStatusLabel(liveRound.status)}</Text>
        <View style={styles.kingBadge}>
          <MaterialCommunityIcons name="crown-outline" size={14} color={theme.economy} />
          <Text style={styles.kingLabel}>{championName}</Text>
        </View>
      </View>

      <View style={styles.court} accessibilityLabel="ตำแหน่งผู้เล่นในสนาม">
        <CourtLines activityType={activityType} theme={theme} />
        {championMarkers.map((marker, index) => (
          <PlayerMarker
            key={`champion-${index}`}
            marker={marker}
            color={theme.orange}
            textColor={OnAccent.onLight}
            styles={styles}
          />
        ))}
        {challengerMarkers.map((marker, index) => (
          <PlayerMarker
            key={`challenger-${index}`}
            marker={marker}
            color={theme.blue}
            textColor={theme.chalk}
            styles={styles}
          />
        ))}
      </View>

      <View style={styles.teamSummary}>
        <TeamSummary
          name={championName}
          members={liveRound.champion.members}
          champion
          styles={styles}
          theme={theme}
        />
        <View style={styles.summaryDivider} />
        <TeamSummary
          name={challengerName}
          members={liveRound.challenger.members}
          styles={styles}
          theme={theme}
        />
      </View>
    </View>
  )
}

function CourtLines({ activityType, theme }: { activityType: ArenaSessionActivity; theme: SportPalette }) {
  if (activityType === 'badminton') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 320 420" preserveAspectRatio="none">
        <Rect x="0" y="0" width="320" height="420" fill={theme.fightBg} />
        <Rect x="20" y="16" width="280" height="388" fill="none" stroke={theme.fightInkSoft} strokeWidth="2" />
        <Line x1="20" y1="210" x2="300" y2="210" stroke={theme.economy} strokeWidth="3" />
        <Line x1="20" y1="72" x2="300" y2="72" stroke={theme.fightInkSoft} strokeWidth="1.5" />
        <Line x1="20" y1="348" x2="300" y2="348" stroke={theme.fightInkSoft} strokeWidth="1.5" />
        <Line x1="160" y1="16" x2="160" y2="404" stroke={theme.fightInkSoft} strokeWidth="1.5" />
      </Svg>
    )
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 320 420" preserveAspectRatio="none">
      <Rect x="0" y="0" width="320" height="420" fill={theme.fightBg} />
      <Rect x="18" y="14" width="284" height="392" fill="none" stroke={theme.fightInkSoft} strokeWidth="2" />
      <Line x1="18" y1="210" x2="302" y2="210" stroke={theme.fightInkSoft} strokeWidth="2" />
      <Circle cx="160" cy="210" r="30" fill="none" stroke={theme.fightInkSoft} strokeWidth="2" />
      <Rect x="92" y="14" width="136" height="96" fill="none" stroke={theme.fightInkSoft} strokeWidth="2" />
      <Rect x="92" y="310" width="136" height="96" fill="none" stroke={theme.fightInkSoft} strokeWidth="2" />
      <Circle cx="160" cy="110" r="30" fill="none" stroke={theme.fightInkSoft} strokeWidth="1.5" />
      <Circle cx="160" cy="310" r="30" fill="none" stroke={theme.fightInkSoft} strokeWidth="1.5" />
      <Line x1="128" y1="35" x2="192" y2="35" stroke={theme.economy} strokeWidth="3" />
      <Line x1="128" y1="385" x2="192" y2="385" stroke={theme.economy} strokeWidth="3" />
      <Circle cx="160" cy="45" r="7" fill="none" stroke={theme.economy} strokeWidth="2" />
      <Circle cx="160" cy="375" r="7" fill="none" stroke={theme.economy} strokeWidth="2" />
    </Svg>
  )
}

type ScoreTeamProps = {
  name: string
  score: number | null
  champion?: boolean
  styles: ReturnType<typeof createArenaSessionLiveCourtStyles>
  theme: SportPalette
}

function ScoreTeam({ name, score, champion, styles, theme }: ScoreTeamProps) {
  return (
    <View style={styles.scoreTeam}>
      <View style={styles.scoreNameRow}>
        {champion ? <MaterialCommunityIcons name="crown" size={12} color={theme.economy} /> : null}
        <Text style={styles.scoreTeamName} numberOfLines={1}>{name}</Text>
      </View>
      <Text style={[styles.score, champion ? { color: theme.economy } : { color: theme.fightInk }]}>
        {scoreLabel(score)}
      </Text>
    </View>
  )
}

type TeamSummaryProps = {
  name: string
  members: LiveMember[]
  champion?: boolean
  styles: ReturnType<typeof createArenaSessionLiveCourtStyles>
  theme: SportPalette
}

function TeamSummary({ name, members, champion, styles, theme }: TeamSummaryProps) {
  return (
    <View style={styles.summaryTeam}>
      <View style={[styles.summaryDot, { backgroundColor: champion ? theme.orange : theme.blue }]} />
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryName} numberOfLines={1}>{name}</Text>
        <Text style={styles.summaryMembers} numberOfLines={1}>
          {members.map(memberName).join(' · ') || 'รอรายชื่อผู้เล่น'}
        </Text>
      </View>
      {champion ? (
        <MaterialCommunityIcons name="crown-outline" size={17} color={theme.economy} />
      ) : null}
    </View>
  )
}

type PlayerMarkerProps = {
  marker: ArenaCourtMarker
  color: string
  textColor: string
  styles: ReturnType<typeof createArenaSessionLiveCourtStyles>
}

function PlayerMarker({ marker, color, textColor, styles }: PlayerMarkerProps) {
  const name = memberName(marker.member)
  return (
    <View
      style={[styles.marker, { left: marker.left, top: marker.top }]}
      accessible
      accessibilityLabel={`${name} ตำแหน่ง ${marker.label}`}
    >
      <View style={[styles.markerRing, { borderColor: color }]}>
        <View style={[styles.markerDot, { backgroundColor: color }]}>
          {marker.member.avatarUrl ? (
            <Image source={{ uri: marker.member.avatarUrl }} style={styles.markerImage} contentFit="cover" transition={120} />
          ) : (
            <Text style={[styles.markerInitial, { color: textColor }]}>{initials(marker.member)}</Text>
          )}
        </View>
      </View>
      <View style={styles.markerCaption}>
        <Text style={styles.markerName} numberOfLines={1}>{name}</Text>
        <Text style={styles.markerPosition}>{marker.label}</Text>
      </View>
    </View>
  )
}

function useElapsedTime(startedAt: string | null | undefined, endedAt: string | null | undefined, running: boolean): string {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!startedAt || endedAt || !running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endedAt, running, startedAt])

  if (!startedAt) return '--:--'
  if (!running && !endedAt) return '--:--'
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : now
  if (!Number.isFinite(start) || !Number.isFinite(end)) return '--:--'
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function teamName(teams: Team[], teamId: string): string {
  return teams.find((team) => team.teamId === teamId)?.name ?? 'ทีมไม่ทราบชื่อ'
}

function memberName(member: LiveMember): string {
  return member.displayName ?? member.handle ?? 'สมาชิก'
}

function initials(member: LiveMember): string {
  return memberName(member).trim().slice(0, 2).toUpperCase()
}

function scoreLabel(score: number | null): string {
  return score === null ? '—' : String(score)
}

function roundStatusLabel(status: LiveRound['status']): string {
  return {
    stake_acceptance: 'รอยืนยันผู้เล่น',
    in_progress: 'กำลังเล่น',
    result_pending: 'รอผลการแข่งขัน',
    disputed: 'กำลังตรวจสอบผล',
  }[status]
}
