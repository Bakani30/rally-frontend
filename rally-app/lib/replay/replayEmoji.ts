type GraphemeSegmenter = new (
  locales?: string | string[],
  options?: { granularity: 'grapheme' },
) => { segment: (input: string) => Iterable<{ segment: string }> }

function fallbackFirstGrapheme(input: string): string {
  const codePoints = Array.from(input)
  let result = ''

  for (const codePoint of codePoints) {
    const code = codePoint.codePointAt(0) ?? 0
    const isModifier = code >= 0x1f3fb && code <= 0x1f3ff
    const isVariationSelector = code === 0xfe0e || code === 0xfe0f
    const isJoiner = code === 0x200d
    const isCombiningMark = /\p{Mark}/u.test(codePoint)

    if (result.length === 0 || isModifier || isVariationSelector || isJoiner || isCombiningMark || result.endsWith('\u200d')) {
      result += codePoint
      continue
    }

    break
  }

  return result
}

/** Keep one complete emoji grapheme, including ZWJ, skin-tone, and variation sequences. */
export function normalizeReplayEmoji(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const Segmenter = (Intl as unknown as { Segmenter?: GraphemeSegmenter }).Segmenter
  if (!Segmenter) return fallbackFirstGrapheme(trimmed)

  const [first] = Array.from(new Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed))
  return first?.segment ?? ''
}
