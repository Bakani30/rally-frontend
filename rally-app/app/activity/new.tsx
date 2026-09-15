import { useState } from 'react'
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ProofPicker } from '@/components/match/ProofPicker'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { ActivityIcon } from '@/components/ui/ActivityIcon'
import { ActivityColor, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useCreateActivityMemory } from '@/hooks/useCreateActivityMemory'
import type { ActivityMemoryType } from '@/lib/activities/memory/activityMemoryTypes'
import type { LocalProofAsset } from '@/lib/match/proofUploadService'
import { ACTIVITY_LABEL, MVP_ACTIVITIES } from '@/lib/match/matchConfig'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

function nowForInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseStartedAt(value: string): string {
  const normalized = value.trim().replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) throw new Error('Enter date as YYYY-MM-DD HH:mm')
  return date.toISOString()
}

function parsePositiveInt(value: string, label: string): number {
  const n = parseInt(value, 10)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${label} must be a positive number`)
  return n
}

export default function NewActivityMemoryScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const createMutation = useCreateActivityMemory(user?.id)
  const [activityType, setActivityType] = useState<ActivityMemoryType>('running')
  const [title, setTitle] = useState('')
  const [startedAt, setStartedAt] = useState(nowForInput())
  const [durationMinutes, setDurationMinutes] = useState('')
  const [locationName, setLocationName] = useState('')
  const [notes, setNotes] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [side0Score, setSide0Score] = useState('')
  const [side1Score, setSide1Score] = useState('')
  const [teamSize, setTeamSize] = useState('1')
  const [courtOrField, setCourtOrField] = useState('')
  const [effort, setEffort] = useState<number | null>(null)
  const [moodAfter, setMoodAfter] = useState<number | null>(null)
  const [mediaAssets, setMediaAssets] = useState<LocalProofAsset[]>([])

  function showError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not save activity.'
    if (Platform.OS === 'web') globalThis.alert(`Error\n\n${message}`)
    else Alert.alert('Error', message)
  }

  async function save() {
    if (!user) return
    try {
      const durationSeconds = durationMinutes ? parsePositiveInt(durationMinutes, 'Duration') * 60 : null
      const startedIso = parseStartedAt(startedAt)
      const data = activityType === 'running'
        ? {
            distanceMeters: Math.round(parseFloat(distanceKm) * 1000),
            movingTimeSeconds: durationSeconds ?? parsePositiveInt(durationMinutes, 'Moving time') * 60,
          }
        : {
            side0Score: parseInt(side0Score, 10),
            side1Score: parseInt(side1Score, 10),
            teamSize: parsePositiveInt(teamSize, 'Team size'),
            courtOrField: courtOrField.trim() || null,
          }

      const result = await createMutation.mutateAsync({
        userId: user.id,
        activityType,
        title,
        notes,
        locationName,
        startedAt: startedIso,
        durationSeconds,
        perceivedEffort: effort,
        moodAfter,
        mediaAssets,
        data,
      })
      guardedRouter.replace(`/activity/${result.activitySessionId}`, {
        actionKey: `activity-new:${result.activitySessionId}`,
      })
    } catch (error) {
      showError(error)
    }
  }

  const accent = ActivityColor[activityType] ?? theme.red
  const busy = createMutation.isPending

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Reveal delay={0}>
        <Text style={styles.kicker}>ACTIVITY MEMORY</Text>
        <Text style={styles.heading}>เก็บกิจกรรมจริง</Text>
      </Reveal>

      <Reveal delay={60}>
        <View style={styles.pills}>
          {MVP_ACTIVITIES.map((activity) => {
            const active = activityType === activity
            return (
              <PressableScale
                key={activity}
                style={[styles.activityPill, active && { borderColor: ActivityColor[activity], backgroundColor: `${ActivityColor[activity]}22` }]}
                onPress={() => setActivityType(activity)}
              >
                <ActivityIcon activity={activity} size={16} />
                <Text style={[styles.pillText, active && { color: ActivityColor[activity] }]}>
                  {ACTIVITY_LABEL[activity]}
                </Text>
              </PressableScale>
            )
          })}
        </View>
      </Reveal>

      <Reveal delay={100}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Evening run, pickup game..." placeholderTextColor={theme.mutedSoft} />
      </Reveal>

      <View style={styles.row}>
        <Field styles={styles} theme={theme} label="Started" value={startedAt} onChangeText={setStartedAt} placeholder="YYYY-MM-DD HH:mm" />
        <Field styles={styles} theme={theme} label="Minutes" value={durationMinutes} onChangeText={setDurationMinutes} placeholder="45" keyboardType="number-pad" />
      </View>

      {activityType === 'running' ? (
        <Reveal delay={140}>
          <Text style={styles.label}>Distance (km)</Text>
          <TextInput style={styles.input} value={distanceKm} onChangeText={setDistanceKm} keyboardType="decimal-pad" placeholder="5.0" placeholderTextColor={theme.mutedSoft} />
        </Reveal>
      ) : (
        <Reveal delay={140}>
          <Text style={styles.label}>Score</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} value={side0Score} onChangeText={setSide0Score} keyboardType="number-pad" placeholder="Team A" placeholderTextColor={theme.mutedSoft} />
            <TextInput style={[styles.input, styles.flex]} value={side1Score} onChangeText={setSide1Score} keyboardType="number-pad" placeholder="Team B" placeholderTextColor={theme.mutedSoft} />
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} value={teamSize} onChangeText={setTeamSize} keyboardType="number-pad" placeholder="Team size" placeholderTextColor={theme.mutedSoft} />
            <TextInput style={[styles.input, styles.flex]} value={courtOrField} onChangeText={setCourtOrField} placeholder="Court/field" placeholderTextColor={theme.mutedSoft} />
          </View>
        </Reveal>
      )}

      <Reveal delay={180}>
        <Text style={styles.label}>Place</Text>
        <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="สนาม, สวน, gym..." placeholderTextColor={theme.mutedSoft} />
      </Reveal>

      <MoodRow styles={styles} label="Effort" max={10} value={effort} onChange={setEffort} accent={accent} />
      <MoodRow styles={styles} label="Mood after" max={5} value={moodAfter} onChange={setMoodAfter} accent={accent} />

      <Reveal delay={240}>
        <Text style={styles.label}>Photos</Text>
        <ProofPicker assets={mediaAssets} onChange={setMediaAssets} max={5} label="memory photos" />
      </Reveal>

      <Reveal delay={280}>
        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.notes]} value={notes} onChangeText={setNotes} multiline placeholder="อะไรเกิดขึ้น วันนี้รู้สึกยังไง..." placeholderTextColor={theme.mutedSoft} />
      </Reveal>

      <Reveal delay={320}>
        <PressableScale style={[styles.saveBtn, { backgroundColor: accent }]} onPress={save} disabled={busy}>
          {busy ? <ActivityIndicator color={theme.chalk} /> : <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.chalk} />}
          <Text style={styles.saveText}>{busy ? 'SAVING...' : 'SAVE MEMORY'}</Text>
        </PressableScale>
      </Reveal>
    </ScrollView>
  )
}

function Field(props: { styles: ReturnType<typeof createStyles>; theme: SportPalette; label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad' }) {
  const { styles, theme } = props
  return (
    <Reveal delay={120} style={styles.flex}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput style={styles.input} value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor={theme.mutedSoft} keyboardType={props.keyboardType} />
    </Reveal>
  )
}

function MoodRow({ styles, label, max, value, onChange, accent }: { styles: ReturnType<typeof createStyles>; label: string; max: number; value: number | null; onChange: (value: number | null) => void; accent: string }) {
  return (
    <Reveal delay={210}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.scaleRow}>
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <PressableScale key={n} style={[styles.scaleDot, value === n && { backgroundColor: accent, borderColor: accent }]} onPress={() => onChange(value === n ? null : n)}>
            <Text style={[styles.scaleText, value === n && styles.scaleTextActive]}>{n}</Text>
          </PressableScale>
        ))}
      </View>
    </Reveal>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { backgroundColor: theme.bg },
    container: { padding: Spacing.xl, paddingBottom: 48, gap: Spacing.md },
    kicker: { color: theme.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
    heading: { color: theme.ink, fontSize: 28, fontWeight: '900', marginTop: 4 },
    label: { color: theme.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    activityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.line, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.surface },
    pillText: { color: theme.inkSoft, fontSize: 12, fontWeight: '900' },
    input: { minHeight: 48, borderWidth: 1, borderColor: theme.line, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: theme.surface, color: theme.ink, fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', gap: Spacing.sm },
    flex: { flex: 1 },
    scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    scaleDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
    scaleText: { color: theme.muted, fontSize: 11, fontWeight: '900' },
    scaleTextActive: { color: theme.chalk },
    notes: { minHeight: 96, textAlignVertical: 'top' },
    saveBtn: { height: 52, borderRadius: Radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveText: { color: theme.chalk, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  })
}
