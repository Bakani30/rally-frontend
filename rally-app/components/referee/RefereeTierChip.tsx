import { StyleSheet, Text, View } from 'react-native'
import { refereeTierColors } from '@/components/referee/refereeTierColors'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'
import { refereeTierMeta } from '@/lib/match/refereeLevels'
import { refereePassTierLabel } from '@/lib/match/refereePassPresentation'
import type { RefereeTrustTier } from '@/types/match'

type RefereeTierChipProps = {
  tier: RefereeTrustTier
  // Show "LV n ·" before the tier label.
  showLevel?: boolean
  trustTone?: boolean
}

// Small accent pill naming a referee trust tier. Public copy intentionally avoids
// language that could imply certification during alpha.
export function RefereeTierChip({ tier, showLevel = false, trustTone = false }: RefereeTierChipProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(refereeDictionary)
  const meta = refereeTierMeta(tier)
  const label = refereePassTierLabel(meta, t)
  const colors = trustTone
    ? { fg: theme.green, bg: theme.greenSoft, border: theme.green }
    : refereeTierColors(theme, meta.accent)

  return (
    <View style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>
        {showLevel ? `LV ${meta.level} · ${label}` : label}
      </Text>
    </View>
  )
}

function createStyles(_theme: SportPalette) {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    text: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.5,
    },
  })
}
