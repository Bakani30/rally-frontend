import { describe, expect, it } from 'vitest'
import {
  canSaveBaselineCoachContext,
  getCoachCardFollowUpPrompt,
  getCoachContextInitial,
  getCoachContextToggleCopy,
  getBasketballRoleLabel,
  getBasketballRoleHelp,
  getBasketballStatInputKeys,
  getBasketballStatInputPlaceholder,
  getBasketballStatInputValue,
  getBasketballStatlineHelpText,
  getBasketballStatLineValidation,
  getCoachInsightDisclosureState,
  getCoachInsightHeaderTitle,
  getCoachCardsSectionLabel,
  getCoachDisplayCards,
  getCoachDisplayDeck,
  getCoachReadStage,
  hasCoachInputSignal,
  localizeCoachInsightCard,
  mergeCoachContextPatch,
  shouldShowCoachSensorSyncInCard,
  summarizeCoachInputSignalsCompact,
  summarizeCoachInputSignals,
} from './coachInputPresentation'
import type { CoachInsightCard } from './coachTypes'

describe('getBasketballRoleHelp', () => {
  it('keeps default basketball role labels for full-court reads', () => {
    expect(getBasketballRoleLabel('handler')).toBe('Handler')
    expect(getBasketballRoleLabel('shooter', 'th')).toBe('Shooter')
    expect(getBasketballRoleLabel('big')).toBe('Big')
  })

  it('uses half-court 3x3 role labels when the benchmark format is 3x3', () => {
    expect(getBasketballRoleLabel('handler', 'en', '3x3')).toBe('Creator')
    expect(getBasketballRoleLabel('shooter', 'en', '3x3')).toBe('Shooter')
    expect(getBasketballRoleLabel('defender', 'en', '3x3')).toBe('Stopper')
    expect(getBasketballRoleLabel('big', 'en', '3x3')).toBe('Screener')
    expect(getBasketballRoleLabel('all_around', 'en', '3x3')).toBe('Two-way')
    expect(getBasketballRoleLabel('handler', 'th', '3x3')).toBe('Creator')
  })

  it('explains each basketball role in short post-match language', () => {
    expect(getBasketballRoleHelp('handler')).toEqual({
      title: 'Handler',
      body: 'You mostly brought the ball up, initiated plays, or handled pressure.',
    })
    expect(getBasketballRoleHelp('shooter').body).toContain('spacing')
    expect(getBasketballRoleHelp('all_around').title).toBe('All-around')
  })

  it('explains basketball roles in Thai when requested', () => {
    expect(getBasketballRoleHelp('handler', 'th')).toEqual({
      title: 'Handler',
      body: 'คนถือบอล / ตัวทำเกม: วันนี้คุณพาบอลขึ้น เปิดเพลย์ หรือรับแรงกดดันจากตัวประกบเป็นหลัก',
    })
  })

  it('explains 3x3 roles around half-court jobs instead of 5v5 positions', () => {
    expect(getBasketballRoleHelp('handler', 'th', '3x3')).toEqual({
      title: 'Creator',
      body: 'ตัวสร้างจังหวะ 3v3: คุมบอลเร็ว เจาะเข้าไปบังคับ help แล้ว kick-out ให้เพื่อน หรือจบเองเมื่อทางเปิด',
    })
    expect(getBasketballRoleHelp('shooter', 'en', '3x3')).toEqual({
      title: 'Shooter',
      body: '3x3 spacing role: hold the corner or wing, relocate after a drive, and stay ready for clean catch-and-shoot looks.',
    })
    expect(getBasketballRoleHelp('big', 'th', '3x3').body).toContain('screen')
    expect(getBasketballRoleHelp('big', 'th', '3x3').body).toContain('รีบาวด์')
  })
})

describe('getBasketballStatlineHelpText', () => {
  it('explains every stat abbreviation in a compact legend', () => {
    expect(getBasketballStatlineHelpText()).toBe(
      'PTS total points\n2PT made twos\n3PM made threes\nREB rebounds\nAST assists\nBLK blocks\nSTL steals\nFT made free throws',
    )
  })

  it('explains 3x3 2PT as the outside-arc shot and does not show a separate 3PT line', () => {
    expect(getBasketballStatlineHelpText('en', '3x3')).toBe(
      'PTS total points\n2PT made outside-arc shots\nREB rebounds\nAST assists\nBLK blocks\nSTL steals\nFT made free throws',
    )
  })

  it('explains stat abbreviations in Thai when requested', () => {
    expect(getBasketballStatlineHelpText('th')).toBe(
      'PTS แต้มรวม\n2PT ลูกสองแต้มลง\n3PM ลูกสามแต้มลง\nREB รีบาวด์\nAST แอสซิสต์\nBLK บล็อก\nSTL สตีล\nFT ลูกโทษลง',
    )
  })

  it('explains 3x3 2PT in Thai as the outside-arc make', () => {
    expect(getBasketballStatlineHelpText('th', '3x3')).toBe(
      'PTS แต้มรวม\n2PT ลูกนอกเส้นลง นับ 2 แต้ม\nREB รีบาวด์\nAST แอสซิสต์\nBLK บล็อก\nSTL สตีล\nFT ลูกโทษลง',
    )
  })
})

describe('getBasketballStatLineValidation', () => {
  it('rejects points that exceed the recorded score for the player side', () => {
    expect(
      getBasketballStatLineValidation({ points: 9 }, { ownTeamScore: 8 }),
    ).toEqual({
      valid: false,
      message: 'PTS cannot exceed your side score (8).',
    })
  })

  it('rejects scoring details that already exceed player points', () => {
    expect(
      getBasketballStatLineValidation({ points: 7, threePointersMade: 2, freeThrowsMade: 2 }, { ownTeamScore: 8 }),
    ).toEqual({
      valid: false,
      message: '2PT, 3PM, and FT already add up to more than PTS.',
    })
  })

  it('uses 3x3 scoring language where 2PT is the outside-arc shot and there is no separate 3PT', () => {
    expect(
      getBasketballStatLineValidation(
        { points: 3, twoPointersMade: 2 },
        { ownTeamScore: 8, benchmarkFormat: '3x3' },
      ),
    ).toEqual({
      valid: false,
      message: '2PT and FT already add up to more than PTS.',
    })
  })

  it('allows non-scoring statline without PTS', () => {
    expect(
      getBasketballStatLineValidation({ rebounds: 4, assists: 2 }, { ownTeamScore: 8 }),
    ).toEqual({ valid: true, message: null })
  })

  it('rejects assists that cannot fit with own points inside team score', () => {
    expect(
      getBasketballStatLineValidation({ points: 6, assists: 3 }, { ownTeamScore: 8 }),
    ).toEqual({
      valid: false,
      message: 'PTS + AST cannot exceed your side score (8).',
    })
  })

  it('rejects assists alone when they exceed team score', () => {
    expect(
      getBasketballStatLineValidation({ assists: 9 }, { ownTeamScore: 8 }),
    ).toEqual({
      valid: false,
      message: 'AST cannot exceed your side score (8).',
    })
  })
})

describe('basketball stat input display', () => {
  it('keeps empty stat fields visually separate from a real zero', () => {
    expect(getBasketballStatInputValue({}, 'points')).toBe('')
    expect(getBasketballStatInputPlaceholder()).toBe('—')
    expect(getBasketballStatInputValue({ points: 0 }, 'points')).toBe('0')
  })

  it('keeps full stat entry available for non-3x3 formats without TO', () => {
    expect(getBasketballStatInputKeys({ benchmarkFormat: '5v5', role: 'shooter' })).toEqual([
      'points',
      'twoPointersMade',
      'threePointersMade',
      'rebounds',
      'assists',
      'blocks',
      'steals',
      'freeThrowsMade',
    ])
  })

  it('shortlists only the easiest key stats for 3x3 before a role is chosen', () => {
    expect(getBasketballStatInputKeys({ benchmarkFormat: '3x3', role: null })).toEqual([
      'points',
      'twoPointersMade',
      'rebounds',
      'assists',
    ])
  })

  it('uses role-specific 3x3 stat shortlists and treats 2PT as the outside-arc scoring stat', () => {
    expect(getBasketballStatInputKeys({ benchmarkFormat: '3x3', role: 'shooter' })).toEqual([
      'points',
      'twoPointersMade',
      'rebounds',
    ])
    expect(getBasketballStatInputKeys({ benchmarkFormat: '3x3', role: 'defender' })).toEqual([
      'points',
      'twoPointersMade',
      'rebounds',
      'blocks',
      'steals',
    ])
  })

  it('strips legacy TO even when a gated topic explicitly asks for it', () => {
    expect(
      getBasketballStatInputKeys({
        benchmarkFormat: '3x3',
        role: 'handler',
        statKeys: ['turnovers'],
      }),
    ).toEqual([])
  })

  it('keeps gated topic stat requirements explicit even in 3x3', () => {
    expect(
      getBasketballStatInputKeys({
        benchmarkFormat: '3x3',
        role: 'shooter',
        statKeys: ['freeThrowsMade'],
      }),
    ).toEqual(['freeThrowsMade'])
  })
})

describe('hasCoachInputSignal', () => {
  it('ignores legacy tag and focus fields as coach evidence', () => {
    expect(
      hasCoachInputSignal({
        role: null,
        resultTags: ['turnovers'] as never,
        detailTags: ['screen'],
        focusTag: 'ball_handling',
        rpe: null,
        basketballStats: {},
      }),
    ).toBe(false)
  })

  it('returns true when any optional precision stat is present', () => {
    expect(
      hasCoachInputSignal({
        role: null,
        resultTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: { assists: 4 },
      }),
    ).toBe(true)
  })
})

describe('canSaveBaselineCoachContext', () => {
  it('requires role before the baseline coach context can be saved', () => {
    expect(
      canSaveBaselineCoachContext({
        role: null,
        resultTags: ['turnovers'] as never,
        focusTag: 'ball_handling',
        rpe: 8,
        basketballStats: { points: 7 },
      }),
    ).toBe(false)

    expect(
      canSaveBaselineCoachContext({
        role: 'handler',
        resultTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: {},
      }),
    ).toBe(true)
  })

  it('keeps statline optional after role is selected', () => {
    expect(
      canSaveBaselineCoachContext({
        role: 'shooter',
        resultTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: { points: 8 },
      }),
    ).toBe(true)
  })
})

describe('mergeCoachContextPatch', () => {
  it('clears unsupported tag and focus fields when context is merged for saving', () => {
    expect(
      mergeCoachContextPatch(
        {
          role: 'handler',
          resultTags: ['turnovers'] as never,
          detailTags: ['screen'],
          focusTag: 'ball_handling',
          rpe: 9,
          basketballStats: { assists: 4, turnovers: 3 },
        },
        {
          role: 'shooter',
          basketballStats: { points: 11 },
        },
      ),
    ).toEqual({
      role: 'shooter',
      resultTags: [],
      detailTags: [],
      focusTag: null,
      rpe: 9,
      basketballStats: { assists: 4, points: 11 },
    })
  })
})

describe('summarizeCoachInputSignals', () => {
  it('summarizes only grounded coach signals for saved feedback', () => {
    expect(
      summarizeCoachInputSignals({
        role: 'handler',
        resultTags: ['turnovers'] as never,
        detailTags: ['screen'],
        focusTag: null,
        rpe: 8,
        basketballStats: { assists: 4 },
      }),
    ).toBe('Role + effort + statline added')
  })
})

describe('summarizeCoachInputSignalsCompact', () => {
  it('summarizes saved coach inputs without creating a long status card line', () => {
    expect(
      summarizeCoachInputSignalsCompact({
        role: 'handler',
        resultTags: ['turnovers'] as never,
        detailTags: [],
        focusTag: 'ball_handling',
        rpe: 8,
        basketballStats: { assists: 4 },
      }),
    ).toBe('3 signals saved')
  })

  it('keeps the role-only baseline compact and clear', () => {
    expect(
      summarizeCoachInputSignalsCompact({
        role: 'handler',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: { points: 7 },
      }),
    ).toBe('2 signals saved')
  })

  it('summarizes saved coach inputs in Thai', () => {
    expect(
      summarizeCoachInputSignalsCompact(
        {
          role: 'handler',
          resultTags: ['turnovers'] as never,
          detailTags: [],
          focusTag: 'ball_handling',
          rpe: 8,
          basketballStats: { assists: 4 },
        },
        'th',
      ),
    ).toBe('บันทึกข้อมูลแล้ว 3 รายการ')
  })
})

describe('getCoachReadStage', () => {
  it('explains why quick context is needed before the user saves', () => {
    const stage = getCoachReadStage({
      missingInputs: ['context', 'sensor', 'history'],
      savedSummary: null,
    })

    expect(stage.kind).toBe('needs_context')
    expect(stage.title).toBe('Add quick context')
    expect(stage.body).toBe('Role + tracked stats update recap.')
    expect(stage.primaryActionLabel).toBe('Save context')
  })

  it('switches to an updated state after context exists', () => {
    const stage = getCoachReadStage({
      missingInputs: ['sensor', 'history'],
      savedSummary: '3 signals saved',
    })

    expect(stage.kind).toBe('updated')
    expect(stage.eyebrow).toBe('SAVED')
    expect(stage.title).toBe('Recap updated')
    expect(stage.body).toBe('')
    expect(stage.primaryActionLabel).toBe('Update context')
    expect(stage.savedSummary).toBe('3 signals saved')
  })

  it('uses Thai copy for coach read status', () => {
    const stage = getCoachReadStage({
      missingInputs: ['context', 'sensor', 'history'],
      savedSummary: null,
      language: 'th',
    })

    expect(stage.eyebrow).toBe('COACH READ')
    expect(stage.title).toBe('เพิ่มข้อมูลสั้น ๆ')
    expect(stage.body).toBe('Role + สถิติที่จดไว้ ช่วยให้ Recap อ่านเกมตรงขึ้น')
    expect(stage.primaryActionLabel).toBe('บันทึกข้อมูล')
  })
})

const effortCard: CoachInsightCard = {
  id: 'coach_prompt_effort',
  type: 'effort',
  title: 'Add effort read',
  body: 'Add effort if you want Rally to compare how hard this match felt.',
  severity: 'neutral',
  locked: false,
  source: 'context',
}

const contextHintCard: CoachInsightCard = {
  id: 'context_hint',
  type: 'training_cue',
  title: 'Add inputs for richer cards',
  body: 'Missing post-match chips.',
  severity: 'neutral',
  locked: false,
  source: 'context',
}

const ladderCard: CoachInsightCard = {
  id: 'insight_ladder',
  type: 'training_cue',
  title: 'Next sharper read',
  body: 'Optional inputs sharpen future reads.',
  severity: 'neutral',
  locked: false,
  source: 'mixed',
}

const lowDataCard: CoachInsightCard = {
  id: 'low_data',
  type: 'form',
  title: 'Need more matches',
  body: 'Add more basketball matches for stronger trends.',
  severity: 'neutral',
  locked: false,
  source: 'history',
}

const roleCueCard: CoachInsightCard = {
  id: 'cue_handler_playmaking_balance',
  type: 'training_cue',
  title: 'Create for teammates',
  body: 'Handler game with assists logged.',
  severity: 'warning',
  locked: false,
  source: 'context',
}

const genericTurnoverCueCard: CoachInsightCard = {
  id: 'cue_turnovers',
  type: 'training_cue',
  title: 'Review turnovers under pressure',
  body: 'Close loss with turnovers tagged.',
  severity: 'warning',
  locked: false,
  source: 'mixed',
}

const shooterCueCard: CoachInsightCard = {
  id: 'cue_shooter_shot_quality',
  type: 'training_cue',
  title: 'Sharpen shot quality',
  body: 'Shooter game with shot selection tagged.',
  severity: 'neutral',
  locked: false,
  source: 'context',
}

const screenCueCard: CoachInsightCard = {
  id: 'cue_screen_impact',
  type: 'training_cue',
  title: 'Use screens better',
  body: 'Screens were tagged for this match.',
  severity: 'neutral',
  locked: false,
  source: 'context',
}

const relicCard: CoachInsightCard = {
  id: 'relic_verified_effort',
  type: 'relic',
  title: 'Verified Effort',
  body: 'Synced watch or phone data for this match.',
  severity: 'positive',
  locked: false,
  source: 'sensor',
}

describe('getCoachCardFollowUpPrompt', () => {
  it('asks for RPE only on an effort prompt when no sensor or effort exists', () => {
    expect(
      getCoachCardFollowUpPrompt({
        card: effortCard,
        context: { role: 'handler', resultTags: [], focusTag: null, rpe: null, basketballStats: {} },
        missingInputs: ['sensor'],
      }),
    ).toMatchObject({ kind: 'rpe', initialRpe: null })
  })

  it('does not ask for legacy factor, detail, or focus inputs', () => {
    expect(
      getCoachCardFollowUpPrompt({
        card: contextHintCard,
        context: {
          role: 'handler',
          resultTags: ['turnovers'] as never,
          detailTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: {},
        },
        missingInputs: [],
      }),
    ).toBeNull()
    expect(
      getCoachCardFollowUpPrompt({
        card: screenCueCard,
        context: {
          role: 'big',
          resultTags: [],
          detailTags: ['box_out'],
          focusTag: null,
          rpe: null,
          basketballStats: {},
        },
        missingInputs: [],
      }),
    ).toBeNull()
    expect(
      getCoachCardFollowUpPrompt({
        card: ladderCard,
        context: {
          role: 'handler',
          resultTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: {},
        },
        missingInputs: [],
      }),
    ).toBeNull()
  })

  it('requires only the stat fields needed by the opened topic card', () => {
    expect(
      getCoachCardFollowUpPrompt({
        card: { ...roleCueCard, id: 'cue_handler_playmaking_balance' },
        context: {
          role: 'handler',
          resultTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: {},
        },
        missingInputs: [],
      }),
    ).toMatchObject({
      kind: 'statline',
      statKeys: ['assists'],
      requiredStatKeys: ['assists'],
      initialStats: {},
      cancelLabel: 'Cancel',
    })
  })

  it('does not prompt when the topic has all required stats, even if a value is zero', () => {
    expect(
      getCoachCardFollowUpPrompt({
        card: { ...roleCueCard, id: 'cue_handler_playmaking_balance' },
        context: {
          role: 'handler',
          resultTags: [],
          focusTag: null,
          rpe: null,
          basketballStats: { assists: 0 },
        },
        missingInputs: [],
      }),
    ).toBeNull()
  })
})

describe('shouldShowCoachSensorSyncInCard', () => {
  it('places watch sync only inside effort cards', () => {
    expect(shouldShowCoachSensorSyncInCard(effortCard)).toBe(true)
    expect(shouldShowCoachSensorSyncInCard(lowDataCard)).toBe(false)
    expect(shouldShowCoachSensorSyncInCard(roleCueCard)).toBe(false)
  })
})

describe('getCoachDisplayCards', () => {
  it('puts grounded effort prompt cards before regular analysis cards', () => {
    expect(
      getCoachDisplayCards({
        cards: [contextHintCard, ladderCard],
        context: { role: 'handler', resultTags: [], focusTag: null, rpe: null, basketballStats: {} },
        missingInputs: ['sensor'],
      }).map((card) => card.id),
    ).toEqual(['coach_prompt_effort', 'cue_handler_playmaking_balance'])
  })

  it('keeps free input cards ahead of preview cards for non-Pro users', () => {
    expect(
      getCoachDisplayCards({
        cards: [lowDataCard],
        context: { role: 'handler', resultTags: [], focusTag: null, rpe: null, basketballStats: {} },
        missingInputs: ['sensor'],
        hasPro: false,
      }).map((card) => card.id),
    ).toEqual(['coach_prompt_effort', 'low_data', 'cue_handler_playmaking_balance'])
  })

  it('keeps already-resolved cue cards in normal analysis order', () => {
    expect(
      getCoachDisplayCards({
        cards: [lowDataCard, roleCueCard],
        context: {
          role: 'handler',
          resultTags: ['turnovers'] as never,
          focusTag: 'ball_handling',
          rpe: 8,
          basketballStats: { points: 7 },
        },
        missingInputs: [],
      }).map((card) => card.id),
    ).toEqual(['low_data', 'cue_handler_playmaking_balance'])
  })

  it('keeps badge/relic cards out of the analysis topic deck', () => {
    expect(
      getCoachDisplayCards({
        cards: [lowDataCard, relicCard, roleCueCard],
        context: {
          role: 'handler',
          resultTags: ['turnovers'] as never,
          focusTag: null,
          rpe: 8,
          basketballStats: {},
        },
        missingInputs: [],
      }).map((card) => card.id),
    ).toEqual(['low_data', 'cue_handler_playmaking_balance'])
  })

  it('localizes coach prompt cards for Thai analytics reads', () => {
    const cards = getCoachDisplayCards({
      cards: [],
      context: {
        role: 'handler',
        resultTags: [],
        focusTag: null,
        rpe: null,
        basketballStats: {},
      },
      missingInputs: ['sensor', 'history'],
      hasPro: true,
      language: 'th',
    })

    expect(cards[0]).toMatchObject({
      id: 'coach_prompt_effort',
      title: 'เพิ่มความหนักของเกม',
    })
  })
})

describe('getCoachDisplayDeck', () => {
  it('shows role signature cards first even before their stats are filled', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'handler',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: {},
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).toEqual([
      'low_data',
      'cue_handler_playmaking_balance',
    ])
    expect(getCoachCardFollowUpPrompt({
      card: deck.visibleCards[1],
      context: {
        role: 'handler',
        resultTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: {},
      },
      missingInputs: [],
    })).toMatchObject({ kind: 'statline', statKeys: ['assists'] })
  })

  it('puts off-role stat topics behind more reads until the user asks for them', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'handler',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: {},
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).not.toContain('cue_shooter_scoring_profile')
    expect(deck.moreCards.map((card) => card.id)).toEqual(
      expect.arrayContaining([
        'cue_shooter_scoring_profile',
        'cue_defender_stat_impact',
        'cue_big_rebounds',
        'cue_big_paint_defense_stats',
        'cue_free_throws',
      ]),
    )
  })

  it('keeps filled off-role topics in more reads without asking again', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'handler',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { rebounds: 5 },
      },
      missingInputs: [],
    })
    const reboundCard = deck.moreCards.find((card) => card.id === 'cue_big_rebounds')

    expect(reboundCard?.body).toContain('REB 5')
    expect(
      reboundCard &&
        getCoachCardFollowUpPrompt({
          card: reboundCard,
          context: {
            role: 'handler',
            resultTags: [],
            focusTag: null,
            rpe: 8,
            basketballStats: { rebounds: 5 },
          },
          missingInputs: [],
        }),
    ).toBeNull()
  })

  it('keeps global essentials and role-matched reads visible', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard, roleCueCard, shooterCueCard],
      context: {
        role: 'handler',
        resultTags: ['turnovers'] as never,
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { points: 7 },
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).toEqual([
      'low_data',
      'cue_handler_playmaking_balance',
    ])
    expect(deck.moreCards.map((card) => card.id)).toEqual(
      expect.arrayContaining(['cue_shooter_scoring_profile', 'cue_defender_stat_impact']),
    )
  })

  it('does not show unsupported stale reads even for all-around players', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard, roleCueCard, shooterCueCard],
      context: {
        role: 'all_around',
        resultTags: ['turnovers'] as never,
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { points: 7 },
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).toEqual(['low_data', 'cue_all_around_balance'])
    expect(deck.moreCards.map((card) => card.id)).not.toContain('cue_handler_turnovers')
  })

  it('dedupes repeated collapsed topics and keeps the role-specific read', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard, genericTurnoverCueCard, roleCueCard],
      context: {
        role: 'handler',
        resultTags: ['turnovers'] as never,
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { points: 7 },
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).toEqual([
      'low_data',
      'cue_handler_playmaking_balance',
    ])
  })

  it('does not show setup topics or unsupported detail reads', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard, shooterCueCard, screenCueCard],
      context: {
        role: 'shooter',
        resultTags: ['shot_selection'],
        detailTags: ['screen'],
        focusTag: null,
        rpe: 8,
        basketballStats: { points: 7 },
      },
      missingInputs: [],
    })

    expect(deck.visibleCards.map((card) => card.id)).toEqual(['low_data', 'cue_shooter_scoring_profile'])
    expect(deck.visibleCards.map((card) => card.id)).not.toContain('cue_screen_impact')
  })

  it('reads a defensive stat impact card from steals alone, treating missing blocks as 0', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'defender',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { steals: 3 },
      },
      missingInputs: [],
    })

    const card = deck.visibleCards.find((c) => c.id === 'cue_defender_stat_impact')
    expect(card).toBeDefined()
    expect(card?.metrics).toEqual({ steals: 3, blocks: 0 })
    expect(card?.body).not.toBe('No data yet: add the required statline to read this topic.')
  })

  it('reads a stat balance card from points alone, rendering missing lanes as placeholders', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'all_around',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: { points: 9 },
      },
      missingInputs: [],
    })

    const card = deck.visibleCards.find((c) => c.id === 'cue_all_around_balance')
    expect(card).toBeDefined()
    expect(card?.metrics).toEqual({ points: 9 })
  })

  it('still shows a single prompt card for a fully-empty statline', () => {
    const deck = getCoachDisplayDeck({
      cards: [lowDataCard],
      context: {
        role: 'big',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: {},
      },
      missingInputs: [],
    })

    const promptCards = deck.visibleCards.filter((card) => card.title === 'Add stats to read')
    expect(promptCards).toHaveLength(1)
  })

  it('collapses multiple gated signature cards for one role into exactly one prompt card', () => {
    // 'big' has two signature ids (cue_big_rebounds, cue_big_paint_defense_stats);
    // with no stats logged both are gated, but only one prompt should surface.
    const deck = getCoachDisplayDeck({
      cards: [],
      context: {
        role: 'big',
        resultTags: [],
        detailTags: [],
        focusTag: null,
        rpe: 8,
        basketballStats: {},
      },
      missingInputs: [],
    })

    const bigCueIds = deck.visibleCards
      .map((card) => card.id)
      .filter((id) => id === 'cue_big_rebounds' || id === 'cue_big_paint_defense_stats')
    expect(bigCueIds).toHaveLength(1)
  })
})

describe('localizeCoachInsightCard', () => {
  it('localizes handler playmaking without resurrecting TO copy', () => {
    expect(
      localizeCoachInsightCard({
        id: 'cue_handler_playmaking_balance',
        type: 'training_cue',
        title: 'Create for teammates',
        body: 'Handler game with assists logged.',
        severity: 'warning',
        locked: false,
        source: 'mixed',
      }),
    ).toMatchObject({
      title: 'Playmaking balance',
      body: 'Assists are the main read. Compare them with PTS, REB, BLK, and made threes.',
    })
  })

  it('translates known coach analytics cards without changing metrics', () => {
    expect(
      localizeCoachInsightCard(
        {
          id: 'low_data',
          type: 'form',
          title: 'Need more matches',
          body: 'Add 2 more basketball matches for stronger trends.',
          severity: 'neutral',
          locked: false,
          metrics: { matches_logged: 1, matches_needed: 3 },
          source: 'history',
        },
        'th',
      ),
    ).toEqual({
      id: 'low_data',
      type: 'form',
      title: 'ปลดล็อกแนวโน้มฟอร์ม',
      body: 'อีก 2 แมตช์ปลดล็อกแนวโน้มฟอร์ม',
      severity: 'neutral',
      locked: false,
      metrics: { matches_logged: 1, matches_needed: 3 },
      source: 'history',
    })
  })

  it('uses no-data copy for stat topic prompts instead of judging missing stats', () => {
    expect(
      localizeCoachInsightCard({
        id: 'cue_shooter_scoring_profile',
        type: 'training_cue',
        title: 'Add stats to read',
        body: 'No data yet: add PTS to read this topic.',
        severity: 'neutral',
        locked: false,
        source: 'context',
      }),
    ).toMatchObject({
      title: 'Add stats to read',
      body: 'No data yet: add the required statline to read this topic.',
    })

    expect(
      localizeCoachInsightCard(
        {
          id: 'cue_shooter_scoring_profile',
          type: 'training_cue',
          title: 'Add stats to read',
          body: 'No data yet: add PTS to read this topic.',
          severity: 'neutral',
          locked: false,
          source: 'context',
        },
        'th',
      ).body,
    ).toBe('ยังไม่มีข้อมูล: กรอกสถิติที่หัวข้อนี้ต้องใช้ก่อนอ่านผล')
  })

  it('localizes zero defensive stats as a direct needs-work read', () => {
    expect(
      localizeCoachInsightCard(
        {
          id: 'cue_defender_stat_impact',
          type: 'training_cue',
          title: 'Defensive stat impact',
          body: 'Needs work: 0 steals and 0 blocks recorded.',
          severity: 'warning',
          locked: false,
          metrics: { steals: 0, blocks: 0 },
          source: 'context',
        },
        'th',
      ),
    ).toMatchObject({
      body: 'ต้องแก้: STL 0, BLK 0 แปลว่ายังไม่มี defensive event ใน statline; เกมหน้าไล่ให้ได้อย่างน้อย 1 จังหวะ',
      severity: 'warning',
    })
  })

  it('keeps benchmark verdicts direct instead of replacing them with generic caveats', () => {
    const card: CoachInsightCard = {
      id: 'web_benchmark_nba_points',
      type: 'training_cue',
      title: 'Pro scoring scale',
      body: 'Needs work: PTS 6 is below the pro Shooter benchmark (10 PTS); next review: get one clean scoring touch.',
      severity: 'warning',
      locked: false,
      metrics: {
        current: 6,
        benchmark: 10,
        benchmark_role: 'shooter',
        comparison_points_band: 'below_role_scale',
        comparison_points_unit: 'PTS',
      },
      source: 'benchmark',
    }

    expect(localizeCoachInsightCard(card)).toMatchObject({
      body: card.body,
      severity: 'warning',
    })
    expect(localizeCoachInsightCard(card, 'th').body).toBe(
      'ต้องแก้: PTS 6 ต่ำกว่า benchmark ของ Shooter (10 PTS); เกมหน้าหาแต้มคุณภาพเพิ่มให้ชัด',
    )
  })

  it('localizes sensor confidence and movement-only shooter cues in Thai', () => {
    const card: CoachInsightCard = {
      id: 'sensor_coach_read',
      type: 'training_cue',
      title: 'Sensor coach read',
      body: 'Movement-only read: not enough HR coverage to judge full effort.',
      severity: 'warning',
      locked: false,
      metrics: {
        role: 'shooter',
        steps: 420,
        points: 3,
        three_pointers_made: 0,
        sensor_confidence: 'movement_only',
        court_mode_effort: 'missing',
        court_mode_footwork: 'missing',
        court_mode_movement: 'missing',
      },
      source: 'sensor',
    }

    const localized = localizeCoachInsightCard(card, 'th')
    expect(localized).toMatchObject({
      title: 'อ่านเกมจากเซนเซอร์',
      body: expect.stringContaining('อ่านได้เฉพาะ movement'),
      severity: 'warning',
    })
    expect(localized.body).toContain('ยังไม่สรุปความหนักเต็ม')
    expect(localized.body).toContain('Shooter')
    expect(localized.body).toContain('ขยับหลัง pass/drive')
  })

})

describe('getCoachCardsSectionLabel', () => {
  it('keeps saved-context acknowledgements out of the insight list', () => {
    expect(getCoachCardsSectionLabel('updated')).toBe('NEXT READS')
    expect(getCoachCardsSectionLabel('needs_context')).toBe('CURRENT READ')
  })

  it('uses a clear Thai section label for analysis topics', () => {
    expect(getCoachCardsSectionLabel('updated', 'th')).toBe('หัวข้อวิเคราะห์')
  })
})

describe('getCoachInsightDisclosureState', () => {
  it('keeps coach card analysis hidden until the user opens a topic', () => {
    expect(getCoachInsightDisclosureState(false)).toEqual({
      bodyVisible: false,
      headerMetaVisible: false,
      actionLabel: 'Read analysis',
      accessibilityHint: 'Opens the coach analysis for this topic.',
      icon: 'chevron-down',
    })
  })

  it('shows the coach card analysis after the user opens a topic', () => {
    expect(getCoachInsightDisclosureState(true)).toEqual({
      bodyVisible: true,
      headerMetaVisible: false,
      actionLabel: 'Hide analysis',
      accessibilityHint: 'Collapses the coach analysis for this topic.',
      icon: 'chevron-up',
    })
  })
})

describe('getCoachInsightHeaderTitle', () => {
  it('shows the analysis topic before opening and the actual read after opening', () => {
    expect(getCoachInsightHeaderTitle(roleCueCard, false)).toBe('Playmaking')
    expect(getCoachInsightHeaderTitle(roleCueCard, true)).toBe('Playmaking balance')
  })

  it('uses analysis topic labels for result-shaped training cue cards', () => {
    expect(
      getCoachInsightHeaderTitle(
        {
          id: 'cue_handler_playmaking_balance',
          type: 'training_cue',
          title: 'Create for teammates',
          body: 'Handler game with assists logged.',
          severity: 'warning',
          locked: false,
          source: 'mixed',
        },
        false,
      ),
    ).toBe('Playmaking')

    expect(
      getCoachInsightHeaderTitle(
        {
          id: 'cue_free_throws',
          type: 'training_cue',
          title: 'Practice free throws in close games',
          body: 'Close loss with a free throws tag.',
          severity: 'warning',
          locked: false,
          source: 'mixed',
        },
        false,
      ),
    ).toBe('Free throws')
  })

  it('localizes collapsed analysis topics in Thai', () => {
    expect(getCoachInsightHeaderTitle(lowDataCard, false, 'th')).toBe('แนวโน้มฟอร์ม')
    expect(getCoachInsightHeaderTitle(roleCueCard, false, 'th')).toBe('การสร้างแต้ม')
    expect(getCoachInsightHeaderTitle(effortCard, false, 'th')).toBe('แรงที่ใช้ในเกม')
  })

  it('keeps low-data as the opened result, not the collapsed topic', () => {
    expect(getCoachInsightHeaderTitle(lowDataCard, false)).toBe('Form trend')
    expect(getCoachInsightHeaderTitle(lowDataCard, true)).toBe('Unlock form trend')
  })

  it('uses research-approved Thai topic labels for role-aware cards', () => {
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_free_throws' }, false, 'th')).toBe('ฟรีโทรว์')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_handler_playmaking_balance' }, false, 'th')).toBe('การสร้างแต้ม')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_shooter_scoring_profile' }, false, 'th')).toBe('รูปแบบการทำแต้ม')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_defender_stat_impact' }, false, 'th')).toBe('เกมรับจากสถิติ')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_big_rebounds' }, false, 'th')).toBe('รีบาวด์')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_big_paint_defense_stats' }, false, 'th')).toBe('ป้องกันใต้แป้นจากสถิติ')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_all_around_balance' }, false, 'th')).toBe('สมดุลสถิติ')
  })

  it('keeps collapsed Pro/sensor/H2H cards as topics, not results', () => {
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'cue_h2h_improving' }, false, 'th')).toBe('เจอคนนี้')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'sensor_coach_read', source: 'sensor' }, false, 'th')).toBe('แรงที่ใช้ในเกม')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'workload_spike_sensor', type: 'effort' }, false, 'th')).toBe('แรงเทียบปกติ')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'workload_spike_rpe', type: 'effort' }, false, 'th')).toBe('แรงเทียบปกติ')
    expect(getCoachInsightHeaderTitle({ ...roleCueCard, id: 'verified_effort_sensor', type: 'effort' }, false, 'th')).toBe('ข้อมูลแรงจากวอช')
  })
})

describe('getCoachContextToggleCopy', () => {
  it('uses a chevron-up state while the quick context form is open', () => {
    expect(getCoachContextToggleCopy({ isOpen: true, stageKind: 'updated' })).toEqual({
      label: 'Hide context',
      icon: 'chevron-up',
    })
  })

  it('uses chevron-down for closed context states', () => {
    expect(getCoachContextToggleCopy({ isOpen: false, stageKind: 'needs_context' })).toEqual({
      label: 'Add context',
      icon: 'chevron-down',
    })
    expect(getCoachContextToggleCopy({ isOpen: false, stageKind: 'updated' })).toEqual({
      label: 'Edit context',
      icon: 'chevron-down',
    })
  })
})

describe('getCoachContextInitial', () => {
  it('maps saved grounded context back into the editable form shape and drops legacy tags', () => {
    expect(
      getCoachContextInitial({
        role: 'handler',
        resultTags: ['turnovers'] as never,
        detailTags: ['screen'],
        focusTag: 'ball_handling',
        rpe: 7,
        basketballStats: { assists: 4 },
      }),
    ).toEqual({
      role: 'handler',
      resultTags: [],
      detailTags: [],
      focusTag: null,
      rpe: 7,
      basketballStats: { assists: 4 },
    })
  })

  it('returns undefined when there is no saved context', () => {
    expect(getCoachContextInitial(null)).toBeUndefined()
  })
})
