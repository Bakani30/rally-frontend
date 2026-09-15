import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { HapticTab } from '@/components/haptic-tab'
import { PulseDot } from '@/components/motion/PulseDot'
import { DailyCheckinModal } from '@/components/profile/DailyCheckinModal'
import { type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useI18n } from '@/hooks/useI18n'
import { useNotificationSummary } from '@/hooks/useNotificationSummary'
import { tabsDictionary } from '@/lib/i18n/dictionaries/tabs'
import { REWARDS_TAB_ITEM } from '@/lib/navigation/homeMenu'
import { guardedRouter } from '@/lib/navigation/guardedRouter'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

function TabIcon({
  name,
  color,
  focused,
  showAlert,
}: {
  name: IconName
  color: string
  focused: boolean
  showAlert?: boolean
}) {
  const theme = useSportTheme()
  const styles = createStyles(theme)

  return (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.focusDot} />}
      <MaterialCommunityIcons name={name} size={22} color={color} />
      {showAlert && (
        <View style={styles.alertDot}>
          <PulseDot color={theme.risk} size={7} />
        </View>
      )}
    </View>
  )
}

function ArenaMapIcon() {
  const theme = useSportTheme()

  return (
    <View style={{
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateY: 6 }],
    }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: 48,
          height: 48,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.ink,
          backgroundColor: theme.ink,
          opacity: 0.18,
        }}
      />
      <View style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 2,
        borderColor: theme.ink,
        backgroundColor: theme.ink,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.24,
        shadowRadius: 10,
        elevation: 6,
      }}>
        <MaterialCommunityIcons name="map-marker-radius" size={20} color={theme.arcadePanel} />
      </View>
    </View>
  )
}

/**
 * Icon row + label + top padding — the visible part of the bar.
 * Budget: paddingTop 8 + focus-dot overhang + icon wrap 28 + label ~16 +
 * breathing room. Anything under ~60 clips Thai descenders on the label.
 */
const TAB_BAR_CONTENT_HEIGHT = 64
/** Floor for devices reporting no bottom inset (older opaque nav bars). */
const TAB_BAR_MIN_BOTTOM_PAD = 12

export default function TabLayout() {
  const theme = useSportTheme()
  const styles = createStyles(theme)
  const { user } = useAuth()
  const { t } = useI18n(tabsDictionary)
  const notificationBadge = useNotificationSummary(user?.id)
  const hasIncomingFriendRequests = notificationBadge.incomingFriendRequestCount > 0
  // Edge-to-edge (app.json edgeToEdgeEnabled): the bar draws behind the
  // system navigation area, so its height must grow by the device's bottom
  // inset — gesture bar ~16-24dp, 3-button nav ~48dp, iOS home indicator
  // 34pt. A fixed height left icons/labels underneath 3-button nav bars.
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM_PAD)
  const tabBarStyle = [
    styles.tabBar,
    { height: TAB_BAR_CONTENT_HEIGHT + bottomPad, paddingBottom: bottomPad },
  ]

  return (
    <>
      <DailyCheckinModal />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: theme.orange,
          tabBarInactiveTintColor: theme.muted,
          tabBarShowLabel: true,
          tabBarAllowFontScaling: false,
          tabBarStyle,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="home-variant" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="rank"
          options={{
            title: t('ranking'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name="podium" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarLabel: () => null,
            tabBarIcon: () => <ArenaMapIcon />,
            tabBarButton: (props) => (
              <HapticTab {...props} accessibilityLabel="เปิดแผนที่สนามบาส" accessibilityHint="ค้นหาสนามบาสใกล้คุณ" onPress={() => guardedRouter.push('/arena-map', { actionKey: 'tab:arena-map' })} />
            ),
          }}
        />
        <Tabs.Screen
          name={REWARDS_TAB_ITEM.routeName}
          options={{
            title: t('redeem'),
            tabBarLabel: t('redeem'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={REWARDS_TAB_ITEM.icon} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: t('community'),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name="account-multiple-outline"
                color={color}
                focused={focused}
                showAlert={hasIncomingFriendRequests}
              />
            ),
          }}
        />
        {/* Matches remain reachable via router.push('/matches'). */}
        <Tabs.Screen
          name="matches"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="guild"
          options={{ href: null }}
        />
      </Tabs>
    </>
  )
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    tabBar: {
      backgroundColor: theme.arcadePanel,
      borderTopWidth: 0,
      paddingTop: 8,
      shadowColor: theme.arcadeShadow,
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -7 },
      elevation: 8,
    },
    tabLabel: {
      // No lineHeight: a box tighter than Thai's natural line box (~13px at
      // fontSize 10) makes iOS drop combining marks (อันดับ → อนดบ).
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0,
    },
    tabItem: { paddingTop: 4 },
    iconWrap: { alignItems: 'center', justifyContent: 'center', height: 28 },
    alertDot: {
      position: 'absolute',
      right: -8,
      top: -5,
    },
    focusDot: {
      position: 'absolute',
      top: -8,
      width: 22,
      height: 3,
      borderRadius: 2,
      backgroundColor: theme.orange,
    },
  })
}
