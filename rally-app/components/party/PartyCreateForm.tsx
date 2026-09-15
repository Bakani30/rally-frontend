import { ActivityIndicator, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState, type ReactNode } from 'react'

import { SportCourtSurface } from '@/components/court/SportCourtSurface'
import { PressableScale } from '@/components/motion/PressableScale'
import { Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { formatPartyTeamSize, getPartyActivityLabel, PARTY_TEAM_SIZES } from '@/lib/party/partyPresentation'
import { isPartyNameValid, normalizePartyName } from '@/lib/party/partyRules'
import { partyDictionary } from '@/lib/i18n/dictionaries/party'
import type { PartyActivity, PartyTeamSize, PartyVisibility } from '@/types/party'
import { createPartyStyles } from './partyStyles'

export type PartyCreateValues = {
  name: string
  activityType: PartyActivity
  teamSize: PartyTeamSize
  visibility: PartyVisibility
}

type PartyCreateFormProps = {
  busy: boolean
  onSubmit: (values: PartyCreateValues) => void
}

export function PartyCreateForm({ busy, onSubmit }: PartyCreateFormProps) {
  const theme = useSportTheme()
  const styles = createPartyStyles(theme)
  const { t, language } = useI18n(partyDictionary)
  const [name, setName] = useState('')
  const [activityType, setActivityType] = useState<PartyActivity>('basketball')
  const [teamSize, setTeamSize] = useState<PartyTeamSize>(3)
  const [visibility, setVisibility] = useState<PartyVisibility>('discoverable')
  const normalizedName = normalizePartyName(name)
  const canSubmit = isPartyNameValid(name) && !busy
  const nameError = name.length > 0 && !isPartyNameValid(name)
    ? normalizedName.length > 40 ? t('nameTooLong') : t('nameTooShort')
    : null

  return (
    <View style={[styles.panel, { gap: Spacing.lg }]}>
      <View style={{ gap: Spacing.xs }}>
        <Text style={{ color: theme.ink, fontSize: 22, fontWeight: '900' }}>{t('formTitle')}</Text>
        <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>{t('formHint')}</Text>
      </View>

      <View style={{ gap: Spacing.xs }}>
        <TextInput
          style={{ minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: nameError ? theme.risk : theme.line, backgroundColor: theme.surface, color: theme.ink, paddingHorizontal: Spacing.md, fontSize: 15 }}
          value={name}
          onChangeText={setName}
          placeholder={t('partyName')}
          placeholderTextColor={theme.mutedSoft}
          maxLength={40}
          editable={!busy}
          returnKeyType="done"
          accessibilityLabel={t('partyName')}
        />
        {nameError ? <Text style={{ color: theme.risk, fontSize: 11, fontWeight: '700' }}>{nameError}</Text> : null}
      </View>

      <OptionRow label={t('activity')}>
        {(['basketball', 'badminton'] as const).map((option) => {
          const selected = option === activityType
          return (
            <PressableScale key={option} style={[optionStyles(theme).choice, selected && optionStyles(theme).choiceActive]} onPress={() => setActivityType(option)} disabled={busy} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={getPartyActivityLabel(option, language)}>
              <MaterialCommunityIcons name={option === 'basketball' ? 'basketball' : 'badminton'} size={17} color={selected ? theme.chalk : theme.ink} />
              <Text style={[optionStyles(theme).choiceText, selected && optionStyles(theme).choiceTextActive]}>{getPartyActivityLabel(option, language)}</Text>
            </PressableScale>
          )
        })}
      </OptionRow>

      <OptionRow label={t('teamSize')}>
        {PARTY_TEAM_SIZES.map((option) => {
          const selected = option === teamSize
          return (
            <PressableScale key={option} style={[optionStyles(theme).size, selected && optionStyles(theme).choiceActive]} onPress={() => setTeamSize(option)} disabled={busy} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={formatPartyTeamSize(option)}>
              <Text style={[optionStyles(theme).choiceText, selected && optionStyles(theme).choiceTextActive]}>{formatPartyTeamSize(option)}</Text>
            </PressableScale>
          )
        })}
      </OptionRow>

      <View style={{ minHeight: 164, overflow: 'hidden', borderRadius: 18 }}>
        <SportCourtSurface activityType={activityType} withShading={activityType === 'badminton'} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: Spacing.md }}>
          <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, backgroundColor: 'rgba(12,12,15,0.78)', paddingHorizontal: 10, paddingVertical: 6 }}>
            <MaterialCommunityIcons name="crown-outline" size={15} color={theme.orange} />
            <Text style={{ color: theme.chalk, fontSize: 11, fontWeight: '900' }}>{t('host')}: {t('you')}</Text>
          </View>
        </View>
      </View>

      <OptionRow label={t('visibility')}>
        {(['discoverable', 'private'] as const).map((option) => {
          const selected = option === visibility
          return (
            <PressableScale
              key={option}
              style={[optionStyles(theme).choice, selected && optionStyles(theme).choiceActive]}
              onPress={() => setVisibility(option)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t(option)}
            >
              <MaterialCommunityIcons name={option === 'discoverable' ? 'earth' : 'lock-outline'} size={17} color={selected ? theme.chalk : theme.ink} />
              <Text style={[optionStyles(theme).choiceText, selected && optionStyles(theme).choiceTextActive]}>{t(option)}</Text>
            </PressableScale>
          )
        })}
      </OptionRow>

      <PressableScale style={[styles.createCta, !canSubmit && { backgroundColor: theme.surfaceStrong }]} onPress={() => onSubmit({ name: normalizedName, activityType, teamSize, visibility })} disabled={!canSubmit} accessibilityRole="button" accessibilityLabel={t('createParty')}>
        {busy ? <ActivityIndicator color={theme.chalk} /> : <MaterialCommunityIcons name="plus" size={19} color={canSubmit ? theme.chalk : theme.muted} />}
        <Text style={[styles.createCtaText, !canSubmit && { color: theme.muted }]}>{t('createParty')}</Text>
      </PressableScale>
    </View>
  )
}

function OptionRow({ label, children }: { label: string; children: ReactNode }) {
  const theme = useSportTheme()
  return (
    <View style={{ gap: Spacing.xs }}>
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>{children}</View>
    </View>
  )
}

function optionStyles(theme: SportPalette) {
  return {
    choice: { minHeight: 44, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: Spacing.xs, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: Spacing.md },
    size: { minWidth: 54, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, paddingHorizontal: Spacing.sm },
    choiceActive: { borderColor: theme.orange, backgroundColor: theme.orange },
    choiceText: { color: theme.ink, fontSize: 12, fontWeight: '800' as const },
    choiceTextActive: { color: theme.chalk },
  }
}
