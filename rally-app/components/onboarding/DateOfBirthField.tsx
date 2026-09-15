import { useState } from 'react'
import { FlatList, Modal, StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { SheetPalette } from '@/components/onboarding/onboardingSheetPalette'
import { RallyText } from '@/components/ui/RallyText'
import { Radius, Spacing } from '@/constants/theme'
import { useI18n } from '@/hooks/useI18n'
import { onboardingDictionary } from '@/lib/i18n/dictionaries/onboarding'

type PickerKind = 'month' | 'year'

type DateOfBirthFieldProps = {
  year: number | null
  month: number | null
  onChange: (patch: { birthYear?: number; birthMonth?: number }) => void
}

/**
 * Month/Year dropdown pair — tapping either opens the same in-app option
 * sheet as before. Age display and +/- cyclers were dropped from this field
 * (age is no longer its own step — see founder feedback round 3).
 * Day is not collected (stored as 01 server-side).
 */
export function DateOfBirthField({ year, month, onChange }: DateOfBirthFieldProps) {
  const { t } = useI18n(onboardingDictionary)
  const [openPicker, setOpenPicker] = useState<PickerKind | null>(null)

  const monthLabel = (m: number) => t(`month_${m}` as keyof typeof onboardingDictionary)

  const currentYear = new Date().getFullYear()
  // Ages 13..100 — the same window validateAboutYouStep accepts.
  const yearOptions = Array.from({ length: 88 }, (_, i) => currentYear - 13 - i)
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  const pickerConfig: Record<PickerKind, { title: string; options: number[]; format: (v: number) => string }> = {
    month: { title: t('dob_picker_month'), options: monthOptions, format: (v) => monthLabel(v) },
    year: { title: t('dob_picker_year'), options: yearOptions, format: String },
  }

  function select(kind: PickerKind, value: number) {
    if (kind === 'month') onChange({ birthMonth: value })
    if (kind === 'year') onChange({ birthYear: value })
    setOpenPicker(null)
  }

  return (
    <View style={styles.row}>
      <DropdownButton
        label={t('dob_label_month')}
        value={month == null ? null : monthLabel(month)}
        placeholder={t('dob_placeholder')}
        onPress={() => setOpenPicker('month')}
      />
      <DropdownButton
        label={t('dob_label_year')}
        value={year == null ? null : String(year)}
        placeholder={t('dob_placeholder')}
        onPress={() => setOpenPicker('year')}
      />

      <Modal
        visible={openPicker != null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPicker(null)}
      >
        {openPicker != null && (
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <RallyText variant="head" style={styles.modalTitle}>{pickerConfig[openPicker].title}</RallyText>
              <FlatList
                data={pickerConfig[openPicker].options}
                keyExtractor={(item) => String(item)}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <PressableScale
                    style={styles.modalOption}
                    onPress={() => select(openPicker, item)}
                    accessibilityLabel={pickerConfig[openPicker].format(item)}
                  >
                    <RallyText variant="body" style={styles.modalOptionText}>
                      {pickerConfig[openPicker].format(item)}
                    </RallyText>
                  </PressableScale>
                )}
              />
              <PressableScale
                style={styles.modalClose}
                onPress={() => setOpenPicker(null)}
                accessibilityLabel={t('a11y_close')}
              >
                <RallyText variant="body" style={styles.modalCloseText}>{t('button_close')}</RallyText>
              </PressableScale>
            </View>
          </View>
        )}
      </Modal>
    </View>
  )
}

function DropdownButton({
  label,
  value,
  placeholder,
  onPress,
}: {
  label: string
  value: string | null
  placeholder: string
  onPress: () => void
}) {
  return (
    <PressableScale style={styles.dropdown} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.dropdownTextCol}>
        <RallyText variant="body" style={styles.dropdownLabel}>{label}</RallyText>
        <RallyText
          variant="body"
          style={value ? styles.dropdownValue : styles.dropdownPlaceholder}
          numberOfLines={1}
        >
          {value ?? placeholder}
        </RallyText>
      </View>
      <MaterialCommunityIcons name="chevron-down" size={18} color={SheetPalette.muted} />
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: SheetPalette.line,
    backgroundColor: SheetPalette.surface,
    paddingHorizontal: Spacing.md,
  },
  dropdownTextCol: { flex: 1, minWidth: 0, gap: 2 },
  dropdownLabel: {
    color: SheetPalette.muted,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dropdownValue: { color: SheetPalette.ink, fontSize: 15 },
  dropdownPlaceholder: { color: SheetPalette.muted, fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: SheetPalette.scrim,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '68%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: SheetPalette.bg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: { color: SheetPalette.ink, fontSize: 17 },
  modalList: { flexGrow: 0 },
  modalOption: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SheetPalette.line,
  },
  modalOptionText: { color: SheetPalette.ink, fontSize: 16 },
  modalClose: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: SheetPalette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: { color: SheetPalette.ink, fontSize: 14 },
})
