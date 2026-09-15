import { describe, expect, it } from 'vitest'
import {
  buildBasketballFinalDataDesign,
  buildCoachReportProfileSummary,
  buildCoachReportSummaryMetricCards,
  buildCoachReportSummaryTakeaways,
  buildCoachReportPreview,
  buildCoachReportStages,
  formatCoachTopicScore,
  getCoachReportSetupPrompt,
  getCoachReportDetailBlocks,
  getCoachReportSections,
  normalizeBasketballBenchmarkFormat,
  type BasketballFinalDataAxisKey,
} from './coachReportPresentation'
import type { BasketballRole, CoachBenchmarkBaseline, CoachBenchmarkFormat, GetCoachActivityInsightsResult } from './coachTypes'

function insights(
  overrides: Partial<GetCoachActivityInsightsResult> = {},
): GetCoachActivityInsightsResult {
  return {
    entitlement: { hasPro: true, source: 'pro_subscription' },
    sportPack: 'basketball',
    previewCards: [],
    cards: [
      {
        id: 'form_last5',
        type: 'form',
        title: 'Recent basketball form',
        body: 'Last five matches improved.',
        severity: 'positive',
        locked: false,
        source: 'history',
        score: {
          status: 'up',
          delta: 3,
          current: 4,
          baseline: 1,
          unit: 'margin',
          scope: 'sport',
        },
      },
      {
        id: 'cue_handler_playmaking_balance',
        type: 'training_cue',
        title: 'Playmaking balance',
        body: 'AST required.',
        severity: 'neutral',
        locked: false,
        source: 'context',
      },
    ],
    lockedCardCount: 0,
    missingInputs: ['sensor'],
    currentContext: {
      role: 'handler',
      resultTags: [],
      detailTags: [],
      focusTag: null,
      rpe: null,
      basketballStats: {},
    },
    statBaseline: {
      sampleSize: 4,
      minimumSample: 3,
      scope: 'sport',
      averages: { points: 5, rebounds: 4, assists: 2 },
      previousStatline: { points: 4, rebounds: 5, assists: 3 },
      matchesNeeded: 0,
    },
    reportSignals: [
      { id: 'record', type: 'history', label: '2W-1L', value: 'last 3' },
      { id: 'score', type: 'score', label: 'Won 8-7', value: '+1' },
    ],
    sensorState: { status: 'needs_sync' },
    analyticsMemory: {
      retention: 'career',
      detailArchiveAccessUnchanged: true,
    },
    ...overrides,
  }
}

const fullStatKeys: BasketballFinalDataAxisKey[] = [
  'points',
  'twoPointersMade',
  'threePointersMade',
  'assists',
  'rebounds',
  'steals',
  'blocks',
  'freeThrowsMade',
]

describe('normalizeBasketballBenchmarkFormat', () => {
  it('maps activity detail format and team size to benchmark format segments', () => {
    expect(normalizeBasketballBenchmarkFormat('3v3', null)).toBe('3x3')
    expect(normalizeBasketballBenchmarkFormat('5x5', null)).toBe('5v5')
    expect(normalizeBasketballBenchmarkFormat('basketball', 3)).toBe('3x3')
    expect(normalizeBasketballBenchmarkFormat('basketball', null)).toBe('rally_pickup')
  })
})

function roleBenchmarkRows(input: {
  level: 'web_general' | 'web_nba' | 'rally_population'
  role: BasketballRole
  benchmarkFormat?: CoachBenchmarkFormat
  values: Record<BasketballFinalDataAxisKey, number>
}): CoachBenchmarkBaseline[] {
  return fullStatKeys.map((metric) => ({
    id: `${input.level}_${input.role}_${metric}`,
    sport: 'basketball',
    level: input.level,
    role: input.role,
    benchmarkFormat: input.benchmarkFormat ?? (input.level === 'web_nba' ? '5v5' : 'rally_pickup'),
    sourceTier:
      input.level === 'web_nba'
        ? 'external_pro'
        : input.level === 'rally_population'
          ? 'rally_population'
          : 'external_general',
    metric,
    value: input.values[metric],
    unit: statUnit(metric),
    label: `${input.level} ${input.role} ${metric}`,
    sourceName: input.level === 'web_nba'
      ? 'NBA.com player traditional stats'
      : input.level === 'rally_population'
        ? 'Rally population role aggregate'
        : 'Rally calibrated recreational basketball priors',
    sourceUrl: input.level === 'web_nba'
      ? 'https://www.nba.com/stats/players/traditional?PerMode=PerGame'
      : input.level === 'rally_population'
        ? 'rally://coach/benchmarks/population'
        : 'rally://coach/benchmarks/general-priors',
    season: '2026-general-v1',
    fetchedAt: '2026-05-22',
    normalization:
      input.level === 'web_nba'
        ? 'nba_role_archetype'
        : input.level === 'rally_population'
          ? 'rally_population'
          : 'raw_match',
    sampleSize: input.level === 'web_general' ? null : 60,
  }))
}

function statUnit(metric: BasketballFinalDataAxisKey): string {
  const labels: Record<BasketballFinalDataAxisKey, string> = {
    points: 'PTS',
    twoPointersMade: '2PT',
    rebounds: 'REB',
    assists: 'AST',
    steals: 'STL',
    blocks: 'BLK',
    threePointersMade: '3PM',
    freeThrowsMade: 'FT',
  }
  return labels[metric]
}

describe('buildCoachReportPreview', () => {
  it('summarizes the report as a compact entry with signal chips instead of a long accordion', () => {
    const preview = buildCoachReportPreview(insights(), 'en')

    expect(preview.title).toBe('Coach Report')
    expect(preview.summary).toContain('2 signals ready')
    expect(preview.chips.map((chip) => chip.label)).toEqual(['2W-1L', 'Won 8-7'])
    expect(preview.ctaLabel).toBe('Open report')
  })
})

describe('buildCoachReportStages', () => {
  it('builds a player-card style report summary without pro player fields', () => {
    const profile = buildCoachReportProfileSummary({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 8, twoPointersMade: 2, assists: 2, rebounds: 4 },
        },
        statBaseline: {
          sampleSize: 2,
          minimumSample: 3,
          scope: 'sport',
          averages: {},
          previousStatline: null,
          matchesNeeded: 1,
        },
        sensorState: { status: 'available' },
      }),
      ownTeamScore: 21,
      benchmarkFormat: '3x3',
      isWin: true,
      language: 'en',
    })

    expect(profile).toMatchObject({
      title: 'Your Match',
      roleLabel: 'Shooter',
      impactValue: '8',
      impactUnit: 'PTS',
    })
    expect(profile.facts.map((fact) => fact.label)).toEqual([
      'RESULT',
      'FORMAT',
      'TEAM PTS',
      'SENSOR',
      'HISTORY',
    ])
    expect(profile.facts.map((fact) => fact.value)).toEqual([
      'WIN',
      '3x3',
      '21',
      'SYNCED',
      '2 MATCHES',
    ])
    expect(profile.stats.map((stat) => stat.label)).toEqual(['PTS', '2PT', 'AST', 'REB'])
    expect(profile.stats.map((stat) => stat.valueLabel)).toEqual(['8', '2', '2', '4'])
    expect(JSON.stringify(profile)).not.toMatch(/Stephen|Curry|NBA|ESPN|Kaggle/)
  })

  it('builds a 3x3 Impact 6 hexagon using outside-arc 2PT on the role scale', () => {
    const profile = buildCoachReportProfileSummary({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 9, twoPointersMade: 2, assists: 1, rebounds: 3, steals: 0, blocks: 0 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: roleBenchmarkRows({
            level: 'web_general',
            role: 'shooter',
            benchmarkFormat: '3x3',
            values: {
              points: 9,
              twoPointersMade: 1.9,
              threePointersMade: 2.5,
              assists: 2,
              rebounds: 3,
              steals: 1,
              blocks: 0.4,
              freeThrowsMade: 1.8,
            },
          }),
        },
      }),
      benchmarkFormat: '3x3',
      language: 'en',
    })

    expect(profile.hexAxes.map((axis) => axis.label)).toEqual(['PTS', '2PT', 'AST', 'REB', 'STL', 'BLK'])
    expect(profile.hexAxes.find((axis) => axis.key === 'twoPointersMade')).toEqual(
      expect.objectContaining({
        value: 2,
        valueLabel: '2',
        referenceLabel: 'Role scale 2.5',
        score: 56,
        state: 'ready',
      }),
    )
    expect(profile.hexAxes.find((axis) => axis.key === 'blocks')).toEqual(
      expect.objectContaining({
        value: 0,
        valueLabel: '0',
        score: 0,
        state: 'ready',
      }),
    )
    expect(JSON.stringify(profile)).not.toMatch(/NBA|ESPN|Kaggle|Stephen|Curry|Warriors|Lakers/)
  })

  it('builds pickup Impact 6 with 3PM and treats missing stats as no data', () => {
    const profile = buildCoachReportProfileSummary({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2, assists: 1, rebounds: 2 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: roleBenchmarkRows({
            level: 'web_general',
            role: 'shooter',
            benchmarkFormat: 'rally_pickup',
            values: {
              points: 7,
              twoPointersMade: 1.4,
              threePointersMade: 1.8,
              assists: 1.8,
              rebounds: 2.8,
              steals: 0.8,
              blocks: 0.2,
              freeThrowsMade: 1.1,
            },
          }),
        },
      }),
      benchmarkFormat: 'rally_pickup',
      language: 'en',
    })

    expect(profile.hexAxes.map((axis) => axis.label)).toEqual(['PTS', '3PM', 'AST', 'REB', 'STL', 'BLK'])
    expect(profile.hexAxes.find((axis) => axis.key === 'threePointersMade')).toEqual(
      expect.objectContaining({
        valueLabel: '2',
        referenceLabel: 'Role scale 1.8',
        score: 78,
        state: 'ready',
      }),
    )
    expect(profile.hexAxes.find((axis) => axis.key === 'steals')).toEqual(
      expect.objectContaining({
        value: null,
        valueLabel: '—',
        referenceLabel: 'Role scale 0.8',
        score: null,
        state: 'missing_current',
      }),
    )
    expect(JSON.stringify(profile.hexAxes.find((axis) => axis.key === 'steals'))).not.toMatch(/risk|bad|poor|แย่/i)
  })

  it('builds role-aware summary metric cards for every basketball stat before personal history exists', () => {
    const cards = buildCoachReportSummaryMetricCards({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2, assists: 1, rebounds: 5 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            {
              id: 'legacy_all_points',
              sport: 'basketball',
              level: 'web_general',
              role: 'all',
              benchmarkFormat: 'rally_pickup',
              sourceTier: 'external_general',
              metric: 'points',
              value: 30,
              unit: 'PTS',
              label: 'All-role PTS',
              sourceName: 'Legacy',
              sourceUrl: 'rally://legacy',
              season: '2026-general-v1',
              fetchedAt: '2026-05-22',
              normalization: 'raw_match',
              sampleSize: null,
            },
            ...roleBenchmarkRows({
              level: 'web_general',
              role: 'shooter',
              benchmarkFormat: 'rally_pickup',
              values: {
                points: 7,
                twoPointersMade: 1.4,
                threePointersMade: 1.8,
                assists: 1.8,
                rebounds: 2.8,
                steals: 0.8,
                blocks: 0.2,
                freeThrowsMade: 1.1,
              },
            }),
            ...roleBenchmarkRows({
              level: 'web_general',
              role: 'shooter',
              benchmarkFormat: '3x3',
              values: {
                points: 9,
                twoPointersMade: 1.9,
                threePointersMade: 2.5,
                assists: 2,
                rebounds: 3,
                steals: 1,
                blocks: 0.4,
                freeThrowsMade: 1.8,
              },
            }),
          ],
        },
      }),
      benchmarkFormat: 'rally_pickup',
      language: 'th',
    })

    expect(cards.map((card) => card.key)).toEqual(fullStatKeys)
    expect(cards).toHaveLength(8)
    expect(cards.find((card) => card.key === 'points')).toEqual(
      expect.objectContaining({
        valueLabel: '6',
        referenceLabel: 'ทั่วไป 7',
        deltaLabel: '-1',
        tone: 'neutral',
      }),
    )
    expect(cards.find((card) => card.key === 'threePointersMade')).toEqual(
      expect.objectContaining({
        valueLabel: '2',
        referenceLabel: 'ทั่วไป 1.8',
        deltaLabel: '+0.2',
      }),
    )
    expect(cards.find((card) => card.key === 'twoPointersMade')).toEqual(
      expect.objectContaining({
        valueLabel: '—',
        referenceLabel: 'ทั่วไป 1.4',
        deltaLabel: null,
        tone: 'missing',
      }),
    )
    expect(cards.find((card) => card.key === 'freeThrowsMade')).toEqual(
      expect.objectContaining({
        valueLabel: '—',
        referenceLabel: 'ทั่วไป 1.1',
        deltaLabel: null,
        tone: 'missing',
      }),
    )
  })

  it('builds useful summary takeaways even before personal averages exist', () => {
    const takeaways = buildCoachReportSummaryTakeaways({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, rebounds: 5, assists: 1 },
        },
        statBaseline: {
          sampleSize: 1,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 2,
        },
      }),
      ownTeamScore: 21,
      language: 'th',
    })

    expect(takeaways).toEqual([
      expect.objectContaining({
        id: 'scoring_share',
        valueLabel: '29%',
        body: expect.stringContaining('6 จาก 21'),
      }),
      expect.objectContaining({
        id: 'general_reference',
        label: 'เทียบคนทั่วไป',
        body: expect.stringContaining('Shooter pickup'),
      }),
      expect.objectContaining({
        id: 'assist_turnover',
        valueLabel: '1 AST',
        body: expect.stringContaining('AST 1 เป็นสัญญาณหลัก'),
      }),
    ])
  })

  it('uses distinct takeaway ids when personal and general stat references both render', () => {
    const takeaways = buildCoachReportSummaryTakeaways({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, rebounds: 3 },
        },
        statBaseline: {
          sampleSize: 4,
          minimumSample: 3,
          scope: 'sport',
          averages: { points: 5 },
          previousStatline: null,
          matchesNeeded: 0,
        },
      }),
      ownTeamScore: null,
      language: 'en',
    })
    const ids = takeaways.map((takeaway) => takeaway.id)

    expect(ids).toEqual(expect.arrayContaining(['personal_reference', 'general_reference']))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses statline chips and a grounded summary verdict when report signals are sparse', () => {
    const stages = buildCoachReportStages(
      insights({
        reportSignals: [],
        currentContext: {
          role: 'handler',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { assists: 4 },
        },
      }),
      'th',
    )
    const summary = stages.find((stage) => stage.kind === 'summary')

    expect(summary).toMatchObject({
      kind: 'summary',
      verdict: 'Handler pickup: AST สูงกว่าคนทั่วไป +0.5',
      chips: [
        { id: 'stat_ast', label: 'AST 4', tone: 'stat' },
      ],
    })
  })

  it('starts with the overall summary before role impact topics and the final data board', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [
          {
            id: 'cue_handler_playmaking_balance',
            type: 'training_cue',
            title: 'Playmaking balance',
            body: 'AST required.',
            severity: 'neutral',
            locked: false,
            source: 'context',
          },
          {
            id: 'cue_shooter_scoring_profile',
            type: 'training_cue',
            title: 'Scoring profile',
            body: 'PTS required.',
            severity: 'neutral',
            locked: false,
            source: 'context',
          },
        ],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2, rebounds: 4 },
        },
      }),
      'th',
    )

    const stageIds = stages.map((stage) => stage.id)
    const summaryIndex = stageIds.indexOf('summary')
    expect(stageIds[0]).toBe('summary')
    expect(stageIds[1]).toBe('cue_shooter_scoring_profile')
    expect(summaryIndex).toBe(0)
    expect(stageIds.at(-1)).toBe('final')
    expect(stageIds).not.toContain('cue_handler_playmaking_balance')
  })

  it('moves off-role reads under the final data board grouped by role instead of linear stages', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [
          {
            id: 'cue_handler_playmaking_balance',
            type: 'training_cue',
            title: 'Playmaking balance',
            body: 'AST 1.',
            severity: 'neutral',
            locked: false,
            source: 'context',
          },
          {
            id: 'cue_big_rebounds',
            type: 'training_cue',
            title: 'Rebounding',
            body: 'REB 4.',
            severity: 'neutral',
            locked: false,
            source: 'context',
            metrics: { rebounds: 4 },
          },
        ],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 8, threePointersMade: 2, assists: 1 },
        },
      }),
      'th',
    )

    const finalStage = stages.find((stage) => stage.kind === 'final')
    const otherRoles = finalStage?.optionalSections.find((section) => section.id === 'other_roles')

    expect(stages.filter((stage) => stage.kind === 'topic').map((stage) => stage.id)).toEqual([
      'cue_shooter_scoring_profile',
    ])
    expect(otherRoles?.groups.map((group) => group.id)).toEqual(expect.arrayContaining(['handler']))
    expect(otherRoles?.groups.find((group) => group.id === 'shooter')).toBeUndefined()
    expect(otherRoles?.groups.flatMap((group) => group.items.map((item) => item.id))).toEqual(
      expect.arrayContaining(['cue_handler_playmaking_balance']),
    )
  })

  it('keeps Pro reads locked in a separate final board section', () => {
    const stages = buildCoachReportStages(
      insights({
        entitlement: { hasPro: false, source: 'pro_subscription' },
        cards: [],
        previewCards: [
          {
            id: 'pro_shot_quality',
            type: 'preview',
            title: 'Shot quality',
            body: 'Unlock to read shot quality.',
            severity: 'neutral',
            locked: true,
            source: 'context',
          },
        ],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2 },
        },
      }),
      'th',
    )

    const finalStage = stages.find((stage) => stage.kind === 'final')
    const proReads = finalStage?.optionalSections.find((section) => section.id === 'pro_reads')

    expect(proReads?.groups[0]?.items).toEqual([
      expect.objectContaining({
        id: 'pro_shot_quality',
        gate: 'pro_locked',
      }),
    ])
  })

  it('puts missing-stat optional reads under the final board without adding them as stages', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [
          {
            id: 'cue_defender_stat_impact',
            type: 'training_cue',
            title: 'Defensive stat impact',
            body: 'STL and BLK required.',
            severity: 'neutral',
            locked: false,
            source: 'context',
          },
        ],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2 },
        },
      }),
      'th',
    )

    const finalStage = stages.find((stage) => stage.kind === 'final')
    const missingInputs = finalStage?.optionalSections.find((section) => section.id === 'missing_inputs')
    const missingItems = missingInputs?.groups.flatMap((group) => group.items) ?? []

    expect(stages.map((stage) => stage.id)).not.toContain('cue_defender_stat_impact')
    expect(missingItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'cue_defender_stat_impact',
          gate: 'needs_stats',
          requiredInputs: {
            kind: 'stats',
            statKeys: ['steals', 'blocks'],
          },
        }),
      ]),
    )
  })

  it('keeps required stat prompts on the role topic until the exact stat is filled', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [],
        currentContext: {
          role: 'handler',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: {},
        },
      }),
      'th',
    )

    const playmaking = stages.find(
      (stage): stage is Extract<(typeof stages)[number], { kind: 'topic' }> =>
        stage.kind === 'topic' && stage.id === 'cue_handler_playmaking_balance',
    )

    expect(playmaking?.requiredInputs).toEqual({
      kind: 'stats',
      statKeys: ['assists'],
    })
    expect(playmaking?.topic.gate).toBe('needs_stats')
  })

  it('does not create a free-throw analysis when FT was never logged', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2 },
        },
      }),
      'th',
    )
    const topicStages = stages.filter((stage) => stage.kind === 'topic')

    expect(topicStages.map((stage) => stage.id)).toContain('cue_shooter_scoring_profile')
    expect(topicStages.find((stage) => stage.id === 'cue_shooter_scoring_profile')).toMatchObject({
      topic: {
        gate: 'none',
        body: 'ต้องแก้: PTS 6, 3PM 2 สำหรับ Shooter ยังน้อย; เกมหน้าหา catch-and-shoot หรือแต้มจาก FT ให้เร็วขึ้น',
      },
    })
    expect(topicStages.map((stage) => stage.id)).not.toContain('cue_free_throws')
  })

  it('keeps a head-to-head topic visible when matchup history is not enough yet', () => {
    const sections = getCoachReportSections({
      data: insights({
        cards: [
          {
            id: 'form_last5',
            type: 'form',
            title: 'Recent basketball form',
            body: 'Last five matches improved.',
            severity: 'positive',
            locked: false,
            source: 'history',
          },
        ],
        statBaseline: {
          sampleSize: 1,
          minimumSample: 3,
          scope: 'sport',
          averages: {},
          previousStatline: null,
          matchesNeeded: 2,
        },
      }),
      language: 'th',
    })

    expect(sections.find((section) => section.id === 'compare')?.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'head_to_head_needs_history',
          title: 'เจอคนนี้',
          resultTitle: 'ข้อมูล H2H ยังไม่พอ',
        }),
      ]),
    )
  })

  it('dedupes verified effort when an effort comparison already explains the same watch signal', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [
          {
            id: 'effort_sensor',
            type: 'effort',
            title: 'Effort vs usual',
            body: '82.4% effort.',
            severity: 'neutral',
            locked: false,
            source: 'sensor',
            metrics: { intensity_score: 82.4 },
            score: {
              status: 'steady',
              delta: 0,
              current: 82.4,
              baseline: 82.4,
              unit: '%',
              scope: 'sensor',
            },
          },
          {
            id: 'verified_effort_sensor',
            type: 'effort',
            title: 'Verified effort',
            body: 'Watch data attached.',
            severity: 'positive',
            locked: false,
            source: 'sensor',
          },
        ],
        sensorState: { status: 'available' },
      }),
      'th',
    )

    const finalStage = stages.find((stage) => stage.kind === 'final')
    const optionalIds = finalStage?.optionalSections.flatMap((section) =>
      section.groups.flatMap((group) => group.items.map((item) => item.id)),
    ) ?? []

    const topicIds = stages.filter((stage) => stage.kind === 'topic').map((stage) => stage.id)
    expect(topicIds).not.toContain('effort_sensor')
    expect(topicIds).not.toContain('verified_effort_sensor')
    expect(optionalIds).toContain('effort_sensor')
    expect(optionalIds).not.toContain('verified_effort_sensor')
  })

  it('puts the sensor coach read first after the summary when device data is available', () => {
    const stages = buildCoachReportStages(
      insights({
        cards: [
          {
            id: 'form_last5',
            type: 'form',
            title: 'Recent basketball form',
            body: 'Last five matches improved.',
            severity: 'positive',
            locked: false,
            source: 'history',
          },
          {
            id: 'sensor_coach_read',
            type: 'training_cue',
            title: 'Sensor coach read',
            body: 'Handler: Intensity 88 with 960 steps and 3 assists.',
            severity: 'warning',
            locked: false,
            source: 'sensor',
            metrics: {
              intensity_score: 88,
              steps: 960,
              heart_rate_coverage_seconds: 420,
              cadence_high_seconds: 240,
              role: 'handler',
            },
          },
          {
            id: 'cue_handler_playmaking_balance',
            type: 'training_cue',
            title: 'Playmaking balance',
            body: 'Needs AST context.',
            severity: 'warning',
            locked: false,
            source: 'context',
          },
        ],
        sensorState: { status: 'available' },
        currentContext: {
          role: 'handler',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, assists: 1, blocks: 1 },
        },
      }),
      'en',
    )

    expect(stages.map((stage) => stage.id).slice(0, 3)).toEqual([
      'summary',
      'sensor_coach_read',
      'cue_handler_playmaking_balance',
    ])
    const finalStage = stages.find((stage) => stage.kind === 'final')
    const optionalIds = finalStage?.optionalSections.flatMap((section) =>
      section.groups.flatMap((group) => group.items.map((item) => item.id)),
    ) ?? []
    expect(optionalIds).not.toContain('sensor_coach_read')
  })
})

describe('buildBasketballFinalDataDesign', () => {
  it('builds an eight-axis basketball stat board without inventing missing stats', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 8, threePointersMade: 2, assists: 1 },
        },
      }),
      ownTeamScore: 12,
      language: 'th',
    })

    expect(board.axes.map((axis) => axis.label)).toEqual(['PTS', '2PT', '3PM', 'AST', 'REB', 'STL', 'BLK', 'FT'])
    expect(board.axes).toHaveLength(8)
    expect(board.axes.find((axis) => axis.key === 'freeThrowsMade')).toEqual(
      expect.objectContaining({
        state: 'missing',
        value: null,
        valueLabel: '—',
      }),
    )
  })

  it('does not show a separate 3PM axis for 3x3 because outside-arc makes are the 2PT stat', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, twoPointersMade: 2, rebounds: 2 },
        },
      }),
      benchmarkFormat: '3x3',
    })

    expect(board.axes.map((axis) => axis.label)).toEqual(['PTS', '2PT', 'AST', 'REB', 'STL', 'BLK', 'FT'])
    expect(board.axes.map((axis) => axis.key)).not.toContain('threePointersMade')
  })

  it('uses an eight-axis denominator for complete 5v5 benchmark comparisons', () => {
    const completeStats = {
      points: 8,
      twoPointersMade: 3,
      threePointersMade: 2,
      assists: 4,
      rebounds: 5,
      steals: 1,
      blocks: 1,
      freeThrowsMade: 2,
    }
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: completeStats,
        },
        statBaseline: {
          sampleSize: 4,
          minimumSample: 3,
          scope: 'sport',
          averages: {},
          previousStatline: null,
          matchesNeeded: 0,
          benchmarkBaselines: roleBenchmarkRows({
            level: 'web_general',
            role: 'shooter',
            benchmarkFormat: '5v5',
            values: completeStats,
          }),
        },
      }),
      benchmarkFormat: '5v5',
      language: 'en',
    })

    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')).toEqual(
      expect.objectContaining({
        metricLabel: '8/8',
        valueLabel: '8/8 stats compared',
        status: 'ready',
      }),
    )
  })

  it('puts shooter scoring share and logged shooting stats first in the final graph', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 8, threePointersMade: 2, assists: 1 },
        },
      }),
      ownTeamScore: 12,
      language: 'th',
    })

    expect(board.impactBars.slice(0, 3)).toEqual([
      expect.objectContaining({ id: 'scoring_share', label: 'PTS share', valueLabel: '67%' }),
      expect.objectContaining({ id: 'points', label: 'PTS', valueLabel: '8' }),
      expect.objectContaining({ id: 'threePointersMade', label: '3PM', valueLabel: '2' }),
    ])
  })

  it('uses pro-scale web benchmark labels when personal history is still sparse', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            {
              id: 'nba_points',
              sport: 'basketball',
              level: 'web_nba',
              role: 'shooter',
              benchmarkFormat: '5v5',
              sourceTier: 'external_pro',
              metric: 'points',
              value: 23.1,
              unit: 'PTS',
              label: 'NBA team-slot PTS',
              sourceName: 'NBA.com team traditional stats',
              sourceUrl: 'https://www.nba.com/stats/teams/traditional?PerMode=PerGame&Season=2025-26',
              season: '2025-26',
              fetchedAt: '2026-05-21',
              normalization: 'nba_team_slot',
              sampleSize: null,
            },
          ],
        },
      }),
      ownTeamScore: null,
      language: 'th',
    })

    expect(board.axes.find((axis) => axis.key === 'points')).toEqual(
      expect.objectContaining({
        referenceLabel: 'Pro Shooter 23.1',
      }),
    )
  })

  it('uses same-role benchmark labels before all-role benchmarks on stat axes', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, rebounds: 4 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            {
              id: 'nba_all_points',
              sport: 'basketball',
              level: 'web_nba',
              role: 'all',
              benchmarkFormat: '5v5',
              sourceTier: 'external_pro',
              metric: 'points',
              value: 23.1,
              unit: 'PTS',
              label: 'NBA team-slot PTS',
              sourceName: 'NBA.com team traditional stats',
              sourceUrl: 'https://www.nba.com/stats/teams/traditional?PerMode=PerGame&Season=2025-26',
              season: '2025-26',
              fetchedAt: '2026-05-21',
              normalization: 'nba_team_slot',
              sampleSize: 30,
            },
            {
              id: 'nba_shooter_points',
              sport: 'basketball',
              level: 'web_nba',
              role: 'shooter',
              benchmarkFormat: '5v5',
              sourceTier: 'external_pro',
              metric: 'points',
              value: 14.1,
              unit: 'PTS',
              label: 'Pro Shooter scoring scale',
              sourceName: 'NBA.com player traditional stats',
              sourceUrl: 'https://www.nba.com/stats/players/traditional?PerMode=PerGame',
              season: '2025-26',
              fetchedAt: '2026-05-22',
              normalization: 'nba_role_archetype',
              sampleSize: 90,
            },
          ],
        },
      }),
      ownTeamScore: null,
      language: 'th',
    })

    expect(board.axes.find((axis) => axis.key === 'points')).toEqual(
      expect.objectContaining({
        referenceLabel: 'Pro Shooter 14.1',
      }),
    )
  })

  it('prefers Rally population same-role references before pro role scale on stat axes', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            {
              id: 'nba_shooter_points',
              sport: 'basketball',
              level: 'web_nba',
              role: 'shooter',
              benchmarkFormat: '5v5',
              sourceTier: 'external_pro',
              metric: 'points',
              value: 14.1,
              unit: 'PTS',
              label: 'Pro Shooter scoring scale',
              sourceName: 'NBA.com player traditional stats',
              sourceUrl: 'https://www.nba.com/stats/players/traditional?PerMode=PerGame',
              season: '2025-26',
              fetchedAt: '2026-05-22',
              normalization: 'nba_role_archetype',
              sampleSize: 90,
            },
            {
              id: 'rally_shooter_points',
              sport: 'basketball',
              level: 'rally_population',
              role: 'shooter',
              benchmarkFormat: 'rally_pickup',
              sourceTier: 'rally_population',
              metric: 'points',
              value: 8.4,
              unit: 'PTS',
              label: 'Rally Shooter points',
              sourceName: 'Rally population role aggregate',
              sourceUrl: 'rally://coach/benchmarks/population',
              season: '2025-26',
              fetchedAt: '2026-05-22',
              normalization: 'rally_population',
              sampleSize: 84,
            },
          ],
        },
      }),
      ownTeamScore: null,
      language: 'th',
    })

    expect(board.axes.find((axis) => axis.key === 'points')).toEqual(
      expect.objectContaining({
        referenceLabel: 'Rally Shooter 8.4',
      }),
    )
  })

  it('compares the current role against general, Rally, and pro references across every stat axis', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'handler',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: {
            points: 6,
            twoPointersMade: 1,
            threePointersMade: 1,
            assists: 5,
            rebounds: 3,
            steals: 1,
            blocks: 0,
            freeThrowsMade: 2,
          },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            ...roleBenchmarkRows({
              level: 'web_general',
              role: 'handler',
              values: {
                points: 5,
                twoPointersMade: 1.4,
                threePointersMade: 0.8,
                assists: 3.2,
                rebounds: 2.5,
                steals: 1,
                blocks: 0.3,
                freeThrowsMade: 1,
              },
            }),
            ...roleBenchmarkRows({
              level: 'rally_population',
              role: 'handler',
              values: {
                points: 5.6,
                twoPointersMade: 1.3,
                threePointersMade: 1,
                assists: 3.8,
                rebounds: 2.9,
                steals: 1.1,
                blocks: 0.4,
                freeThrowsMade: 1.2,
              },
            }),
            ...roleBenchmarkRows({
              level: 'web_nba',
              role: 'handler',
              values: {
                points: 18,
                twoPointersMade: 4.0,
                threePointersMade: 2.2,
                assists: 7.4,
                rebounds: 4,
                steals: 1.3,
                blocks: 0.4,
                freeThrowsMade: 3.6,
              },
            }),
          ],
        },
      }),
      ownTeamScore: null,
      language: 'th',
    })

    expect(board.benchmarkComparisons.map((item) => item.level)).toEqual([
      'web_general',
      'rally_population',
      'web_nba',
    ])
    for (const comparison of board.benchmarkComparisons) {
      expect(comparison.title).toContain('Handler')
      expect(comparison.statRows?.map((row) => row.key)).toEqual(fullStatKeys)
      expect(comparison.statRows).toHaveLength(8)
    }
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')?.statRows?.find((row) => row.key === 'twoPointersMade')).toEqual(
      expect.objectContaining({
        label: '2PT',
        currentLabel: '1',
        referenceLabel: 'ทั่วไป 1.4',
        deltaLabel: '-0.4',
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')?.statRows?.find((row) => row.key === 'assists')).toEqual(
      expect.objectContaining({
        label: 'AST',
        currentLabel: '5',
        referenceLabel: 'ทั่วไป 3.2',
        deltaLabel: '+1.8',
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_nba')?.statRows?.find((row) => row.key === 'blocks')).toEqual(
      expect.objectContaining({
        label: 'BLK',
        referenceLabel: 'โปร 0.4',
      }),
    )
  })

  it('uses the selected role and format instead of all-role or other-format benchmark rows', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'handler',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { assists: 5, points: 6 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [
            {
              id: 'legacy_all_assists',
              sport: 'basketball',
              level: 'web_general',
              role: 'all',
              benchmarkFormat: '5v5',
              sourceTier: 'external_general',
              metric: 'assists',
              value: 9,
              unit: 'AST',
              label: 'Legacy all-role assists',
              sourceName: 'Legacy',
              sourceUrl: 'rally://legacy',
              season: '2026-general-v1',
              fetchedAt: '2026-05-22',
              normalization: 'raw_match',
              sampleSize: null,
            },
            ...roleBenchmarkRows({
              level: 'web_general',
              role: 'handler',
              benchmarkFormat: 'rally_pickup',
              values: {
                points: 5,
                twoPointersMade: 1.2,
                threePointersMade: 0.8,
                assists: 3.5,
                rebounds: 3,
                steals: 1,
                blocks: 0.3,
                freeThrowsMade: 1,
              },
            }),
            ...roleBenchmarkRows({
              level: 'web_general',
              role: 'handler',
              benchmarkFormat: '3x3',
              values: {
                points: 5.8,
                twoPointersMade: 99,
                threePointersMade: 0.7,
                assists: 2.4,
                rebounds: 2.6,
                steals: 0.9,
                blocks: 0.2,
                freeThrowsMade: 0.8,
              },
            }),
          ],
        },
      }),
      benchmarkFormat: '3x3',
      language: 'th',
    })

    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')).toEqual(
      expect.objectContaining({
        title: 'คนทั่วไป Creator 3x3',
        referenceLabel: 'ค่าตั้งต้นคนทั่วไป Creator 3x3',
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')?.statRows?.find((row) => row.key === 'twoPointersMade')).toEqual(
      expect.objectContaining({
        label: '2PT',
        currentLabel: '—',
        referenceLabel: 'ทั่วไป 0.7',
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')?.statRows?.find((row) => row.key === 'assists')).toEqual(
      expect.objectContaining({
        referenceLabel: 'ทั่วไป 2.4',
        deltaLabel: '+2.6',
      }),
    )
  })

  it('shows role-wide stat comparisons and keeps Rally cohort absent until enough sample exists', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        cards: [],
        previewCards: [],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6, threePointersMade: 2 },
        },
        statBaseline: {
          sampleSize: 0,
          minimumSample: 3,
          scope: 'none',
          averages: {},
          previousStatline: null,
          matchesNeeded: 3,
          benchmarkBaselines: [],
        },
      }),
      ownTeamScore: 8,
      language: 'th',
    })

    expect(board.impactBars[0]).toEqual(
      expect.objectContaining({ id: 'scoring_share', valueLabel: '75%' }),
    )
    expect(board.benchmarkComparisons.map((item) => item.level)).toEqual([
      'web_general',
      'rally_population',
      'web_nba',
    ])
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')).toEqual(
      expect.objectContaining({
        id: 'web_general_shooter_all_stats',
        title: 'คนทั่วไป Shooter pickup',
        valueLabel: '2/8 สถิติเทียบแล้ว',
        status: 'ready',
        statRows: expect.arrayContaining([
          expect.objectContaining({ key: 'points', referenceLabel: 'ทั่วไป 7' }),
          expect.objectContaining({ key: 'freeThrowsMade', status: 'missing_current' }),
        ]),
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'rally_population')).toEqual(
      expect.objectContaining({
        id: 'rally_population_role_stats_missing',
        title: 'Rally Shooter pickup',
        valueLabel: 'ยังไม่เปิดค่าเฉลี่ย',
        referenceLabel: 'ต้องมี 30 เกม / 10 คน',
        status: 'missing',
      }),
    )
    expect(board.benchmarkComparisons.find((item) => item.level === 'web_nba')).toEqual(
      expect.objectContaining({
        id: 'web_nba_shooter_all_stats',
        title: 'โปร Shooter',
        valueLabel: '0/8 สถิติเทียบแล้ว',
        status: 'missing',
      }),
    )
  })

  it('keeps the general-player final comparison stat-based even when RPE is available', () => {
    const board = buildBasketballFinalDataDesign({
      data: insights({
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: 9,
          basketballStats: { points: 6 },
        },
      }),
      ownTeamScore: null,
      language: 'th',
    })

    expect(board.benchmarkComparisons.find((item) => item.level === 'web_general')).toEqual(
      expect.objectContaining({
        id: 'web_general_shooter_all_stats',
        title: 'คนทั่วไป Shooter pickup',
        valueLabel: '1/8 สถิติเทียบแล้ว',
        referenceLabel: 'ค่าตั้งต้นคนทั่วไป Shooter pickup',
        status: 'ready',
      }),
    )
  })
})

describe('getCoachReportSetupPrompt', () => {
  it('requires the first popup when role or statline is missing', () => {
    expect(
      getCoachReportSetupPrompt(
        insights({
          currentContext: {
            role: null,
            resultTags: [],
            detailTags: [],
            focusTag: null,
            rpe: null,
            basketballStats: {},
          },
        }),
        'th',
      ),
    ).toMatchObject({
      required: true,
      needsRole: true,
      needsStats: true,
      needsSensorSync: true,
    })
  })

  it('does not block the report when role and at least one stat are already saved', () => {
    expect(
      getCoachReportSetupPrompt(
        insights({
          currentContext: {
            role: 'shooter',
            resultTags: [],
            detailTags: [],
            focusTag: null,
            rpe: null,
            basketballStats: { points: 8 },
          },
          sensorState: { status: 'available' },
        }),
        'en',
      ),
    ).toMatchObject({
      required: false,
      needsRole: false,
      needsStats: false,
      needsSensorSync: false,
    })
  })
})

describe('getCoachReportSections', () => {
  it('keeps the report section order stable and puts role reads behind the summary', () => {
    const sections = getCoachReportSections({
      data: insights(),
      language: 'en',
    })

    expect(sections.map((section) => section.id)).toEqual([
      'summary',
      'compare',
      'role_reads',
      'more_reads',
      'pro_depth',
    ])
    expect(sections[0].cards.map((topic) => topic.id)).toContain('form_last5')
    expect(sections[2].cards.map((topic) => topic.id)).toContain('cue_handler_playmaking_balance')
  })

  it('shows role cards even when required stats are missing and gates them inside the topic', () => {
    const roleReads = getCoachReportSections({
      data: insights(),
      language: 'en',
    }).find((section) => section.id === 'role_reads')

    const playmaking = roleReads?.cards.find((topic) => topic.id === 'cue_handler_playmaking_balance')
    expect(playmaking).toMatchObject({
      title: 'Playmaking',
      gate: 'needs_stats',
      gateLabel: 'Add AST to read',
    })
  })

  it('does not hide sensor-dependent value when data is missing; it shows a needs-sync topic', () => {
    const proDepth = getCoachReportSections({
      data: insights(),
      language: 'en',
    }).find((section) => section.id === 'pro_depth')

    expect(proDepth?.cards).toEqual([
      expect.objectContaining({
        id: 'sensor_effort_needs_sync',
        title: 'Watch effort data',
        gate: 'needs_sensor_sync',
        gateLabel: 'Sync watch data',
      }),
    ])
  })

  it('places benchmark reads in compare instead of burying them in more reads', () => {
    const sections = getCoachReportSections({
      data: insights({
        cards: [
          {
            id: 'web_benchmark_nba_points',
            type: 'training_cue',
            title: 'NBA scoring scale',
            body: 'PTS 6: compared with an NBA team-slot benchmark.',
            severity: 'neutral',
            locked: false,
            source: 'benchmark',
            score: {
              status: 'down',
              delta: -17.1,
              current: 6,
              baseline: 23.1,
              unit: 'PTS',
              scope: 'web_nba',
            },
          },
          {
            id: 'cue_shooter_scoring_profile',
            type: 'training_cue',
            title: 'Scoring profile',
            body: 'PTS 6: scoring cue.',
            severity: 'neutral',
            locked: false,
            source: 'context',
          },
        ],
        currentContext: {
          role: 'shooter',
          resultTags: [],
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { points: 6 },
        },
      }),
      language: 'th',
    })

    expect(sections.find((section) => section.id === 'compare')?.cards.map((topic) => topic.id)).toContain(
      'web_benchmark_nba_points',
    )
    expect(sections.find((section) => section.id === 'more_reads')?.cards.map((topic) => topic.id)).not.toContain(
      'web_benchmark_nba_points',
    )
  })
})

describe('formatCoachTopicScore', () => {
  it('formats topic scores as label plus delta instead of a 0-100 grade', () => {
    expect(
      formatCoachTopicScore({
        status: 'up',
        delta: 2,
        current: 4,
        baseline: 2,
        unit: 'AST',
        scope: 'sport',
      }, 'th'),
    ).toBe('ดีขึ้น +2 AST')

    expect(
      formatCoachTopicScore({
        status: 'needs_history',
        delta: null,
        current: null,
        baseline: null,
        unit: null,
        scope: 'sport',
      }, 'en'),
    ).toBe('Needs more history')
  })

  it('labels web benchmark comparisons separately from personal history', () => {
    expect(
      formatCoachTopicScore({
        status: 'down',
        delta: -16.8,
        current: 6,
        baseline: 22.8,
        unit: 'PTS',
        scope: 'web_nba',
      }, 'th'),
    ).toBe('ต่ำกว่าสเกลบาสอาชีพ 16.8 PTS')
  })
})

describe('getCoachReportDetailBlocks', () => {
  it('opens each topic with only the stat evidence that affected the read', () => {
    const topic = getCoachReportSections({
      data: insights(),
      language: 'en',
    })[2].cards[0]

    expect(getCoachReportDetailBlocks(topic, 'en').map((block) => block.label)).toEqual(['Evidence'])
  })
})
