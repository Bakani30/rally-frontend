import { StyleSheet } from 'react-native'
import { Fonts, Spacing, type SportPalette } from '@/constants/theme'

export function createRefereeProfileScreenStyles(theme: SportPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      gap: Spacing.lg,
    },
    stateBlock: { width: '100%', maxWidth: 420, alignSelf: 'center' },
    container: {
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    block: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: Spacing.sm },
    topBar: {
      width: '100%',
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarBack: { position: 'absolute', left: 0, top: 4 },
    topBarTitle: {
      color: theme.ink,
      fontSize: 20,
      lineHeight: 29,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
      textAlign: 'center',
    },
    sectionHeading: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    sectionTitle: {
      color: theme.ink,
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '900',
      fontFamily: Fonts?.thaiHead,
    },
    sectionMeta: {
      color: theme.muted,
      fontSize: 11,
      lineHeight: 17,
      fontWeight: '700',
      fontFamily: Fonts?.thaiMedium,
    },
    cardStack: { gap: Spacing.sm },
  })
}
