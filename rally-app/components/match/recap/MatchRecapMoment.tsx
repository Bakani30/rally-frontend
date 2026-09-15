import { useMemo, useRef, useState } from 'react'
import { Modal, ScrollView, Text, View } from 'react-native'
import { getSportPalette } from '@/constants/theme'
import type { RecapMomentViewModel } from '@/lib/match/recap/matchRecapMoment'
import { CaptureWatermarkBoard } from '@/components/share/CaptureWatermarkBoard'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useRunSummaryExport } from '@/hooks/useRunSummaryExport'
import { formatWatermarkTimestamp } from '@/lib/share/watermarkTimestamp'
import { createRecapMomentStyles, recapAccent, RECAP_GREEN, RECAP_RED } from './matchRecapMomentStyles'
import { RecapOutcomeBeat } from './RecapOutcomeBeat'
import { RecapImpactBeat } from './RecapImpactBeat'
import { RecapActionsBeat } from './RecapActionsBeat'

type MatchRecapMomentProps = {
  visible: boolean
  viewModel: RecapMomentViewModel | null
  victoryAssetRef: string | null
  onExit: () => void
  onRematch: () => void
  rematchPending?: boolean
  onViewAnalysis?: () => void
  onDismiss: () => void
}

export function MatchRecapMoment({
  visible, viewModel, victoryAssetRef, onExit, onRematch, rematchPending, onViewAnalysis, onDismiss,
}: MatchRecapMomentProps) {
  const theme = getSportPalette('dark')
  const styles = createRecapMomentStyles(theme)
  // Hooks must run unconditionally BEFORE the `!viewModel` early return below
  // (rules of hooks) — recompute the watermark timestamp each time the moment
  // opens so a long-mounted instance doesn't freeze on its first-ever open time.
  const cardRef = useRef<View>(null)
  const { saveToGallery, isSaving, status: saveStatus, errorMessage: saveError } = useRunSummaryExport()
  const { track } = useAnalytics()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute intentionally on each open (visible flip), not on a referenced value
  const watermarkText = useMemo(() => formatWatermarkTimestamp(new Date()), [visible])
  // `baking` gates the watermark board so it only exists in the tree during the
  // save capture window — it must never be visible during normal recap viewing.
  // The board resolves `bakeResolveRef` via onLayout once it has actually laid
  // out, so captureRef in handleSaveImage doesn't race an empty frame.
  const [baking, setBaking] = useState(false)
  const bakeResolveRef = useRef<(() => void) | null>(null)
  if (!viewModel) return null
  const accent = recapAccent(viewModel.tone)

  async function handleSaveImage() {
    if (baking || isSaving) return
    await new Promise<void>((resolve) => {
      bakeResolveRef.current = resolve
      setBaking(true)
    })
    try {
      const result = await saveToGallery(cardRef)
      if (result === 'saved') {
        track({ name: 'watermark_apply_succeeded', properties: { domain: 'basketball_recap', media: 'photo' } })
      } else {
        track({
          name: 'watermark_apply_failed',
          properties: { domain: 'basketball_recap', media: 'photo', reason: saveError ?? 'unknown' },
        })
      }
    } finally {
      bakeResolveRef.current = null
      setBaking(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Captured region: outcome + impact, with the watermark board mounted
              ONLY while `baking` (the save capture window) — see handleSaveImage.
              Keeps styles.card (background/padding) so the saved JPG has a proper
              backdrop. Action buttons live in RecapActionsBeat below, outside this
              ref, so they're never baked into the saved image. */}
          <View style={styles.card} ref={cardRef} collapsable={false}>
            <RecapOutcomeBeat viewModel={viewModel} victoryAssetRef={victoryAssetRef} />
            <RecapImpactBeat viewModel={viewModel} />
            {baking && (
              <View style={styles.watermarkOverlay} onLayout={() => bakeResolveRef.current?.()}>
                <CaptureWatermarkBoard slot={{ kind: 'timestamp', text: watermarkText }} />
              </View>
            )}
          </View>
          <RecapActionsBeat
            accent={accent}
            onExit={onExit}
            onRematch={onRematch}
            rematchPending={rematchPending}
            onViewAnalysis={onViewAnalysis}
            onSaveImage={() => void handleSaveImage()}
            isSaving={isSaving || baking}
          />
          {saveStatus === 'saved' && (
            <Text style={[styles.saveFeedback, { color: RECAP_GREEN }]}>บันทึกลงแกลเลอรีแล้ว</Text>
          )}
          {saveStatus === 'failed' && saveError && (
            <Text style={[styles.saveFeedback, { color: RECAP_RED }]}>{saveError}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}
