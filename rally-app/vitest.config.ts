import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * Vitest covers pure utilities and platform-agnostic logic. Modules that import
 * React Native, expo-*, or native packages are out of scope here and need a
 * device-level harness (Detox / Maestro) which is not set up yet.
 */
export default defineConfig({
  resolve: {
    // Array form so we can match `react-native` exactly (a string alias would
    // also rewrite `react-native-*` packages). The RN stub keeps Flow-typed RN
    // out of the node transform; see test/stubs/react-native.ts.
    alias: [
      {
        find: /^react-native$/,
        replacement: fileURLToPath(new URL('./test/stubs/react-native.ts', import.meta.url)),
      },
      { find: '@', replacement: fileURLToPath(new URL('.', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: [
      'lib/run-tracking/*.test.ts',
      'lib/run-tracking/gps/**/*.test.ts',
      'lib/run-tracking/recap/**/*.test.ts',
      'lib/run-tracking/routes/**/*.test.ts',
      'lib/run-tracking/session/**/*.test.ts',
      'lib/run-tracking/summary/**/*.test.ts',
      'lib/run-tracking/export/**/*.test.ts',
      'lib/run-tracking/sources/**/*.test.ts',
      'lib/run-tracking/health-writeback/**/*.test.ts',
      'lib/run-tracking/permissions/**/*.test.ts',
      'lib/run-tracking/offline/**/*.test.ts',
      'lib/run-tracking/team/**/*.test.ts',
      'lib/maps/**/*.test.ts',
      'lib/discovery/**/*.test.ts',
      'lib/users/**/*.test.ts',
      'lib/replay/**/*.test.ts',
      'lib/challenges/**/*.test.ts',
      'lib/match/**/*.test.ts',
      'lib/onboarding/**/*.test.ts',
      'hooks/**/*.test.ts',
      'lib/run-story/**/*.test.ts',
      'lib/run-insights/**/*.test.ts',
      'lib/leaderboard/**/*.test.ts',
      'lib/ranks/**/*.test.ts',
      'lib/notifications/**/*.test.ts',
      'lib/navigation/**/*.test.ts',
      'lib/overlay/**/*.test.ts',
      'lib/policy/**/*.test.ts',
      'lib/profile/**/*.test.ts',
      'lib/daily-mission/**/*.test.ts',
      'lib/daily-quests/**/*.test.ts',
      'lib/quest-proof/**/*.test.ts',
      'lib/share/**/*.test.ts',
      'lib/activities/**/*.test.ts',
      'lib/history/**/*.test.ts',
      'lib/arenas/**/*.test.ts',
      'lib/arena-map/**/*.test.ts',
      'lib/arena-sessions/**/*.test.ts',
      'lib/dev-preview/**/*.test.ts',
      'lib/arena-results/**/*.test.ts',
      'lib/party/**/*.test.ts',
      'lib/venues/**/*.test.ts',
      'lib/analytics/**/*.test.ts',
      'lib/auth/**/*.test.ts',
      'lib/i18n/**/*.test.ts',
      'lib/typography/**/*.test.ts',
      'lib/wear/**/*.test.ts',
      'lib/rally-coin/**/*.test.ts',
      'lib/coach/**/*.test.ts',
      'lib/wallet/**/*.test.ts',
      'lib/cosmetics/**/*.test.ts',
      'lib/vouchers/**/*.test.ts',
      'lib/gifts/**/*.test.ts',
      'lib/map-quest/**/*.test.ts',
      'lib/health/**/*.test.ts',
      'lib/home/**/*.test.ts',
      'lib/design/**/*.test.ts',
      'components/profile/**/*.test.ts',
      'hooks/__tests__/**/*.test.ts',
      '.rnstorybook/**/*.test.ts',
      '.rnstorybook/**/*.test.tsx',
      '../supabase/functions/_shared/coach/**/*.test.ts',
      '../supabase/functions/refresh-coach-benchmarks/**/*.test.ts',
    ],
    exclude: ['node_modules', 'ios', 'android', '.expo'],
  },
})
