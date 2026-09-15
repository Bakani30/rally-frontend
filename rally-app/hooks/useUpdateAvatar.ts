import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pickAvatarFromLibrary, uploadAvatar } from '@/lib/profile/avatarService'
import type { UserProfile } from '@/lib/profile/profileRepository'
import { profileQueryKeys } from '@/lib/profile/profileQueryKeys'

export function useUpdateAvatar(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in')
      const picked = await pickAvatarFromLibrary()
      if (!picked) return null

      const detailKey = profileQueryKeys.detail(userId)
      const previous = qc.getQueryData<UserProfile>(detailKey)
      qc.setQueryData<UserProfile | undefined>(detailKey, (old) =>
        old ? { ...old, avatar_url: picked.uri } : old,
      )

      try {
        return await uploadAvatar(userId, picked.uri)
      } catch (err) {
        if (previous) qc.setQueryData(detailKey, previous)
        throw err
      }
    },
    onSuccess: (url) => {
      if (!url || !userId) return
      const detailKey = profileQueryKeys.detail(userId)
      qc.setQueryData<UserProfile | undefined>(detailKey, (old) =>
        old ? { ...old, avatar_url: url } : old,
      )
      qc.invalidateQueries({ queryKey: profileQueryKeys.summary(userId) })
    },
  })
}
