import { Modal, ScrollView, View } from 'react-native'
import { useThemeMode } from '@/hooks/useAppTheme'
import type { BodyMetricsViewModel } from '@/lib/run-tracking/recap/bodyMetrics'
import type { RunRecapViewModel } from '@/lib/run-tracking/recap/runRecapMoment'
import { createRunRecapColors, createRunRecapStyles, runRecapTonePresentation } from './runRecapMomentStyles'
import { RunRecapHeroBeat } from './RunRecapHeroBeat'
import { RunRecapImpactBeat } from './RunRecapImpactBeat'
import { RunRecapBodyBeat } from './RunRecapBodyBeat'
import { RunRecapActionsBeat } from './RunRecapActionsBeat'

type RunRecapMomentProps = {
  visible: boolean
  viewModel: RunRecapViewModel | null
  body: BodyMetricsViewModel | null
  onViewDetails: () => void
  onShare: () => void
  onHome: () => void
  onDismiss: () => void
}

export function RunRecapMoment({
  visible, viewModel, body, onViewDetails, onShare, onHome, onDismiss,
}: RunRecapMomentProps) {
  const mode = useThemeMode()
  const colors = createRunRecapColors(mode)
  const styles = createRunRecapStyles(colors)
  if (!viewModel) return null
  const tone = runRecapTonePresentation(colors, viewModel.tone)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <RunRecapHeroBeat viewModel={viewModel} tone={tone} styles={styles} />
            <RunRecapImpactBeat viewModel={viewModel} body={body} colors={colors} styles={styles} />
            <RunRecapBodyBeat body={body} colors={colors} styles={styles} />
            <RunRecapActionsBeat colors={colors} styles={styles} onViewDetails={onViewDetails} onShare={onShare} onHome={onHome} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}
