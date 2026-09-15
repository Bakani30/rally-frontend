import { Radius, Spacing, type SportPalette } from '@/constants/theme'

export function createPartyStyles(theme: SportPalette) {
  return {
    screen: {
      backgroundColor: theme.bg,
    },
    container: {
      paddingHorizontal: Spacing.lg,
      gap: Spacing.lg,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: Spacing.md,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: Spacing.xs,
    },
    eyebrow: {
      color: theme.orange,
      fontSize: 10,
      fontWeight: '900' as const,
      letterSpacing: 1.6,
    },
    title: {
      color: theme.ink,
      fontSize: 32,
      lineHeight: 36,
      fontWeight: '900' as const,
    },
    subtitle: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 18,
    },
    createCta: {
      minHeight: 52,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      backgroundColor: theme.orange,
      paddingHorizontal: Spacing.lg,
    },
    createCtaText: {
      color: theme.chalk,
      fontSize: 15,
      fontWeight: '800' as const,
    },
    panel: {
      gap: Spacing.md,
      borderRadius: Radius.xl,
      backgroundColor: theme.bgElevated,
      padding: Spacing.lg,
      boxShadow: theme.shadowSoft,
    },
    section: {
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: Spacing.md,
    },
    sectionTitle: {
      color: theme.ink,
      fontSize: 19,
      fontWeight: '900' as const,
    },
    count: {
      color: theme.muted,
      fontSize: 12,
      fontWeight: '700' as const,
    },
    list: {
      gap: Spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.line,
    },
  }
}
