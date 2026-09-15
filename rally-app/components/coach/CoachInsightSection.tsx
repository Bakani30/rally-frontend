import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useCoachActivityInsights } from '@/hooks/useCoachActivityInsights'
import { useLanguageStore } from '@/stores/languageStore'
import { CoachInsightCard } from './CoachInsightCard'

export function CoachInsightSection({ activitySessionId }: { activitySessionId: string }) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { data, isPending, error } = useCoachActivityInsights(activitySessionId)
  const language = useLanguageStore((state) => state.language)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  if (isPending) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>COACH ANALYTICS</Text>
        <ActivityIndicator color={theme.amber} />
      </View>
    )
  }
  if (error || !data) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>COACH ANALYTICS</Text>
        <Text style={styles.empty}>
          {error instanceof Error ? error.message : language === 'th' ? 'ยังดูการวิเคราะห์ไม่ได้' : 'Coach analytics unavailable.'}
        </Text>
      </View>
    )
  }

  const { entitlement, cards, previewCards, lockedCardCount } = data
  const showFull = entitlement.hasPro && cards.length > 0
  const visibleCards = (showFull ? cards : previewCards).filter((card) => card.type !== 'relic')

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.sectionLabel}>COACH ANALYTICS</Text>
        <Text style={styles.proBadge}>{entitlement.hasPro ? 'PRO' : 'PREVIEW'}</Text>
      </View>

      {visibleCards.map((card) => (
        <CoachInsightCard
          key={card.id}
          card={card}
          expanded={activeCardId === card.id}
          onToggle={() => setActiveCardId((id) => (id === card.id ? null : card.id))}
        />
      ))}

      {!entitlement.hasPro && lockedCardCount > 0 && (
        <Link href="/pro" asChild>
          <PressableScale style={styles.lockedCta}>
            <MaterialCommunityIcons name="crown" size={16} color={theme.amber} />
            <Text style={styles.lockedCtaText}>
              {language === 'th'
                ? `ปลดล็อกอีก ${lockedCardCount} การ์ดด้วย Pro`
                : `Unlock ${lockedCardCount} more ${lockedCardCount === 1 ? 'card' : 'cards'} with Pro`}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={theme.amber} />
          </PressableScale>
        </Link>
      )}

      {entitlement.hasPro && cards.length === 0 && (
        <Text style={styles.empty}>
          {language === 'th'
            ? 'เล่นบาสอีกสักสองสามแมตช์เพื่อเริ่มเห็นการ์ด coach'
            : 'Play a few more basketball matches to start seeing coach cards.'}
        </Text>
      )}
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    section: {
      backgroundColor: theme.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.line,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: theme.muted, letterSpacing: 1.6 },
    proBadge: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1.4,
      color: theme.amber,
      backgroundColor: theme.amberSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.pill,
    },
    empty: { fontSize: 12, color: theme.muted, marginTop: 4 },
    lockedCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: Radius.lg,
      backgroundColor: theme.amberSoft,
      borderWidth: 1,
      borderColor: 'rgba(255,178,61,0.4)',
      marginTop: 4,
    },
    lockedCtaText: { flex: 1, color: theme.amber, fontSize: 12, fontWeight: '800' },
  })
}
