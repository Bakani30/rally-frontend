import { QuestCameraPermissionPanel } from '@/components/quests/QuestCameraPermissionPanel'
import type { DataSlot } from '@/components/share/CaptureWatermarkBoard'
import type { QuestMediaExt } from '@/lib/quest-proof/questProofTypes'

export type { DataSlot } from '@/components/share/CaptureWatermarkBoard'

type QuestCameraOverlayProps = {
  media: 'video' | 'image'
  questTitle: string
  slot: DataSlot
  onConfirm: (fileUri: string, mediaExt: QuestMediaExt) => void
  onDownload?: (fileUri: string, mediaExt: QuestMediaExt) => Promise<boolean> | boolean
  isDownloading?: boolean
  isProcessing?: boolean
  maxDurationSeconds?: number
  onCancel: () => void
}

export function QuestCameraOverlay({ onCancel }: QuestCameraOverlayProps) {
  return (
    <QuestCameraPermissionPanel
      message="การถ่ายหลักฐานรองรับเฉพาะแอปบนมือถือ"
      topInset={0}
      onCancel={onCancel}
    />
  )
}
