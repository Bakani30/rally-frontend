// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Roadmap Phase 0 guardrail — WARN now, flips to ERROR in Phase 4.
    // Mirrors packages/config/eslint/base.mjs (this CJS config can't cleanly import the ESM base yet).
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.test.*', '**/*.spec.*', '**/*.gen.ts', '**/database.types.ts'],
    rules: { 'max-lines': 'off' },
  },
  {
    // §2.5 boundary (verified clean — locks current state). Screens/components must not touch
    // the Supabase client directly; go through a hook/service. WARN now → ERROR in Phase 4.
    // (lib → react/RN/expo purity is intentionally deferred to Phase 2: lib holds legit native
    //  integration wrappers — health/GPS/overlay/notifications adapters — a blanket ban would falsely flag.)
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['warn', {
        paths: [
          { name: '@/lib/supabase', message: 'Screens/components must not import the Supabase client directly (§2.5). Use a hook/service.' },
          { name: '@supabase/supabase-js', message: 'Do not use a Supabase client in app/ or components/ (§2.5). Use a hook/service.' },
        ],
      }],
    },
  },
]);
