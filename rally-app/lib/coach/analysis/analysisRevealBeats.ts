import type { StatHexagon } from './basketballStatHexagon'

export type RevealBeatKind = 'result' | 'strength' | 'gap' | 'signature' | 'mastery'

export type RevealBeat = {
  kind: RevealBeatKind
  eyebrow: string
  title: string
  detail: string | null
}

type BuildRevealBeatsArgs = {
  resultLabel: 'WIN' | 'LOSS' | 'TIE' | null
  scoreLine: string | null
  hexagon: StatHexagon
  mastery: { roleLabel: string; level: number; matches: number }
  language: 'en' | 'th'
}

function axisDetail(axis: { value: number | null; statLabel: string } | undefined): string | null {
  return axis && axis.value != null ? `${axis.value} ${axis.statLabel}` : null
}

// Ordered "reveal" beats for the entry popup — each is a real highlight pulled
// from this match's hexagon/result, shown one tap at a time before the full report.
export function buildRevealBeats({
  resultLabel, scoreLine, hexagon, mastery, language,
}: BuildRevealBeatsArgs): RevealBeat[] {
  const th = language === 'th'
  const beats: RevealBeat[] = []

  if (resultLabel || scoreLine) {
    beats.push({
      kind: 'result',
      eyebrow: th ? 'ผลแมตช์' : 'RESULT',
      title: resultLabel ?? scoreLine ?? '',
      detail: resultLabel && scoreLine ? scoreLine : null,
    })
  }

  const strong = hexagon.axes.find((a) => a.key === hexagon.strongest)
  if (strong) {
    beats.push({
      kind: 'strength',
      eyebrow: th ? 'จุดเด่นสุด' : 'TOP STRENGTH',
      title: strong.rpgLabel,
      detail: axisDetail(strong),
    })
  }

  const weak = hexagon.axes.find((a) => a.key === hexagon.weakest)
  if (weak && weak.key !== strong?.key) {
    beats.push({
      kind: 'gap',
      eyebrow: th ? 'ควรพัฒนา' : 'WORK ON',
      title: weak.rpgLabel,
      detail: axisDetail(weak),
    })
  }

  beats.push({
    kind: 'mastery',
    eyebrow: th ? 'ความชำนาญ' : 'MASTERY',
    title: `${mastery.roleLabel.toUpperCase()} · Lv.${mastery.level}`,
    detail: th ? `${mastery.matches} แมตช์` : `${mastery.matches} matches`,
  })

  return beats
}
