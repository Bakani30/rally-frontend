import { StyleSheet } from 'react-native'

// The analysis page is a fixed light "report" surface (white page, black text,
// orange + navy accents), independent of the app's dark fight theme.
export const A = {
  page: '#ffffff',
  ink: '#161616',
  muted: '#8a8984',
  faint: '#a8a6a0',
  line: '#efece4',
  border: '#e3e0d8',
  surface: '#f6f4ee',
  orange: '#FFA649',
  navy: '#283845',
  up: '#1a9d63',
  down: '#d23b3f',
  winBg: '#e7f6ec',
  winInk: '#1a7d4e',
  loseBg: '#fdecec',
  loseInk: '#c0322f',
}

export const analysisStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: A.page },
  content: { paddingBottom: 40 },
  sectionWrap: { paddingHorizontal: 18, gap: 8, marginTop: 16 },
  sectionTitle: { color: A.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  lockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 18, marginTop: 12,
    backgroundColor: A.surface, borderRadius: 12, borderWidth: 1, borderColor: A.border, padding: 14,
  },
  lockText: { flex: 1, color: A.ink, fontSize: 13, fontWeight: '900' },
  stateText: { color: A.muted, fontSize: 13, fontWeight: '800', textAlign: 'center', padding: 24 },
})
