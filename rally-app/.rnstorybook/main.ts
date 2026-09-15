import type { StorybookConfig } from '@storybook/react-native'

const config: StorybookConfig = {
  stories: ['./stories/**/*.stories.?(ts|tsx)'],
  deviceAddons: [
    '@storybook/addon-ondevice-actions',
    '@storybook/addon-ondevice-controls',
  ],
}

export default config
