import { useMutation, useQueryClient } from '@tanstack/react-query'

import { activityDetailQueryKeys } from '@/lib/activities/detail/activityDetailQueryKeys'
import {
  saveRunStoryImage,
  type SaveRunStoryImageResult,
  type SaveRunStoryMediaKind,
} from '@/lib/run-story/runStoryMediaService'

type SaveRunStoryImageVariables = {
  userId: string
  activitySessionId: string
  mediaUri: string
  /** Defaults to 'photo' — set 'video' for a video-background story card export. */
  kind?: SaveRunStoryMediaKind
}

export function useSaveRunStoryImage(userId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation<SaveRunStoryImageResult, Error, SaveRunStoryImageVariables>({
    mutationFn: (input) => saveRunStoryImage(input),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: activityDetailQueryKeys.detail(variables.activitySessionId),
      })
      queryClient.invalidateQueries({ queryKey: ['activity-history', userId] })
    },
  })
}
