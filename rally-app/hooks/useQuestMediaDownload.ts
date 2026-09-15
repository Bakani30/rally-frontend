import { useCallback, useState } from 'react'

import { saveQuestMediaToLibrary } from '@/lib/quest-proof/saveQuestMedia'

export type QuestMediaDownloadStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useQuestMediaDownload() {
  const [status, setStatus] = useState<QuestMediaDownloadStatus>('idle')

  const saveToGallery = useCallback(async (uri: string): Promise<boolean> => {
    setStatus('saving')
    try {
      await saveQuestMediaToLibrary(uri)
      setStatus('saved')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [])

  return {
    saveToGallery,
    isSaving: status === 'saving',
    status,
  }
}
