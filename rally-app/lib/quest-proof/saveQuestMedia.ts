type MediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>
  saveToLibraryAsync: (localUri: string) => Promise<void>
}

const loadMediaLibrary = async (): Promise<MediaLibraryModule> => {
  try {
    const mediaLibrary = await import('expo-media-library') as MediaLibraryModule
    if (
      typeof mediaLibrary.requestPermissionsAsync === 'function' &&
      typeof mediaLibrary.saveToLibraryAsync === 'function'
    ) {
      return mediaLibrary
    }
  } catch {
    // The caller exposes a short failure state instead of crashing the proof flow.
  }
  throw new Error('media_library_unavailable')
}

export async function saveQuestMediaToLibrary(uri: string): Promise<void> {
  const mediaLibrary = await loadMediaLibrary()
  const permission = await mediaLibrary.requestPermissionsAsync(true)
  if (!permission.granted) throw new Error('media_library_permission_denied')
  await mediaLibrary.saveToLibraryAsync(uri)
}
