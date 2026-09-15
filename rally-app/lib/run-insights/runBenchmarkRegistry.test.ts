import { describe, expect, it } from 'vitest'

import {
  RUN_BENCHMARK_SOURCES,
  getRunBenchmarkSources,
  resolveAgeGradeBenchmark,
  resolveRunningEffortBenchmark,
} from './runBenchmarkRegistry'

describe('run benchmark registry', () => {
  it('keeps reviewed source metadata complete for curated running benchmarks', () => {
    const sources = getRunBenchmarkSources()

    expect(sources.map((source) => source.key)).toEqual([
      'age_grade_road_2025',
      'adult_compendium_running_2024',
      'strava_year_in_sport_2025',
      'runsignup_racetrends_2025',
    ])

    for (const source of sources) {
      expect(source.sourceName).toBeTruthy()
      expect(source.sourceUrl).toMatch(/^https:\/\//)
      expect(source.version).toBeTruthy()
      expect(source.license).toBeTruthy()
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(source.comparisonMode).toMatch(/^(numeric|source_note)$/)
    }

    expect(RUN_BENCHMARK_SOURCES.ageGrade.license).toBe('CC0-1.0')
    expect(RUN_BENCHMARK_SOURCES.ageGrade.version).toContain('2025')
    expect(RUN_BENCHMARK_SOURCES.ageGrade.sourceUrl).toContain('AlanLyttonJones/Age-Grade-Tables')
  })

  it('does not store user identifiers or raw health payloads in the static registry', () => {
    const serialized = JSON.stringify(getRunBenchmarkSources()).toLowerCase()

    expect(serialized).not.toContain('userid')
    expect(serialized).not.toContain('activitysessionid')
    expect(serialized).not.toContain('heartrate')
    expect(serialized).not.toContain('gps')
    expect(serialized).not.toContain('route')
  })

  it('resolves 2025 road age-grade context for supported race distances', () => {
    const benchmark = resolveAgeGradeBenchmark({
      distanceMeters: 5_000,
      movingTimeSeconds: 1_500,
      age: 32,
      category: 'men',
    })

    expect(benchmark).toMatchObject({
      distanceKey: '5k',
      distanceLabel: '5K',
      source: RUN_BENCHMARK_SOURCES.ageGrade,
    })
    expect(benchmark?.ageGradePercent).toBeCloseTo(51.45, 2)
  })

  it('resolves running MET context without turning it into a health verdict', () => {
    const benchmark = resolveRunningEffortBenchmark(300)

    expect(benchmark).toMatchObject({
      met: 11.8,
      intensityBand: 'vigorous',
      contextOnly: true,
      source: RUN_BENCHMARK_SOURCES.compendium,
    })
  })
})
