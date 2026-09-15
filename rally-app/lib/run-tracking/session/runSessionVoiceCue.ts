export type RunSpeechOptions = {
  language?: string
  rate?: number
}

export type RunSpeechModule = {
  speak: (utterance: string, options?: RunSpeechOptions) => void | Promise<void>
}

export type RunSpeechModuleLoader = () => Promise<RunSpeechModule>

const loadExpoSpeech: RunSpeechModuleLoader = () => import('expo-speech')

export async function speakRunVoiceCue(
  utterance: string,
  loadSpeech: RunSpeechModuleLoader = loadExpoSpeech,
): Promise<boolean> {
  const trimmedUtterance = utterance.trim()
  if (!trimmedUtterance) return false

  try {
    const Speech = await loadSpeech()
    await Speech.speak(trimmedUtterance, { language: 'en-US', rate: 1.0 })
    return true
  } catch {
    return false
  }
}
