import {
  IBMPlexSansThai_400Regular,
  IBMPlexSansThai_500Medium,
} from '@expo-google-fonts/ibm-plex-sans-thai'
import { Orbitron_800ExtraBold, Orbitron_900Black } from '@expo-google-fonts/orbitron'
import { Prompt_600SemiBold, Prompt_700Bold } from '@expo-google-fonts/prompt'
import { useFonts } from 'expo-font'
import type { PropsWithChildren } from 'react'

export function RallyStorybookFonts({ children }: PropsWithChildren) {
  useFonts({
    Orbitron_800ExtraBold,
    Orbitron_900Black,
    Prompt_600SemiBold,
    Prompt_700Bold,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
  })

  return <>{children}</>
}
