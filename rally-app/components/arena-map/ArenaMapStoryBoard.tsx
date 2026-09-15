import { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import { ArenaMapCluster } from '@/components/arena-map/ArenaMapCluster'
import { ArenaMapPin } from '@/components/arena-map/ArenaMapPin'
import { ArenaMapStoryPin } from '@/components/arena-map/ArenaMapStoryPin'
import { Fonts, type SportPalette } from '@/constants/theme'
import { useSportTheme } from '@/hooks/useAppTheme'
import { arenaMapStoryFixtures } from '@/lib/arena-map/arenaMapStory'

/** Deterministic native development board; it has no map query or runtime Conquest type. */
export function ArenaMapStoryBoard() {
  const theme = useSportTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  return <ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Arena Map Pin Types</Text>
    {arenaMapStoryFixtures.map((fixture, index) => {
      if (fixture.kind === 'runtime') return <View key={`${fixture.pin.id}-${index}`} style={styles.row}><ArenaMapPin pin={fixture.pin} selected={fixture.selected ?? false} onPress={() => undefined} /><Text style={styles.label}>{fixture.pin.type}</Text></View>
      if (fixture.kind === 'conquest') return <View key="conquest" style={styles.row}><ArenaMapStoryPin label={fixture.label} initials={fixture.initials} selected={fixture.selected} /><Text style={styles.label}>conquest_arena</Text></View>
      return <View key="cluster" style={styles.row}><ArenaMapCluster count={fixture.count} typeMix={fixture.typeMix} /><Text style={styles.label}>cluster</Text></View>
    })}
  </ScrollView>
}

function createStyles(theme: SportPalette) {
  return StyleSheet.create({
    content: { padding: 24, gap: 18, backgroundColor: theme.arenaPage, minHeight: '100%' },
    title: { color: theme.ink, fontSize: 24, lineHeight: 30, fontFamily: Fonts?.rounded, fontWeight: '900' },
    row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 18 },
    label: { color: theme.muted, fontSize: 13, lineHeight: 20, fontFamily: Fonts?.mono },
  })
}
