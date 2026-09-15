import { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Fonts, Spacing, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'

type ProfileIdentityCardProps = {
  avatar: ReactNode
  name: string
  playerClass: string
  guild: string
  ranking: string
  title: string
  badge?: ReactNode
  serial?: string
}

type IdentityRowProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap
  label: string
  value: string
}

export function ProfileIdentityCard({
  avatar,
  name,
  playerClass,
  guild,
  ranking,
  title,
  badge,
  serial,
}: ProfileIdentityCardProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.pass}>
      <View pointerEvents="none" style={[styles.cutout, styles.cutoutLeft]} />
      <View pointerEvents="none" style={[styles.cutout, styles.cutoutRight]} />
      <View pointerEvents="none" style={styles.topTab}>
        <Text style={styles.topTabText}>RALLY PASS</Text>
        <Text style={styles.serialText}>{serial ?? 'NO. --'}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarColumn}>
          <View style={styles.avatarOrbit}>{avatar}</View>
          <View style={styles.avatarNameRow}>
            <Text style={styles.avatarName} numberOfLines={1}>{name}</Text>
            {badge}
          </View>
          <View style={styles.guildRail}>
            <View style={styles.guildLine} />
            <Text style={styles.guildTag} numberOfLines={1}>{guild}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <IdentityRow icon="account-circle-outline" label="NAME" value={name} />
          <IdentityRow icon="basketball" label="CLASS" value={playerClass} />
          <IdentityRow icon="shield-account-outline" label="GUILD" value={guild} />
          <IdentityRow icon="chevron-triple-up" label="RANKING" value={ranking} />
          <IdentityRow icon="drama-masks" label="ฉายา" value={title} />
        </View>
      </View>

      <View pointerEvents="none" style={styles.bottomDock}>
        <View style={styles.bottomLine} />
        <Text style={styles.bottomText} numberOfLines={1}>{ranking}</Text>
        <View style={styles.chevrons}>
          {Array.from({ length: 3 }).map((_, index) => (
            <MaterialCommunityIcons
              key={index}
              name="chevron-right"
              size={15}
              color={theme.inkSoft}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

function IdentityRow({ icon, label, value }: IdentityRowProps) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={17} color={theme.inkSoft} />
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    pass: {
      width: 360,
      maxWidth: '100%',
      minHeight: 252,
      borderRadius: 46,
      borderWidth: 3,
      borderColor: theme.lineStrong,
      backgroundColor: theme.panelBg,
      paddingTop: 38,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      overflow: 'visible',
      shadowColor: theme.arcadeShadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.22,
      shadowRadius: 18,
      elevation: 5,
    },
    cutout: {
      position: 'absolute',
      top: '47%',
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.bg,
      zIndex: 6,
    },
    cutoutLeft: { left: -24 },
    cutoutRight: { right: -24 },
    topTab: {
      position: 'absolute',
      left: 76,
      right: 76,
      top: -3,
      minHeight: 34,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      borderWidth: 3,
      borderTopWidth: 0,
      borderColor: theme.lineStrong,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      zIndex: 4,
    },
    topTabText: {
      color: theme.ink,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    serialText: {
      color: theme.muted,
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    body: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: Spacing.md,
      minHeight: 168,
    },
    avatarColumn: {
      width: 104,
      borderRadius: 34,
      borderWidth: 2,
      borderColor: theme.line,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      gap: 8,
    },
    avatarOrbit: {
      minHeight: 86,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarNameRow: {
      minHeight: 20,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    avatarName: {
      flexShrink: 1,
      color: theme.ink,
      fontSize: 11,
      lineHeight: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    guildRail: {
      width: '100%',
      alignItems: 'center',
      gap: 6,
    },
    guildLine: {
      width: '74%',
      borderTopWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.inkSoft,
      opacity: 0.66,
    },
    guildTag: {
      color: theme.muted,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
      textAlign: 'center',
    },
    details: {
      flex: 1,
      minWidth: 0,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: theme.line,
      backgroundColor: theme.bgOverlay,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.sm,
      justifyContent: 'center',
      gap: 9,
    },
    row: {
      minHeight: 25,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    rowLabel: {
      width: 62,
      color: theme.ink,
      fontFamily: Fonts?.rounded,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0,
    },
    rowValue: {
      flex: 1,
      minWidth: 0,
      color: theme.ink,
      fontFamily: Fonts?.rounded,
      fontSize: 15,
      lineHeight: 18,
      fontWeight: '900',
      textAlign: 'right',
    },
    bottomDock: {
      minHeight: 22,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    bottomLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.lineStrong,
      opacity: 0.64,
    },
    bottomText: {
      maxWidth: 94,
      color: theme.inkSoft,
      fontSize: 10,
      lineHeight: 12,
      fontWeight: '900',
      letterSpacing: 0,
      fontVariant: ['tabular-nums'],
    },
    chevrons: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: -4,
    },
  })
}
