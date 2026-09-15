import { useRef } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useI18n } from '@/hooks/useI18n'
import { giftsDictionary } from '@/lib/i18n/dictionaries/gifts'
import { CATEGORY_OPTIONS, type CategoryKey } from './redeemCatalog'

type RedeemFilterBarProps = {
  query: string
  activeCategory: CategoryKey
  loading?: boolean
  onQueryChange: (value: string) => void
  onCategoryChange: (category: CategoryKey) => void
}

export function RedeemFilterBar({ query, activeCategory, loading = false, onQueryChange, onCategoryChange }: RedeemFilterBarProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { t } = useI18n(giftsDictionary)
  const inputRef = useRef<TextInput>(null)

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CATEGORY_OPTIONS.map((category) => {
          const active = activeCategory === category.key
          return (
            <PressableScale
              key={category.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onCategoryChange(category.key)}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: loading }}
            >
              <MaterialCommunityIcons name={category.icon} size={16} color={active ? theme.chalk : theme.inkSoft} />
              <Text style={[styles.chipText, active && styles.chipTextActive]} maxFontSizeMultiplier={1.15}>{t(category.labelKey)}</Text>
            </PressableScale>
          )
        })}
      </ScrollView>

      <View style={styles.searchBox}>
        <MaterialCommunityIcons name="magnify" size={21} color={theme.muted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={onQueryChange}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={theme.mutedSoft}
          style={styles.searchInput}
          returnKeyType="search"
          editable={!loading}
          maxFontSizeMultiplier={1.25}
          accessibilityLabel={t('searchPlaceholder')}
          accessibilityState={{ disabled: loading }}
        />
        {loading ? (
          <ActivityIndicator color={theme.orange} size="small" />
        ) : query ? (
          <PressableScale
            style={styles.clearButton}
            onPress={() => { onQueryChange(''); inputRef.current?.focus() }}
            accessibilityRole="button"
            accessibilityLabel={t('clearSearch')}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.inkSoft} />
          </PressableScale>
        ) : null}
      </View>

    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    wrap: { gap: Spacing.sm },
    searchBox: {
      minHeight: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.bgElevated,
      paddingHorizontal: Spacing.md,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      color: theme.ink,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '700',
      paddingVertical: 0,
    },
    clearButton: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surfaceStrong,
    },
    chipRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.sm, paddingVertical: 2 },
    chip: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: theme.lineStrong,
      backgroundColor: theme.bgElevated,
      paddingHorizontal: 14,
    },
    chipActive: { borderColor: theme.orange, backgroundColor: theme.orange },
    chipText: { color: theme.ink, fontSize: 12, lineHeight: 17, fontWeight: '900' },
    chipTextActive: { color: theme.chalk },
  })
}
