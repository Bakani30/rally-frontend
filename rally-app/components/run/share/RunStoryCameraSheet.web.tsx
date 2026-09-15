import { Modal } from 'react-native'

import { QuestCameraPermissionPanel } from '@/components/quests/QuestCameraPermissionPanel'

export type RunStoryCapturedAsset = { uri: string; kind: 'photo' | 'video' }

export type RunStoryCameraSheetProps = {
  visible: boolean
  onClose: () => void
  onCaptured: (asset: RunStoryCapturedAsset) => void
}

export function RunStoryCameraSheet({ visible, onClose }: RunStoryCameraSheetProps) {
  if (!visible) return null
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <QuestCameraPermissionPanel
        message="กล้องสำหรับสร้าง Story รองรับเฉพาะแอปบนมือถือ"
        topInset={0}
        onCancel={onClose}
      />
    </Modal>
  )
}
