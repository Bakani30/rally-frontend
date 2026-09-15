import type { Preview } from '@storybook/react-native'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { RallyStorybookFonts } from './RallyStorybookFonts'
import { RallyStorybookTheme } from './RallyStorybookTheme'

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    hideFullScreenButton: true,
  },
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <StatusBar hidden />
        <RallyStorybookTheme>
          <RallyStorybookFonts>
            <Story />
          </RallyStorybookFonts>
        </RallyStorybookTheme>
      </SafeAreaProvider>
    ),
  ],
}

export default preview
