import { StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { CosmeticRarity } from '@/lib/cosmetics/cosmeticTypes'

function rarityColorFor(theme: SportPalette): Record<CosmeticRarity, string> {
  return {
    common: theme.muted,
    rare: theme.blue,
    epic: theme.amber,
    legendary: theme.red,
  }
}

type Props = {
  title: string | null
  rarity?: CosmeticRarity
  editable?: boolean
}

export function ProfileTitle({ title, rarity = 'common', editable = false }: Props) {
  const theme = useSportTheme()
  if (!title && !editable) return null

  const color = title ? rarityColorFor(theme)[rarity] : theme.muted

  const content = (
    <View style={[styles.chip, { borderColor: color }]}>
      {title ? (
        <Text style={[styles.text, { color }]}>{title.toUpperCase()}</Text>
      ) : (
        <Text style={[styles.text, { color }]}>+ เลือกฉายา</Text>
      )}
    </View>
  )

  if (!editable) return content

  return (
    <Link href="/cosmetics?tab=title" asChild>
      <PressableScale accessibilityLabel="แก้ฉายา">{content}</PressableScale>
    </Link>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginTop: 6,
  },
  text: { fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
})
