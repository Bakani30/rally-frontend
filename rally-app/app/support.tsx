import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useCreateSupportTicket } from '@/hooks/useSupportTicket'
import type { SupportTicketCategory } from '@/lib/support/supportTypes'

const CATEGORIES: { value: SupportTicketCategory; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { value: 'match', label: 'Match', icon: 'trophy-outline' },
  { value: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
  { value: 'billing', label: 'Billing', icon: 'credit-card-outline' },
  { value: 'gps', label: 'GPS', icon: 'map-marker-path' },
  { value: 'safety', label: 'Safety', icon: 'shield-alert-outline' },
  { value: 'bug', label: 'Bug', icon: 'bug-outline' },
  { value: 'account', label: 'Account', icon: 'account-circle-outline' },
  { value: 'other', label: 'Other', icon: 'lifebuoy' },
]

export default function SupportScreen() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const params = useLocalSearchParams<{
    screen?: string
    matchId?: string
    activitySessionId?: string
  }>()
  const mutation = useCreateSupportTicket()
  const [category, setCategory] = useState<SupportTicketCategory>('bug')
  const [subject, setSubject] = useState('')
  const [note, setNote] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  const context = useMemo(() => ({
    route_screen: params.screen ?? null,
    runtime: Constants.executionEnvironment ?? null,
    app_ownership: Constants.appOwnership ?? null,
    device_year_class: Device.deviceYearClass ?? null,
    is_device: Device.isDevice,
  }), [params.screen])

  async function submit() {
    if (subject.trim().length < 3) {
      Alert.alert('Subject required', 'Add a short title so support can triage this.')
      return
    }

    try {
      await mutation.mutateAsync({
        category,
        subject,
        note,
        screen: params.screen ?? 'settings',
        matchId: params.matchId ?? null,
        activitySessionId: params.activitySessionId ?? null,
        appVersion: Constants.expoConfig?.version ?? null,
        platform: Platform.OS,
        deviceModel: Device.modelName ?? Device.deviceName ?? null,
        contactEmail,
        context,
      })
      Alert.alert('Issue reported', 'Support has the context it needs to review this.', [
        { text: 'Done', onPress: () => router.back() },
      ])
      setSubject('')
      setNote('')
      setContactEmail('')
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((item) => {
            const active = category === item.value
            return (
              <PressableScale
                key={item.value}
                style={[styles.categoryButton, active && styles.categoryButtonActive]}
                onPress={() => setCategory(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={16}
                  color={active ? theme.chalk : theme.muted}
                />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item.label}
                </Text>
              </PressableScale>
            )
          })}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Issue</Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Short title"
          placeholderTextColor={theme.mutedSoft}
          maxLength={160}
          style={styles.input}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="What happened?"
          placeholderTextColor={theme.mutedSoft}
          multiline
          maxLength={4000}
          textAlignVertical="top"
          style={[styles.input, styles.noteInput]}
        />

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Reply Email</Text>
        <TextInput
          value={contactEmail}
          onChangeText={setContactEmail}
          placeholder="Optional"
          placeholderTextColor={theme.mutedSoft}
          keyboardType="email-address"
          autoCapitalize="none"
          maxLength={320}
          style={styles.input}
        />

        <View style={styles.contextBox}>
          <MaterialCommunityIcons name="paperclip" size={16} color={theme.muted} />
          <Text style={styles.contextText} numberOfLines={2}>
            {params.matchId ? `Match ${params.matchId.slice(0, 8)} attached` : 'App and device context will be attached'}
          </Text>
        </View>

        <PressableScale
          style={[styles.submitButton, mutation.isPending && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color={theme.chalk} />
          ) : (
            <MaterialCommunityIcons name="send-outline" size={18} color={theme.chalk} />
          )}
          <Text style={styles.submitText}>Send</Text>
        </PressableScale>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    categoryButton: {
      minHeight: 38,
      minWidth: '23%',
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
    },
    categoryButtonActive: { backgroundColor: theme.red, borderColor: theme.red },
    categoryText: { fontSize: 12, fontWeight: '900', color: theme.muted },
    categoryTextActive: { color: theme.chalk },
    input: {
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      color: theme.ink,
      fontSize: 15,
      marginBottom: 10,
    },
    noteInput: { minHeight: 150 },
    contextBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: Radius.md,
      backgroundColor: theme.bgElevated,
      borderWidth: 1,
      borderColor: theme.line,
      marginTop: 2,
      marginBottom: 16,
    },
    contextText: { flex: 1, fontSize: 12, color: theme.muted, fontWeight: '700' },
    submitButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: Radius.lg,
      backgroundColor: theme.red,
    },
    submitButtonDisabled: { opacity: 0.7 },
    submitText: { color: theme.chalk, fontSize: 15, fontWeight: '900' },
  })
}
