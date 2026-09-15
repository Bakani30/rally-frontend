import { describe, expect, it } from 'vitest'
import { buildOverlayCommand } from './watermarkFfmpegCommand'

const base = {
  videoUri: 'file:///tmp/raw.mp4',
  watermarkPngUri: 'file:///tmp/mark.png',
  outputUri: 'file:///tmp/out.mp4',
  maxDurationSeconds: 60,
}

describe('buildOverlayCommand', () => {
  it('includes both inputs in order (video then watermark)', () => {
    const cmd = buildOverlayCommand(base)
    expect(cmd.indexOf('"file:///tmp/raw.mp4"')).toBeLessThan(cmd.indexOf('"file:///tmp/mark.png"'))
  })

  it('applies a top-anchored, horizontally-centred overlay', () => {
    expect(buildOverlayCommand(base)).toContain('overlay=(W-w)/2:24')
  })

  it('applies the trim guard from maxDurationSeconds', () => {
    expect(buildOverlayCommand(base)).toContain('-t 60')
    expect(buildOverlayCommand({ ...base, maxDurationSeconds: 30 })).toContain('-t 30')
  })

  it('copies audio and writes the output path last', () => {
    const cmd = buildOverlayCommand(base)
    expect(cmd).toContain('-c:a copy')
    expect(cmd.trim().endsWith('"file:///tmp/out.mp4"')).toBe(true)
  })

  it('overwrites without prompting', () => {
    expect(buildOverlayCommand(base).startsWith('-y ')).toBe(true)
  })
})
