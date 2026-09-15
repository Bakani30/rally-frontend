import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { HomeShadowFrame } from '@/components/home/HomeShadowFrame'
import { PressableScale } from '@/components/motion/PressableScale'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { DAILY_QUEST_CATALOG } from '@/lib/daily-quests/questCatalog'
import { homeDictionary } from '@/lib/i18n/dictionaries/home'

type DailyQuestEntryCardProps = {
  onPress: () => void
  variant?: 'card' | 'terminal'
}

export function DailyQuestEntryCard({ onPress, variant = 'card' }: DailyQuestEntryCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(homeDictionary)
  const terminal = variant === 'terminal'
  const accentColor = terminal ? theme.trust : theme.economy
  const chevronColor = terminal ? theme.trust : theme.ink

  const card = (
    <PressableScale
      style={[styles.card, terminal && styles.terminalCard]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('openDailyQuests')}
    >
      <View style={[styles.arenaRail, terminal && styles.terminalArenaRail]} />
      <View style={[styles.leftRail, terminal && styles.terminalLeftRail]} />
      <View style={[styles.iconWrap, terminal && styles.terminalIconWrap]}>
        <MaterialCommunityIcons
          name="clipboard-text-outline"
          size={terminal ? 20 : 24}
          color={accentColor}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, terminal && styles.terminalEyebrow]}>{t('questHubEyebrow')}</Text>
        <Text
          style={[styles.title, terminal && styles.terminalTitle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {t('questsEntryTitle')}
        </Text>
        <Text
          style={[styles.subtitle, terminal && styles.terminalSubtitle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {t('questsEntrySubtitle')}
        </Text>
      </View>
      <View style={[styles.rewardStack, terminal && styles.terminalRewardStack]}>
        <Text style={[styles.reward, terminal && styles.terminalReward]}>
          {DAILY_QUEST_CATALOG.length}
        </Text>
        {!terminal && <Text style={styles.rewardLabel}>{t('questsCountLabel')}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={terminal ? 18 : 22} color={chevronColor} />
    </PressableScale>
  )

  if (terminal) return card

  return (
    <HomeShadowFrame radius={24} offset={{ width: 5, height: 7 }}>
      {card}
    </HomeShadowFrame>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    card: {
      minHeight: 96,
      borderRadius: 24,
      backgroundColor: theme.arcadePanel,
      padding: 14,
      paddingLeft: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      overflow: 'hidden',
    },
    terminalCard: {
      minHeight: 74,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      padding: 6,
      paddingLeft: 18,
      gap: 10,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    arenaRail: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 16,
      borderTopLeftRadius: 22,
      borderBottomLeftRadius: 22,
      backgroundColor: theme.orange,
    },
    terminalArenaRail: {
      top: 7,
      bottom: 7,
      width: 6,
      borderTopLeftRadius: 999,
      borderBottomLeftRadius: 999,
      backgroundColor: theme.trust,
    },
    leftRail: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
      borderTopLeftRadius: 22,
      borderBottomLeftRadius: 22,
      backgroundColor: theme.risk,
    },
    terminalLeftRail: {
      top: 7,
      bottom: 7,
      width: 3,
      borderTopLeftRadius: 999,
      borderBottomLeftRadius: 999,
      backgroundColor: theme.blue,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.arcadeCabinet,
      backgroundColor: theme.arcadeCabinet,
      alignItems: 'center',
      justifyContent: 'center',
    },
    terminalIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.trust,
      backgroundColor: theme.greenSoft,
    },
    copy: { flex: 1, minWidth: 0 },
    eyebrow: { color: theme.trust, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
    title: { color: theme.ink, fontSize: 20, fontWeight: '900', letterSpacing: 0 },
    subtitle: { color: theme.inkSoft, fontSize: 12, fontWeight: '800', marginTop: 2 },
    terminalEyebrow: { fontSize: 9, letterSpacing: 0.7 },
    terminalTitle: { fontSize: 17, lineHeight: 20 },
    terminalSubtitle: { fontSize: 11, lineHeight: 14, marginTop: 0 },
    rewardStack: {
      minWidth: 58,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.economy,
      backgroundColor: theme.arcadeCabinet,
      paddingVertical: 6,
      paddingHorizontal: 8,
      alignItems: 'center',
      shadowColor: theme.economy,
      shadowOpacity: 0.16,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    terminalRewardStack: {
      minWidth: 42,
      borderRadius: 14,
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderWidth: 1.5,
      borderColor: theme.blue,
      backgroundColor: theme.blueSoft,
    },
    reward: { color: theme.economy, fontSize: 18, fontWeight: '900' },
    terminalReward: { color: theme.blue, fontSize: 17, lineHeight: 22 },
    rewardLabel: { color: theme.fightInkSoft, fontSize: 9, fontWeight: '900' },
  })
}
