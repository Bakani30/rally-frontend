import { Text, View } from 'react-native'

import { PressableScale } from '@/components/motion/PressableScale'
import { useSportTheme } from '@/hooks/useAppTheme'
import { createFriendsHubStyles } from './friendsHubStyles'

export type FriendsTab = 'friends' | 'requests'

export type FriendsSegmentedTabsProps = {
  activeTab: FriendsTab
  friendCount: number
  requestCount: number
  onChange: (tab: FriendsTab) => void
}

/** Friends/Requests switcher with a semantic request count. */
export function FriendsSegmentedTabs({
  activeTab,
  friendCount,
  requestCount,
  onChange,
}: FriendsSegmentedTabsProps) {
  const theme = useSportTheme()
  const styles = createFriendsHubStyles(theme)

  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      <Tab
        tab="friends"
        active={activeTab === 'friends'}
        label="Friends"
        count={friendCount}
        onPress={() => onChange('friends')}
        styles={styles}
      />
      <Tab
        tab="requests"
        active={activeTab === 'requests'}
        label="Requests"
        count={requestCount}
        onPress={() => onChange('requests')}
        styles={styles}
      />
    </View>
  )
}

type TabProps = {
  tab: FriendsTab
  active: boolean
  label: string
  count: number
  onPress: () => void
  styles: ReturnType<typeof createFriendsHubStyles>
}

function Tab({ tab, active, label, count, onPress, styles }: TabProps) {
  return (
    <PressableScale
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} ${count}`}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
        {label}
        {tab === 'requests' ? (
          <Text style={[styles.tabCount, active && styles.tabCountActive]}> ({count})</Text>
        ) : null}
      </Text>
    </PressableScale>
  )
}
