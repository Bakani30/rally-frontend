// Minimal `react-native` stub for Vitest (node environment).
//
// Why: pure utils/presenters under test legitimately read design tokens from
// @/constants/theme, which imports `Platform` from react-native purely for
// font selection. react-native's real entry is Flow-typed (`import typeof …`)
// and Vitest's node SSR transform cannot parse it, so importing it breaks the
// whole transform. This stub provides just enough of `Platform` for token
// modules to evaluate. It is aliased ONLY in vitest.config.ts — never shipped.
//
// Keep this tiny: it is not a place to emulate RN behavior. Add an export only
// when a pure module under test genuinely needs it.

type SelectSpec<T> = {
  ios?: T
  android?: T
  native?: T
  default?: T
}

export const Platform = {
  OS: 'ios' as const,
  select<T>(spec: SelectSpec<T>): T | undefined {
    return spec.ios ?? spec.native ?? spec.default ?? spec.android
  },
}
