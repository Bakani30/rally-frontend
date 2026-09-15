import type { ThemeMode } from '@/constants/theme'

export const RUN_FLOW_ACCENT = '#d9ff3a'
export const RUN_FLOW_ON_ACCENT_LIGHT = '#21300a'
export const RUN_FLOW_DARK = '#11121c'

export type RunFlowColors = {
  bg: string
  surface: string
  surfaceBorder: string
  inputBg: string
  accent: string
  onAccent: string
  text: string
  subText: string
  eyebrow: string
  points: string
  pillIdleBg: string
  pillIdleText: string
  pillIdleBorder: string
  secondaryBorder: string
  secondaryText: string
  danger: string
  chalk: string
}

const LIGHT: RunFlowColors = {
  bg: '#eef4f9',
  surface: '#fbfcf8',
  surfaceBorder: 'rgba(22,22,22,0.08)',
  inputBg: '#eef4f9',
  accent: RUN_FLOW_ACCENT,
  onAccent: RUN_FLOW_ON_ACCENT_LIGHT,
  text: '#161616',
  subText: '#5f6b66',
  eyebrow: '#3a6b4f',
  points: '#b07d00',
  pillIdleBg: '#eef4f9',
  pillIdleText: '#5f6b66',
  pillIdleBorder: 'rgba(22,22,22,0.12)',
  secondaryBorder: 'rgba(22,22,22,0.12)',
  secondaryText: '#5f6b66',
  danger: '#c73f41',
  chalk: '#fff8f0',
}

const DARK: RunFlowColors = {
  bg: RUN_FLOW_DARK,
  surface: '#1c1e2b',
  surfaceBorder: 'transparent',
  inputBg: '#1c1e2b',
  accent: RUN_FLOW_ACCENT,
  onAccent: RUN_FLOW_DARK,
  text: '#f3f6ee',
  subText: '#9a9eb2',
  eyebrow: '#7e8298',
  points: '#eac31a',
  pillIdleBg: '#1c1e2b',
  pillIdleText: '#9a9eb2',
  pillIdleBorder: '#2c2f40',
  secondaryBorder: '#2c2f40',
  secondaryText: '#9a9eb2',
  danger: '#e0666a',
  chalk: '#fff8f0',
}

export function runFlowColors(mode: ThemeMode): RunFlowColors {
  return mode === 'dark' ? DARK : LIGHT
}
