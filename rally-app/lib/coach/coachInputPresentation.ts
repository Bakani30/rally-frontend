import {
  type CoachInsightCard,
  type CoachActivityContextState,
  type BasketballDetailTag,
  type BasketballFocusTag,
  type BasketballResultTag,
  type BasketballRole,
  type BasketballStatLine,
  type CoachBenchmarkFormat,
} from './coachTypes'
import type { AppLanguage } from '../i18n/language'

export type CoachInputSignalState = {
  role: BasketballRole | null
  resultTags: BasketballResultTag[]
  detailTags?: BasketballDetailTag[]
  focusTag: BasketballFocusTag | null
  rpe: number | null
  basketballStats: BasketballStatLine
}

export type CompleteCoachInputSignalState = CoachInputSignalState & {
  detailTags: BasketballDetailTag[]
}

export type CoachReadStageInput = {
  missingInputs: Array<'context' | 'sensor' | 'history'>
  savedSummary: string | null
  language?: AppLanguage
}

export type CoachReadStage = {
  kind: 'needs_context' | 'updated'
  eyebrow: string
  title: string
  body: string
  primaryActionLabel: string
  savedSummary: string | null
}

export type CoachContextToggleCopy = {
  label: string
  icon: 'chevron-up' | 'chevron-down'
}

export type CoachInsightDisclosureState = {
  bodyVisible: boolean
  headerMetaVisible: boolean
  actionLabel: string
  accessibilityHint: string
  icon: 'chevron-down' | 'chevron-up'
}

export type CoachContextPatch = Partial<CoachInputSignalState>

export type BasketballStatKey = keyof BasketballStatLine

export type CoachCardFollowUpPrompt =
  | {
      kind: 'rpe'
      title: string
      help: string
      initialRpe: number | null
      saveLabel?: string
      cancelLabel?: string
    }
  | {
      kind: 'statline'
      title: string
      help: string
      initialStats: BasketballStatLine
      statKeys?: BasketballStatKey[]
      requiredStatKeys?: BasketballStatKey[]
      saveLabel?: string
      cancelLabel?: string
    }

export type BasketballRoleHelp = {
  title: string
  body: string
}

export type BasketballStatLineValidation = {
  valid: boolean
  message: string | null
}

const ROLE_LABEL_EN: Record<BasketballRole, string> = {
  handler: 'Handler',
  shooter: 'Shooter',
  defender: 'Defender',
  big: 'Big',
  all_around: 'All-around',
}

const ROLE_LABEL_TH: Record<BasketballRole, string> = {
  handler: 'Handler',
  shooter: 'Shooter',
  defender: 'Defender',
  big: 'Big',
  all_around: 'All-around',
}

const ROLE_LABEL_3X3_EN: Record<BasketballRole, string> = {
  handler: 'Creator',
  shooter: 'Shooter',
  defender: 'Stopper',
  big: 'Screener',
  all_around: 'Two-way',
}

const ROLE_LABEL_3X3_TH: Record<BasketballRole, string> = {
  handler: 'Creator',
  shooter: 'Shooter',
  defender: 'Stopper',
  big: 'Screener',
  all_around: 'Two-way',
}

const SHOOTER_POINTS_WARNING_THRESHOLD = 6
const BIG_REBOUND_WARNING_THRESHOLD = 5

const THAI_CARD_COPY: Record<string, { title: string; body?: string }> = {
  coach_prompt_effort: {
    title: 'เพิ่มความหนักของเกม',
    body: 'บอกว่าแมตช์นี้หนักแค่ไหน เมื่อไม่มีข้อมูลจากวอช',
  },
  low_data: {
    title: 'ปลดล็อกแนวโน้มฟอร์ม',
  },
  form_last5: {
    title: 'ฟอร์มบาสล่าสุด',
  },
  effort_sensor: {
    title: 'แรงที่ใช้เทียบค่าเฉลี่ย',
    body: 'แรงที่ใช้ในเกมนี้เทียบกับค่าเฉลี่ยบาสของคุณ',
  },
  sensor_coach_read: {
    title: 'อ่านเกมจากเซนเซอร์',
  },
  sensor_effort_needs_sync: {
    title: 'ข้อมูลแรงจากวอช',
    body: 'ไม่มีข้อมูลอุปกรณ์ จึงไม่ตัดสินเรื่องแรงหรือ movement จากเซนเซอร์ ซิงก์วอชหรือมือถือก่อนถึงจะอ่านส่วนนี้ได้',
  },
  effort_rpe: {
    title: 'แรงที่คุณรู้สึก',
  },
  cue_free_throws: {
    title: 'แต้มจากลูกโทษ',
    body: 'อ่านจาก FT ที่คุณกรอกไว้เท่านั้น ยังไม่สรุปว่าพลาดหรือควรแก้อะไรจาก attempts',
  },
  cue_handler_playmaking_balance: {
    title: 'การสร้างแต้ม',
    body: 'อ่านจาก AST เป็นหลัก และเทียบกับ PTS, REB, BLK และสามแต้ม',
  },
  cue_shooter_scoring_profile: {
    title: 'รูปแบบการทำแต้ม',
    body: 'อ่านจาก PTS, 2PT/3PM และ FT ที่กรอกไว้ ไม่ตัดสินจังหวะยิงเพราะยังไม่มี attempts หรือ video',
  },
  cue_defender_stat_impact: {
    title: 'เกมรับจากสถิติ',
    body: 'ยังไม่มีข้อมูล STL/BLK: กรอกก่อนตัดสินเกมรับจากสถิติ',
  },
  cue_big_rebounds: {
    title: 'รีบาวด์',
    body: 'อ่านจาก REB ที่กรอกไว้ เป็นสัญญาณตรงของงานใต้แป้น',
  },
  cue_big_paint_defense_stats: {
    title: 'ป้องกันใต้แป้นจากสถิติ',
    body: 'อ่านจาก BLK ที่กรอกไว้เท่านั้น',
  },
  cue_all_around_balance: {
    title: 'สมดุลสถิติ',
    body: 'อ่านจากหลายหมวดสถิติที่กรอกไว้ เพื่อดูว่าวันนี้ช่วยทีมหลายทางแค่ไหน',
  },
  cue_h2h_improving: {
    title: 'ทำซ้ำสิ่งที่ดีขึ้นเวลาเจอคนนี้',
    body: 'แต้มต่างดีขึ้นเวลาเจอคู่แข่งคนนี้: ทำซ้ำสิ่งที่คุมได้และรู้สึกว่าเปลี่ยนจากครั้งก่อน',
  },
  workload_spike_sensor: {
    title: 'เกมหนักกว่าปกติ',
    body: 'เกมนี้ใช้แรงมากกว่าปกติของคุณ ถ้ารู้สึกล้าผิดปกติ รอบหน้าลองลดความหนักลง',
  },
  workload_spike_rpe: {
    title: 'เกมหนักกว่าปกติ',
    body: 'RPE เกมนี้สูงกว่าปกติของคุณ ถ้ารู้สึกล้าผิดปกติ รอบหน้าลองลดความหนักลง',
  },
  verified_effort_sensor: {
    title: 'ยืนยันแรงที่ใช้ในเกม',
    body: 'มีข้อมูลวอชหรือมือถือผูกกับ Recap ส่วนตัวของแมตช์นี้แล้ว',
  },
  web_benchmark_nba_points: {
    title: 'เทียบสเกลบาสอาชีพ',
    body: 'ใช้เป็นสเกล box-score บาสอาชีพเท่านั้น ไม่ใช่คำตัดสินระดับฝีมือ',
  },
  web_benchmark_nba_assists: {
    title: 'เทียบสเกลบาสอาชีพ',
    body: 'ใช้เป็นสเกล AST ของบาสอาชีพเท่านั้น ไม่ใช่คำตัดสินระดับฝีมือ',
  },
  web_benchmark_nba_rebounds: {
    title: 'เทียบสเกลบาสอาชีพ',
    body: 'ใช้เป็นสเกล REB ของบาสอาชีพเท่านั้น ไม่ใช่คำตัดสินระดับฝีมือ',
  },
  web_benchmark_general_basketball_effort: {
    title: 'เทียบความหนักจากเว็บ',
    body: 'ใช้ Compendium เป็นเกณฑ์ความหนักทั่วไปของบาส ไม่ใช้สเกลบาสอาชีพกับเรื่อง effort',
  },
  relic_clutch_fighter: {
    title: 'Clutch Fighter',
    body: 'ชนะเกมที่แต้มเบียดกันมาก',
  },
  relic_rivalry_learned: {
    title: 'Rivalry Learned',
    body: 'เล่นแมตช์บาสแข่งขันอย่างน้อยสามครั้ง',
  },
  relic_verified_effort: {
    title: 'ยืนยันความหนักแล้ว',
    body: 'ซิงก์ข้อมูลจากวอชหรือมือถือสำหรับแมตช์นี้แล้ว',
  },
  relic_high_effort_closeout: {
    title: 'ปิดเกมหนักได้',
    body: 'ปิดเกมได้แม้เกมนี้ใช้แรงสูง',
  },
  relic_comeback_pressure: {
    title: 'ปิดเกมหนักได้',
    body: 'ปิดเกมได้แม้เกมนี้ใช้แรงสูง',
  },
}

const ENGLISH_CARD_COPY: Record<string, { title: string; body?: string }> = {
  low_data: {
    title: 'Unlock form trend',
  },
  sensor_coach_read: {
    title: 'Sensor coach read',
  },
  sensor_effort_needs_sync: {
    title: 'Watch effort data',
    body: 'No device data attached, so Rally will not judge effort or movement from sensors. Sync watch or phone health data to add that read.',
  },
  cue_free_throws: {
    title: 'Free throw points',
    body: 'Made free throws are read from FT only. Rally will not infer misses without attempts.',
  },
  cue_handler_playmaking_balance: {
    title: 'Playmaking balance',
    body: 'Assists are the main read. Compare them with PTS, REB, BLK, and made threes.',
  },
  cue_shooter_scoring_profile: {
    title: 'Scoring profile',
    body: 'Points, shooting makes, and made free throws are read from PTS, 2PT/3PM, and FT. Rally will not judge shot choices without attempts or video.',
  },
  cue_defender_stat_impact: {
    title: 'Defensive stat impact',
    body: 'No data yet: add STL and BLK before judging defensive events.',
  },
  cue_big_rebounds: {
    title: 'Rebounding',
    body: 'Rebounds are read from REB as the clearest v1 signal for inside work.',
  },
  cue_big_paint_defense_stats: {
    title: 'Paint defense stats',
    body: 'Blocks are read from BLK only.',
  },
  cue_all_around_balance: {
    title: 'Stat balance',
    body: 'Multiple stat lanes were logged, so Rally can read the breadth of your contribution.',
  },
  cue_h2h_improving: {
    title: 'Repeat what improved this matchup',
    body: 'Your margin improved against this opponent — repeat the controllable choices that felt different.',
  },
  workload_spike_sensor: {
    title: 'Heavier than usual',
    body: 'This game was above your usual basketball effort. If you feel unusually tired, keep the next session lighter.',
  },
  workload_spike_rpe: {
    title: 'Heavier than usual',
    body: 'RPE was above your recent basketball feel. If you feel unusually tired, keep the next session lighter.',
  },
  verified_effort_sensor: {
    title: 'Verified effort',
    body: 'Watch or phone effort context is attached to this private recap.',
  },
  web_benchmark_nba_points: {
    title: 'Pro basketball scale',
    body: 'This is used only as a pro basketball box-score scale, not a skill verdict.',
  },
  web_benchmark_nba_assists: {
    title: 'Pro basketball scale',
    body: 'This is used only as a pro basketball assist scale, not a skill verdict.',
  },
  web_benchmark_nba_rebounds: {
    title: 'Pro basketball scale',
    body: 'This is used only as a pro basketball rebound scale, not a skill verdict.',
  },
  web_benchmark_general_basketball_effort: {
    title: 'General effort benchmark',
    body: 'Compendium data is used for general basketball effort. Pro box-score scale is not used for effort.',
  },
  relic_high_effort_closeout: {
    title: 'High Effort Closeout',
    body: 'Closed out under high effort.',
  },
  relic_comeback_pressure: {
    title: 'High Effort Closeout',
    body: 'Closed out under high effort.',
  },
}

const COACH_CARD_TOPIC_COPY: Record<string, { en: string; th: string }> = {
  coach_prompt_effort: { en: 'Game effort', th: 'แรงที่ใช้ในเกม' },
  low_data: { en: 'Form trend', th: 'แนวโน้มฟอร์ม' },
  form_last5: { en: 'Recent form', th: 'ฟอร์มล่าสุด' },
  effort_sensor: { en: 'Game effort', th: 'แรงที่ใช้ในเกม' },
  sensor_coach_read: { en: 'Sensor coach read', th: 'แรงที่ใช้ในเกม' },
  effort_rpe: { en: 'Game effort', th: 'แรงที่ใช้ในเกม' },
  cue_free_throws: { en: 'Free throws', th: 'ฟรีโทรว์' },
  cue_handler_playmaking_balance: { en: 'Playmaking', th: 'การสร้างแต้ม' },
  cue_shooter_scoring_profile: { en: 'Scoring profile', th: 'รูปแบบการทำแต้ม' },
  cue_defender_stat_impact: { en: 'Defensive stat impact', th: 'เกมรับจากสถิติ' },
  cue_big_rebounds: { en: 'Rebounding', th: 'รีบาวด์' },
  cue_big_paint_defense_stats: { en: 'Paint defense stats', th: 'ป้องกันใต้แป้นจากสถิติ' },
  cue_all_around_balance: { en: 'Stat balance', th: 'สมดุลสถิติ' },
  cue_h2h_improving: { en: 'Head-to-head', th: 'เจอคนนี้' },
  workload_spike_sensor: { en: 'Effort vs usual', th: 'แรงเทียบปกติ' },
  workload_spike_rpe: { en: 'Effort vs usual', th: 'แรงเทียบปกติ' },
  verified_effort_sensor: { en: 'Watch effort data', th: 'ข้อมูลแรงจากวอช' },
  web_benchmark_nba_points: { en: 'Pro basketball scale', th: 'สเกลบาสอาชีพ' },
  web_benchmark_nba_assists: { en: 'Pro basketball scale', th: 'สเกลบาสอาชีพ' },
  web_benchmark_nba_rebounds: { en: 'Pro basketball scale', th: 'สเกลบาสอาชีพ' },
  web_benchmark_general_basketball_effort: { en: 'General effort benchmark', th: 'เกณฑ์ความหนักจากเว็บ' },
  relic_clutch_fighter: { en: 'Clutch badge', th: 'แบดจ์ clutch' },
  relic_rivalry_learned: { en: 'Rivalry badge', th: 'แบดจ์คู่แข่ง' },
  relic_verified_effort: { en: 'Effort verification', th: 'ยืนยันความหนัก' },
  relic_high_effort_closeout: { en: 'High-effort badge', th: 'แบดจ์เกมหนัก' },
  relic_comeback_pressure: { en: 'High-effort badge', th: 'แบดจ์เกมหนัก' },
}

const GLOBAL_COACH_CARD_IDS = new Set([
  'coach_prompt_effort',
  'low_data',
  'form_last5',
  'effort_sensor',
  'sensor_coach_read',
  'effort_rpe',
  'workload_spike_sensor',
  'workload_spike_rpe',
  'verified_effort_sensor',
])

const STAT_INPUT_PROMPT_BODY_EN = 'No data yet: add the required statline to read this topic.'
const STAT_INPUT_PROMPT_BODY_TH = 'ยังไม่มีข้อมูล: กรอกสถิติที่หัวข้อนี้ต้องใช้ก่อนอ่านผล'

const STAT_LABELS: Partial<Record<BasketballStatKey, string>> = {
  points: 'PTS',
  rebounds: 'REB',
  assists: 'AST',
  steals: 'STL',
  blocks: 'BLK',
  twoPointersMade: '2PT',
  threePointersMade: '3PM',
  freeThrowsMade: 'FT',
}

const FULL_BASKETBALL_STAT_INPUT_KEYS: BasketballStatKey[] = [
  'points',
  'twoPointersMade',
  'threePointersMade',
  'rebounds',
  'assists',
  'blocks',
  'steals',
  'freeThrowsMade',
]

const DEFAULT_3X3_STAT_INPUT_KEYS: BasketballStatKey[] = [
  'points',
  'twoPointersMade',
  'rebounds',
  'assists',
]

const ROLE_3X3_STAT_INPUT_KEYS: Record<BasketballRole, BasketballStatKey[]> = {
  handler: ['points', 'twoPointersMade', 'assists', 'rebounds'],
  shooter: ['points', 'twoPointersMade', 'rebounds'],
  defender: ['points', 'twoPointersMade', 'rebounds', 'blocks', 'steals'],
  big: ['points', 'twoPointersMade', 'rebounds', 'blocks', 'assists'],
  all_around: ['points', 'twoPointersMade', 'rebounds', 'assists', 'blocks'],
}

const STAT_REQUIREMENTS_BY_CARD_ID: Record<string, BasketballStatKey[]> = {
  cue_handler_playmaking_balance: ['assists'],
  cue_shooter_scoring_profile: ['points'],
  cue_defender_stat_impact: ['steals', 'blocks'],
  cue_big_rebounds: ['rebounds'],
  cue_big_paint_defense_stats: ['blocks'],
  cue_all_around_balance: ['points', 'rebounds', 'assists'],
  cue_free_throws: ['freeThrowsMade'],
}

// "Any-of" cards degrade gracefully with a partial statline: they're only
// treated as missing-stats (and gated behind a prompt card) when ALL of
// their listed stats are absent, not when just one is. Every other card id
// keeps the default all-required semantics.
const ANY_OF_STAT_REQUIREMENT_CARD_IDS = new Set(['cue_defender_stat_impact', 'cue_all_around_balance'])

const ROLE_SIGNATURE_CARD_IDS: Record<BasketballRole, string[]> = {
  handler: ['cue_handler_playmaking_balance'],
  shooter: ['cue_shooter_scoring_profile'],
  defender: ['cue_defender_stat_impact'],
  big: ['cue_big_rebounds', 'cue_big_paint_defense_stats'],
  all_around: ['cue_all_around_balance'],
}

const EXTRA_STAT_TOPIC_CARD_IDS = [
  'cue_handler_playmaking_balance',
  'cue_shooter_scoring_profile',
  'cue_defender_stat_impact',
  'cue_big_rebounds',
  'cue_big_paint_defense_stats',
  'cue_free_throws',
  'cue_all_around_balance',
] as const

const ROLE_RELEVANT_CARD_IDS: Record<BasketballRole, ReadonlySet<string>> = {
  handler: new Set(['cue_handler_playmaking_balance', 'cue_h2h_improving']),
  shooter: new Set(['cue_shooter_scoring_profile', 'cue_h2h_improving']),
  defender: new Set(['cue_defender_stat_impact', 'cue_h2h_improving']),
  big: new Set(['cue_big_rebounds', 'cue_big_paint_defense_stats', 'cue_h2h_improving']),
  all_around: new Set([
    'cue_all_around_balance',
    'cue_h2h_improving',
  ]),
}

const UNSUPPORTED_COACH_CARD_IDS = new Set([
  'coach_prompt_factors',
  'context_hint',
  'insight_ladder',
  'setup_shot_quality',
  'setup_defensive_impact',
  'setup_rebounding',
  'setup_free_throws',
  'setup_screen_impact',
  'setup_box_out_rebounds',
  'setup_defensive_activity',
  'setup_contest_pressure',
  'cue_shooter_shot_quality',
  'cue_defender_pressure',
  'cue_screen_impact',
  'cue_box_out_rebounds',
  'cue_defensive_activity',
  'cue_contest_pressure',
  'cue_all_around_endgame',
  'cue_conditioning_or_shot_quality',
  'cue_turnovers',
  'cue_handler_turnovers',
])

export function getBasketballRoleLabel(
  role: BasketballRole,
  language: AppLanguage = 'en',
  benchmarkFormat?: CoachBenchmarkFormat | null,
): string {
  if (benchmarkFormat === '3x3') {
    return language === 'th' ? ROLE_LABEL_3X3_TH[role] : ROLE_LABEL_3X3_EN[role]
  }
  return language === 'th' ? ROLE_LABEL_TH[role] : ROLE_LABEL_EN[role]
}

export function getBasketballRoleHelp(
  role: BasketballRole,
  language: AppLanguage = 'en',
  benchmarkFormat?: CoachBenchmarkFormat | null,
): BasketballRoleHelp {
  if (benchmarkFormat === '3x3') {
    if (language === 'th') {
      switch (role) {
        case 'handler':
          return {
            title: 'Creator',
            body: 'ตัวสร้างจังหวะ 3v3: คุมบอลเร็ว เจาะเข้าไปบังคับ help แล้ว kick-out ให้เพื่อน หรือจบเองเมื่อทางเปิด',
          }
        case 'shooter':
          return {
            title: 'Shooter',
            body: 'ตัวเปิดพื้นที่ 3v3: ยืนมุมหรือ wing ให้กว้าง ขยับหลังเพื่อน drive และพร้อม catch-and-shoot เมื่อบอลมา',
          }
        case 'defender':
          return {
            title: 'Stopper',
            body: 'ตัวหยุดเกม 3v3: switch ให้ทัน กัน drive บีบช็อตยาก และอย่า overhelp จนเสียตัวว่าง',
          }
        case 'big':
          return {
            title: 'Screener',
            body: 'ตัว screen 3v3: ตั้ง screen ให้เพื่อนหลุด roll หรือ seal ใกล้ห่วง แล้วรีบาวด์ให้จบ possession',
          }
        case 'all_around':
          return {
            title: 'Two-way',
            body: 'ตัวครบเครื่อง 3v3: สลับคุมบอล ทำแต้ม รับ รีบาวด์ และอุดช่องว่างตาม possession',
          }
      }
    }

    switch (role) {
      case 'handler':
        return {
          title: 'Creator',
          body: '3x3 creation role: attack early, force help, kick out, or finish when the lane opens.',
        }
      case 'shooter':
        return {
          title: 'Shooter',
          body: '3x3 spacing role: hold the corner or wing, relocate after a drive, and stay ready for clean catch-and-shoot looks.',
        }
      case 'defender':
        return {
          title: 'Stopper',
          body: '3x3 stopper role: switch, contain the drive, contest cleanly, and recover without overhelping.',
        }
      case 'big':
        return {
          title: 'Screener',
          body: '3x3 screening role: set solid screens, roll or seal, rebound, and punish small switches near the rim.',
        }
      case 'all_around':
        return {
          title: 'Two-way',
          body: '3x3 two-way role: rotate jobs possession by possession, cover gaps, rebound, and keep the ball moving.',
        }
    }
  }

  if (language === 'th') {
    switch (role) {
      case 'handler':
        return {
          title: 'Handler',
          body: 'คนถือบอล / ตัวทำเกม: วันนี้คุณพาบอลขึ้น เปิดเพลย์ หรือรับแรงกดดันจากตัวประกบเป็นหลัก',
        }
      case 'shooter':
        return {
          title: 'Shooter',
          body: 'ตัวชู้ต / วงนอก: วันนี้คุณช่วยเปิดระยะ หา catch-and-shoot หรือเลือกช็อตที่พร้อมยิงเป็นหลัก',
        }
      case 'defender':
        return {
          title: 'Defender',
          body: 'สายรับ / ตัวสต็อปเปอร์: วันนี้คุณประกบตัวอันตราย กดดันบอล หรือช่วยหมุนเกมรับเป็นหลัก',
        }
      case 'big':
        return {
          title: 'Big',
          body: 'ตัวใน / คนรีบาวด์ / เซ็นเตอร์: วันนี้คุณรีบาวด์ ป้องกันใต้แป้น หรือจบใกล้ห่วงเป็นหลัก',
        }
      case 'all_around':
        return {
          title: 'All-around',
          body: 'ตัวทำทุกอย่าง / สายสมดุล: วันนี้คุณสลับหลายหน้าที่ ทั้งคุมบอล ทำแต้ม รับ และอุดช่องว่างให้ทีม',
        }
    }
  }

  switch (role) {
    case 'handler':
      return {
        title: 'Handler',
        body: 'You mostly brought the ball up, initiated plays, or handled pressure.',
      }
    case 'shooter':
      return {
        title: 'Shooter',
        body: 'You mostly created spacing, took catch-ready shots, or hunted clean looks.',
      }
    case 'defender':
      return {
        title: 'Defender',
        body: 'You mostly guarded the key threat, pressured the ball, or covered rotations.',
      }
    case 'big':
      return {
        title: 'Big',
        body: 'You mostly rebounded, protected the paint, or finished inside.',
      }
    case 'all_around':
      return {
        title: 'All-around',
        body: 'You changed roles often: handling, scoring, defending, and filling gaps.',
      }
  }
}

export function getBasketballStatlineHelpText(
  language: AppLanguage = 'en',
  benchmarkFormat?: CoachBenchmarkFormat | null,
): string {
  const is3x3 = benchmarkFormat === '3x3'
  const lines =
    language === 'th'
      ? is3x3
        ? [
          'PTS แต้มรวม',
          '2PT ลูกนอกเส้นลง นับ 2 แต้ม',
          'REB รีบาวด์',
          'AST แอสซิสต์',
          'BLK บล็อก',
          'STL สตีล',
          'FT ลูกโทษลง',
        ]
        : [
          'PTS แต้มรวม',
          '2PT ลูกสองแต้มลง',
          '3PM ลูกสามแต้มลง',
          'REB รีบาวด์',
          'AST แอสซิสต์',
          'BLK บล็อก',
          'STL สตีล',
          'FT ลูกโทษลง',
        ]
      : is3x3
        ? [
          'PTS total points',
          '2PT made outside-arc shots',
          'REB rebounds',
          'AST assists',
          'BLK blocks',
          'STL steals',
          'FT made free throws',
        ]
        : [
          'PTS total points',
          '2PT made twos',
          '3PM made threes',
          'REB rebounds',
          'AST assists',
          'BLK blocks',
          'STL steals',
          'FT made free throws',
        ]
  return lines.join('\n')
}

export function getBasketballStatLineValidation(
  stats: BasketballStatLine,
  input: { ownTeamScore?: number | null; language?: AppLanguage; benchmarkFormat?: CoachBenchmarkFormat | null } = {},
): BasketballStatLineValidation {
  const language = input.language ?? 'en'
  const is3x3 = input.benchmarkFormat === '3x3'
  const points = stats.points
  const assists = stats.assists
  const ownTeamScore = input.ownTeamScore
  const twoPointMinimum = (stats.twoPointersMade ?? 0) * 2
  const threePointMinimum = is3x3 ? 0 : (stats.threePointersMade ?? 0) * 3
  const freeThrowMinimum = stats.freeThrowsMade ?? 0
  const scoringMinimum = twoPointMinimum + threePointMinimum + freeThrowMinimum

  if (points != null && ownTeamScore != null && points > ownTeamScore) {
    return {
      valid: false,
      message:
        language === 'th'
          ? `PTS ต้องไม่เกินคะแนนฝั่งคุณ (${ownTeamScore})`
          : `PTS cannot exceed your side score (${ownTeamScore}).`,
    }
  }

  if (assists != null && ownTeamScore != null && assists > ownTeamScore) {
    return {
      valid: false,
      message:
        language === 'th'
          ? `AST ต้องไม่เกินคะแนนฝั่งคุณ (${ownTeamScore})`
          : `AST cannot exceed your side score (${ownTeamScore}).`,
    }
  }

  if (points != null && assists != null && ownTeamScore != null && points + assists > ownTeamScore) {
    return {
      valid: false,
      message:
        language === 'th'
          ? `PTS + AST ต้องไม่เกินคะแนนฝั่งคุณ (${ownTeamScore})`
          : `PTS + AST cannot exceed your side score (${ownTeamScore}).`,
    }
  }

  if (points == null && scoringMinimum > 0) {
    return {
      valid: false,
      message:
        language === 'th'
          ? is3x3
            ? 'ใส่ PTS ก่อน ถ้ากรอก 2PT หรือ FT'
            : 'ใส่ PTS ก่อน ถ้ากรอก 2PT, 3PM หรือ FT'
          : is3x3
            ? 'Add PTS before entering 2PT or FT.'
            : 'Add PTS before entering 2PT, 3PM, or FT.',
    }
  }

  if (points != null && scoringMinimum > points) {
    return {
      valid: false,
      message:
        language === 'th'
          ? is3x3
            ? '2PT และ FT รวมกันมากกว่า PTS แล้ว'
            : '2PT, 3PM และ FT รวมกันมากกว่า PTS แล้ว'
          : is3x3
            ? '2PT and FT already add up to more than PTS.'
            : '2PT, 3PM, and FT already add up to more than PTS.',
    }
  }

  return { valid: true, message: null }
}

export function getBasketballStatInputPlaceholder(): string {
  return '—'
}

export function getBasketballStatInputKeys({
  benchmarkFormat,
  role,
  statKeys,
}: {
  benchmarkFormat?: CoachBenchmarkFormat | null
  role?: BasketballRole | null
  statKeys?: BasketballStatKey[] | readonly BasketballStatKey[]
} = {}): BasketballStatKey[] {
  if (statKeys && statKeys.length > 0) {
    return dedupeStatKeys(statKeys)
  }
  if (benchmarkFormat === '3x3') {
    return [...(role ? ROLE_3X3_STAT_INPUT_KEYS[role] : DEFAULT_3X3_STAT_INPUT_KEYS)]
  }
  return [...FULL_BASKETBALL_STAT_INPUT_KEYS]
}

export function getBasketballStatInputValue(
  stats: BasketballStatLine,
  key: keyof BasketballStatLine,
): string {
  const value = stats[key]
  return typeof value === 'number' ? String(value) : ''
}

function dedupeStatKeys(keys: BasketballStatKey[] | readonly BasketballStatKey[]): BasketballStatKey[] {
  return keys.filter((key, index) => key !== 'turnovers' && keys.indexOf(key) === index)
}

export function sanitizePlayerFacingBasketballStats(stats: BasketballStatLine): BasketballStatLine {
  const { turnovers: _legacyTurnovers, ...visibleStats } = stats
  return visibleStats
}

export function hasCoachInputSignal(input: CoachInputSignalState): boolean {
  return Boolean(
    input.role ||
      input.rpe != null ||
      Object.keys(input.basketballStats).length > 0,
  )
}

export function canSaveBaselineCoachContext(input: CoachInputSignalState): boolean {
  return input.role !== null
}

export function mergeCoachContextPatch(
  base: CoachInputSignalState | CoachActivityContextState | null | undefined,
  patch: CoachContextPatch,
): CompleteCoachInputSignalState {
  const baseStats = sanitizePlayerFacingBasketballStats(base?.basketballStats ?? {})
  const normalized: CompleteCoachInputSignalState = {
    role: base?.role ?? null,
    resultTags: [],
    detailTags: [],
    focusTag: null,
    rpe: base?.rpe ?? null,
    basketballStats: baseStats,
  }
  const patchStats =
    patch.basketballStats !== undefined
      ? sanitizePlayerFacingBasketballStats(patch.basketballStats)
      : undefined

  return {
    role: patch.role !== undefined ? patch.role : normalized.role,
    resultTags: [],
    detailTags: [],
    focusTag: null,
    rpe: patch.rpe !== undefined ? patch.rpe : normalized.rpe,
    basketballStats:
      patchStats !== undefined
        ? { ...normalized.basketballStats, ...patchStats }
        : normalized.basketballStats,
  }
}

export function summarizeCoachInputSignals(
  input: CoachInputSignalState,
  language: AppLanguage = 'en',
): string {
  const parts: string[] = []
  if (input.role) parts.push(language === 'th' ? 'บทบาท' : 'Role')
  if (input.rpe != null) parts.push(language === 'th' ? 'ความหนัก' : 'effort')
  if (Object.keys(input.basketballStats).length > 0) parts.push(language === 'th' ? 'สถิติ' : 'statline added')
  return parts.length > 0
    ? parts.join(' + ')
    : language === 'th'
      ? 'ยังไม่มีข้อมูล'
      : 'No coach signals yet'
}

export function summarizeCoachInputSignalsCompact(
  input: CoachInputSignalState,
  language: AppLanguage = 'en',
): string {
  const count =
    (input.role ? 1 : 0) +
    (input.rpe != null ? 1 : 0) +
    (Object.keys(input.basketballStats).length > 0 ? 1 : 0)

  if (language === 'th') {
    if (count <= 0) return 'ยังไม่มีข้อมูล'
    if (count === 1 && input.role) return 'บันทึกบทบาทแล้ว'
    return `บันทึกข้อมูลแล้ว ${count} รายการ`
  }
  if (count <= 0) return 'No signals yet'
  if (count === 1 && input.role) return 'Role saved'
  return `${count} signals saved`
}

export function getCoachReadStage(input: CoachReadStageInput): CoachReadStage {
  const hasSavedContext = input.savedSummary != null || !input.missingInputs.includes('context')
  const language = input.language ?? 'en'
  if (hasSavedContext) {
    return {
      kind: 'updated',
      eyebrow: language === 'th' ? 'บันทึกแล้ว' : 'SAVED',
      title: language === 'th' ? 'อัปเดต Recap แล้ว' : 'Recap updated',
      body: '',
      primaryActionLabel: language === 'th' ? 'อัปเดตข้อมูล' : 'Update context',
      savedSummary: input.savedSummary,
    }
  }

  return {
    kind: 'needs_context',
    eyebrow: 'COACH READ',
    title: language === 'th' ? 'เพิ่มข้อมูลสั้น ๆ' : 'Add quick context',
    body:
      language === 'th'
        ? 'Role + สถิติที่จดไว้ ช่วยให้ Recap อ่านเกมตรงขึ้น'
        : 'Role + tracked stats update recap.',
    primaryActionLabel: language === 'th' ? 'บันทึกข้อมูล' : 'Save context',
    savedSummary: null,
  }
}

export function getCoachContextToggleCopy(input: {
  isOpen: boolean
  stageKind: CoachReadStage['kind']
  language?: AppLanguage
}): CoachContextToggleCopy {
  const language = input.language ?? 'en'
  if (input.isOpen) return { label: language === 'th' ? 'ซ่อนข้อมูล' : 'Hide context', icon: 'chevron-up' }
  if (input.stageKind === 'needs_context') {
    return { label: language === 'th' ? 'เพิ่มข้อมูล' : 'Add context', icon: 'chevron-down' }
  }
  return { label: language === 'th' ? 'แก้ข้อมูล' : 'Edit context', icon: 'chevron-down' }
}

export function getCoachCardsSectionLabel(
  stageKind: CoachReadStage['kind'],
  language: AppLanguage = 'en',
): string {
  if (language === 'th') return stageKind === 'updated' ? 'หัวข้อวิเคราะห์' : 'ผลอ่านตอนนี้'
  return stageKind === 'updated' ? 'NEXT READS' : 'CURRENT READ'
}

export function getCoachInsightDisclosureState(
  isOpen: boolean,
  language: AppLanguage = 'en',
): CoachInsightDisclosureState {
  if (isOpen) {
    return {
      bodyVisible: true,
      headerMetaVisible: false,
      actionLabel: language === 'th' ? 'ซ่อนผลอ่าน' : 'Hide analysis',
      accessibilityHint:
        language === 'th'
          ? 'ย่อผลวิเคราะห์ของหัวข้อนี้'
          : 'Collapses the coach analysis for this topic.',
      icon: 'chevron-up',
    }
  }
  return {
    bodyVisible: false,
    headerMetaVisible: false,
    actionLabel: language === 'th' ? 'อ่านผล' : 'Read analysis',
    accessibilityHint:
      language === 'th'
        ? 'เปิดผลวิเคราะห์ของหัวข้อนี้'
        : 'Opens the coach analysis for this topic.',
    icon: 'chevron-down',
  }
}

export function getCoachInsightHeaderTitle(
  card: CoachInsightCard,
  isOpen: boolean,
  language: AppLanguage = 'en',
): string {
  if (isOpen) return localizeCoachInsightCard(card, language).title

  const exactTopic = COACH_CARD_TOPIC_COPY[card.id]
  if (exactTopic) return exactTopic[language]

  if (card.id.startsWith('head_to_head_')) {
    return language === 'th' ? 'เจอคนนี้' : 'Head-to-head'
  }

  switch (card.type) {
    case 'form':
      return language === 'th' ? 'ฟอร์ม' : 'Form'
    case 'head_to_head':
      return language === 'th' ? 'เจอคนนี้' : 'Head-to-head'
    case 'effort':
      return language === 'th' ? 'แรงที่ใช้ในเกม' : 'Game effort'
    case 'training_cue':
      return language === 'th' ? 'หัวข้อซ้อม' : 'Training focus'
    case 'relic':
      return language === 'th' ? 'แบดจ์' : 'Badge'
    case 'preview':
      return language === 'th' ? 'Pro read' : 'Pro read'
  }
}

export function getCoachCardFollowUpPrompt(input: {
  card: CoachInsightCard
  context: CoachInputSignalState | CoachActivityContextState | null | undefined
  missingInputs: Array<'context' | 'sensor' | 'history'>
  language?: AppLanguage
}): CoachCardFollowUpPrompt | null {
  const context = mergeCoachContextPatch(input.context, {})
  const language = input.language ?? 'en'
  const isEffortPrompt =
    input.card.id === 'coach_prompt_effort' ||
    (input.card.type === 'effort' && input.card.source !== 'sensor' && context.rpe == null)
  if (isEffortPrompt && context.rpe == null && input.missingInputs.includes('sensor')) {
    return {
      kind: 'rpe',
      title: language === 'th' ? 'เพิ่มความหนักของเกม' : 'Add effort',
      help:
        language === 'th'
          ? 'ไม่บังคับ: 1 เบา, 5 คงที่, 10 สุดแรง'
          : 'Optional: 1 easy, 5 steady, 10 max.',
      initialRpe: context.rpe,
      cancelLabel: language === 'th' ? 'ยกเลิก' : 'Cancel',
    }
  }
  const requiredStatKeys = STAT_REQUIREMENTS_BY_CARD_ID[input.card.id]
  if (requiredStatKeys) {
    const missingStatKeys = requiredStatKeys.filter((key) => !hasStatValue(context.basketballStats, key))
    if (missingStatKeys.length > 0) {
      const missingLabel = missingStatKeys.map((key) => STAT_LABELS[key] ?? String(key)).join(' / ')
      return {
        kind: 'statline',
        title: language === 'th' ? 'เพิ่มสถิติก่อนอ่าน' : 'Add stats to read',
        help:
          language === 'th'
            ? `ต้องมี ${missingLabel} ก่อนอ่านหัวข้อนี้`
            : `${missingLabel} required for this read.`,
        initialStats: context.basketballStats,
        statKeys: requiredStatKeys,
        requiredStatKeys,
        saveLabel: language === 'th' ? 'บันทึกแล้วอ่าน' : 'Save and read',
        cancelLabel: language === 'th' ? 'ยกเลิก' : 'Cancel',
      }
    }
  }
  return null
}

export function getCoachDisplayCards(input: {
  cards: CoachInsightCard[]
  context: CoachInputSignalState | CoachActivityContextState | null | undefined
  missingInputs: Array<'context' | 'sensor' | 'history'>
  hasPro?: boolean
  language?: AppLanguage
}): CoachInsightCard[] {
  return getCoachDisplayDeck(input).visibleCards
}

export function getCoachDisplayDeck(input: {
  cards: CoachInsightCard[]
  context: CoachInputSignalState | CoachActivityContextState | null | undefined
  missingInputs: Array<'context' | 'sensor' | 'history'>
  hasPro?: boolean
  language?: AppLanguage
}): { visibleCards: CoachInsightCard[]; moreCards: CoachInsightCard[] } {
  const context = mergeCoachContextPatch(input.context, {})
  const language = input.language ?? 'en'
  const inputCards = input.cards.filter(
    (card) =>
      !UNSUPPORTED_COACH_CARD_IDS.has(card.id) &&
      card.type !== 'relic',
  )
  const statPromptCards = buildStatTopicCards(inputCards, context, language)
  const baseCards = dedupeCoachCardsByTopic(
    [...inputCards, ...statPromptCards],
    context.role,
    language,
  )
  const promptCards: CoachInsightCard[] = []

  const hasEffortCard = baseCards.some((card) => card.type === 'effort')
  if (context.role && !hasEffortCard && context.rpe == null && input.missingInputs.includes('sensor')) {
    promptCards.push({
      id: 'coach_prompt_effort',
      type: 'effort',
      title: language === 'th' ? 'เพิ่มความหนักของเกม' : 'Add effort read',
      body:
        language === 'th'
          ? 'บอกว่าแมตช์นี้หนักแค่ไหน เมื่อไม่มีข้อมูลจากวอช'
          : 'Tell Rally how hard it felt when watch data is not available.',
      severity: 'neutral',
      locked: false,
      source: 'context',
    })
  }

  const baseInputCards = baseCards
    .map((card) => ({
      card,
      priority: getCardInputPriority(
        getCoachCardFollowUpPrompt({
          card,
          context,
          missingInputs: input.missingInputs,
          language,
        })?.kind ?? null,
      ),
    }))
    .filter((item) => item.priority < Number.POSITIVE_INFINITY)
    .sort((a, b) => a.priority - b.priority)
    .map((item) => item.card)
  const baseInputIds = new Set(baseInputCards.map((card) => card.id))
  const analysisCards = baseCards.filter((card) => !baseInputIds.has(card.id))

  const visibleAnalysisCards: CoachInsightCard[] = []
  const moreCards: CoachInsightCard[] = []
  for (const card of analysisCards) {
    if (isCoachCardVisibleForRole(card, context.role)) visibleAnalysisCards.push(card)
    else moreCards.push(card)
  }

  return {
    visibleCards: [...promptCards, ...baseInputCards, ...visibleAnalysisCards],
    moreCards,
  }
}

export function localizeCoachInsightCard(
  card: CoachInsightCard,
  language: AppLanguage = 'en',
): CoachInsightCard {
  if (isStatInputPromptCard(card)) {
    return {
      ...card,
      title: language === 'th' ? 'เพิ่มสถิติก่อนอ่าน' : 'Add stats to read',
      body: language === 'th' ? STAT_INPUT_PROMPT_BODY_TH : STAT_INPUT_PROMPT_BODY_EN,
    }
  }
  const copy = language === 'th' ? THAI_CARD_COPY[card.id] : ENGLISH_CARD_COPY[card.id]
  if (card.locked) {
    return {
      ...card,
      title: copy?.title ?? card.title,
      body:
        language === 'th'
          ? 'ปลดล็อก Pro เพื่ออ่านการ์ดนี้'
          : 'Unlock Pro to read this coach card.',
    }
  }
  if (!copy) return card
  const groundedBody = groundedCoachCardBody(card, language)
  return {
    ...card,
    title: copy.title,
    body: groundedBody ?? localizeCoachCardBody(card, copy, language),
  }
}

export function shouldShowCoachSensorSyncInCard(card: CoachInsightCard): boolean {
  return card.type === 'effort'
}

function getCardInputPriority(kind: CoachCardFollowUpPrompt['kind'] | null): number {
  if (kind === 'rpe') return 20
  return Number.POSITIVE_INFINITY
}

function isCoachCardVisibleForRole(card: CoachInsightCard, role: BasketballRole | null): boolean {
  if (GLOBAL_COACH_CARD_IDS.has(card.id)) return true
  if (card.id.startsWith('head_to_head_')) return true
  if (!role) return true
  return ROLE_RELEVANT_CARD_IDS[role].has(card.id)
}

function buildStatTopicCards(
  cards: CoachInsightCard[],
  context: CompleteCoachInputSignalState,
  language: AppLanguage,
): CoachInsightCard[] {
  if (!context.role) return []
  const existingIds = new Set(cards.map((card) => card.id))
  const signatureIds = ROLE_SIGNATURE_CARD_IDS[context.role].filter((id) => !existingIds.has(id))
  const moreIds = EXTRA_STAT_TOPIC_CARD_IDS.filter((id) => !signatureIds.includes(id) && !existingIds.has(id))

  // Role-signature ids are the ones that surface as visible cards. When a
  // role has multiple signature ids (e.g. Big: rebounds + paint defense)
  // and the statline is empty, only show ONE "add stats" prompt instead of
  // one per gated topic — the first gated signature card wins; later gated
  // signature ids stay hidden until the first one is no longer gated.
  const result: CoachInsightCard[] = []
  let usedSignaturePromptSlot = false
  for (const id of signatureIds) {
    const isGated = getMissingRequiredStats(id, context.basketballStats).length > 0
    if (isGated) {
      if (usedSignaturePromptSlot) continue
      usedSignaturePromptSlot = true
    }
    result.push(buildStatTopicCard(id, context.basketballStats, language))
  }

  // Off-role topics always render (they land in "more reads", not the
  // visible set, so duplicate prompt cards there aren't user-facing noise).
  for (const id of moreIds) {
    result.push(buildStatTopicCard(id, context.basketballStats, language))
  }

  return result
}

function buildStatTopicCard(
  id: string,
  stats: BasketballStatLine,
  language: AppLanguage,
): CoachInsightCard {
  if (getMissingRequiredStats(id, stats).length > 0) return buildStatInputPromptCard(id, language)

  const result = buildStatTopicResult(id, stats, language)
  if (result) return result
  return buildStatInputPromptCard(id, language)
}

function buildStatInputPromptCard(id: string, language: AppLanguage): CoachInsightCard {
  return {
    id,
    type: 'training_cue',
    title: language === 'th' ? 'เพิ่มสถิติก่อนอ่าน' : 'Add stats to read',
    body: language === 'th' ? STAT_INPUT_PROMPT_BODY_TH : STAT_INPUT_PROMPT_BODY_EN,
    severity: 'neutral',
    locked: false,
    source: 'context',
  }
}

function buildStatTopicResult(
  id: string,
  stats: BasketballStatLine,
  language: AppLanguage,
): CoachInsightCard | null {
  const points = stats.points
  const rebounds = stats.rebounds
  const assists = stats.assists
  const steals = stats.steals
  const blocks = stats.blocks
  const twos = stats.twoPointersMade
  const threes = stats.threePointersMade
  const freeThrows = stats.freeThrowsMade

  switch (id) {
    case 'cue_handler_playmaking_balance':
      if (assists == null) return null
      {
        const metrics: Record<string, string | number | null> = { assists }
        return {
          id,
          type: 'training_cue',
          title: 'Playmaking balance',
          body: language === 'th'
            ? thaiPlaymakingBody(assists)
            : englishPlaymakingBody(assists),
          severity: assists > 0 ? 'positive' : 'neutral',
          locked: false,
          metrics,
          source: 'context',
        }
      }
    case 'cue_shooter_scoring_profile':
      if (points == null) return null
      {
        const metrics: Record<string, number> = { points }
        if (twos != null) {
          metrics.two_pointers_made = twos
        }
        if (threes != null) {
          metrics.three_pointers_made = threes
        }
        if (freeThrows != null) {
          metrics.free_throws_made = freeThrows
        }
        return {
          id,
          type: 'training_cue',
          title: 'Scoring profile',
          body: language === 'th'
            ? thaiShooterScoringBody(points, twos, threes, freeThrows)
            : englishShooterScoringBody(points, twos, threes, freeThrows),
          severity: points <= SHOOTER_POINTS_WARNING_THRESHOLD ? 'warning' : 'positive',
          locked: false,
          metrics,
          source: 'context',
        }
      }
    case 'cue_defender_stat_impact':
      if (steals == null && blocks == null) return null
      {
        // Partial statline: missing side reads as 0 rather than blocking the card.
        const stealsValue = steals ?? 0
        const blocksValue = blocks ?? 0
        return {
          id,
          type: 'training_cue',
          title: 'Defensive stat impact',
          body: language === 'th'
            ? thaiDefenderStatsBody(stealsValue, blocksValue)
            : englishDefenderStatsBody(stealsValue, blocksValue),
          severity: stealsValue + blocksValue > 0 ? 'positive' : 'warning',
          locked: false,
          metrics: { steals: stealsValue, blocks: blocksValue },
          source: 'context',
        }
      }
    case 'cue_big_rebounds':
      if (rebounds == null) return null
      return {
        id,
        type: 'training_cue',
        title: 'Rebounding',
        body: language === 'th'
          ? thaiBigReboundBody(rebounds)
          : englishBigReboundBody(rebounds),
        severity: rebounds >= BIG_REBOUND_WARNING_THRESHOLD ? 'positive' : 'warning',
        locked: false,
        metrics: { rebounds },
        source: 'context',
      }
    case 'cue_big_paint_defense_stats':
      if (blocks == null) return null
      return {
        id,
        type: 'training_cue',
        title: 'Paint defense stats',
        body: language === 'th'
          ? thaiBigBlockBody(blocks)
          : englishBigBlockBody(blocks),
        severity: blocks > 0 ? 'positive' : 'warning',
        locked: false,
        metrics: { blocks },
        source: 'context',
      }
    case 'cue_all_around_balance':
      if (points == null && rebounds == null && assists == null) return null
      {
        // Partial statline: render only the lanes that were logged, '—' for the rest.
        const metrics: Record<string, number> = {}
        if (points != null) metrics.points = points
        if (rebounds != null) metrics.rebounds = rebounds
        if (assists != null) metrics.assists = assists
        return {
          id,
          type: 'training_cue',
          title: 'Stat balance',
          body: language === 'th'
            ? thaiAllAroundBody(points ?? null, rebounds ?? null, assists ?? null)
            : englishAllAroundBody(points ?? null, rebounds ?? null, assists ?? null),
          severity: (points ?? 0) > 0 && (rebounds ?? 0) > 0 && (assists ?? 0) > 0 ? 'positive' : 'warning',
          locked: false,
          metrics,
          source: 'context',
        }
      }
    case 'cue_free_throws':
      if (freeThrows == null) return null
      return {
        id,
        type: 'training_cue',
        title: 'Free throw points',
        body: language === 'th'
          ? thaiFreeThrowBody(freeThrows)
          : englishFreeThrowBody(freeThrows),
        severity: freeThrows > 0 ? 'positive' : 'neutral',
        locked: false,
        metrics: { free_throws_made: freeThrows },
        source: 'context',
      }
    default:
      return null
  }
}

function englishPlaymakingBody(assists: number): string {
  return `Good: ${assists} assists logged. AST is the main Creator signal; compare it with PTS, REB, BLK, and made threes.`
}

function thaiPlaymakingBody(assists: number): string {
  return `ดี: AST ${assists} คือสัญญาณหลักของการสร้างแต้ม เทียบกับ PTS, REB, BLK และสามแต้ม`
}

function englishShooterScoringBody(
  points: number,
  twos: number | undefined,
  threes: number | undefined,
  freeThrows: number | undefined,
): string {
  const parts = [`${points} ${plural(points, 'point')}`]
  if (twos != null) parts.push(`${twos} 2PT ${plural(twos, 'make')}`)
  if (threes != null) parts.push(`${threes} made ${plural(threes, 'three')}`)
  if (freeThrows != null) parts.push(`${freeThrows} made ${plural(freeThrows, 'free throw')}`)
  if (points <= SHOOTER_POINTS_WARNING_THRESHOLD) {
    return `Needs work: ${parts.join(', ')} recorded for Shooter. Next match, hunt one clean catch-and-shoot or free-throw touch early.`
  }
  return `Good: ${parts.join(', ')} recorded. Your scoring role showed up.`
}

function thaiShooterScoringBody(
  points: number,
  twos: number | undefined,
  threes: number | undefined,
  freeThrows: number | undefined,
): string {
  const parts = [`PTS ${points}`]
  if (twos != null) parts.push(`2PT ${twos}`)
  if (threes != null) parts.push(`3PM ${threes}`)
  if (freeThrows != null) parts.push(`FT ${freeThrows}`)
  if (points <= SHOOTER_POINTS_WARNING_THRESHOLD) {
    return `ต้องแก้: ${parts.join(', ')} สำหรับ Shooter ยังน้อย; เกมหน้าหา catch-and-shoot หรือแต้มจาก FT ให้เร็วขึ้น`
  }
  return `ดี: ${parts.join(', ')} บทบาททำแต้มขึ้นมาใน statline`
}

function englishDefenderStatsBody(steals: number, blocks: number): string {
  if (steals + blocks === 0) {
    return `Needs work: ${steals} ${plural(steals, 'steal')} and ${blocks} ${plural(blocks, 'block')} recorded. That is no defensive event in the statline; chase at least one disruption next match.`
  }
  return `Good: ${steals} ${plural(steals, 'steal')} and ${blocks} ${plural(blocks, 'block')} recorded. Defensive events showed up.`
}

function thaiDefenderStatsBody(steals: number, blocks: number): string {
  if (steals + blocks === 0) {
    return `ต้องแก้: STL ${steals}, BLK ${blocks} แปลว่ายังไม่มี defensive event ใน statline; เกมหน้าไล่ให้ได้อย่างน้อย 1 จังหวะ`
  }
  return `ดี: STL ${steals}, BLK ${blocks} เกมรับมี event ให้เห็นใน statline`
}

function englishBigReboundBody(rebounds: number): string {
  if (rebounds >= BIG_REBOUND_WARNING_THRESHOLD) {
    return `Good: REB ${rebounds} (${rebounds} ${plural(rebounds, 'rebound')}) for Big. Your inside work showed up clearly.`
  }
  return `Needs work: REB ${rebounds} (${rebounds} ${plural(rebounds, 'rebound')}) is light for Big. Next match, make box-out and second-jump rebounds the first target.`
}

function thaiBigReboundBody(rebounds: number): string {
  if (rebounds >= BIG_REBOUND_WARNING_THRESHOLD) return `ดี: REB ${rebounds} สำหรับ Big งานใต้แป้นชัดเจน`
  return `ต้องแก้: REB ${rebounds} ยังเบาสำหรับ Big; เกมหน้าโฟกัส box-out และ second jump ก่อน`
}

function englishBigBlockBody(blocks: number): string {
  if (blocks > 0) return `Good: ${blocks} ${plural(blocks, 'block')} logged from BLK. Rim protection showed up.`
  return 'Needs work: 0 blocks logged for Big. Rally cannot see contests yet, so use BLK as the blunt rim-protection signal.'
}

function thaiBigBlockBody(blocks: number): string {
  if (blocks > 0) return `ดี: BLK ${blocks} การป้องกันห่วงมีตัวเลขให้เห็น`
  return 'ต้องแก้: BLK 0 สำหรับ Big; Rally ยังไม่เห็น contest จึงใช้ BLK เป็นสัญญาณตรงของ rim protection'
}

function englishAllAroundBody(points: number | null, rebounds: number | null, assists: number | null): string {
  const stats = `PTS ${points ?? '—'}, REB ${rebounds ?? '—'}, AST ${assists ?? '—'}`
  const lanes = [points, rebounds, assists].filter((value) => value != null && value > 0).length
  if (lanes >= 3) return `Good: ${stats}. You helped in all three main lanes.`
  return `Needs work: ${stats}. Add one more positive lane next match.`
}

function thaiAllAroundBody(points: number | null, rebounds: number | null, assists: number | null): string {
  const stats = `PTS ${points ?? '—'}, REB ${rebounds ?? '—'}, AST ${assists ?? '—'}`
  const lanes = [points, rebounds, assists].filter((value) => value != null && value > 0).length
  if (lanes >= 3) return `ดี: ${stats} ช่วยทีมครบสามทางหลัก`
  return `ต้องแก้: ${stats}; เกมหน้าเพิ่มอีกหนึ่ง lane ให้เป็นบวก`
}

function englishFreeThrowBody(freeThrows: number): string {
  if (freeThrows > 0) return `Good: ${freeThrows} made ${plural(freeThrows, 'free throw')} logged from FT. Keep taking the easy points when contact comes.`
  return 'No made free throws recorded. Rally cannot tell whether you attempted any, so this is no-score data, not a miss read.'
}

function thaiFreeThrowBody(freeThrows: number): string {
  if (freeThrows > 0) return `ดี: FT ${freeThrows} มีแต้มจากลูกโทษ`
  return 'ยังไม่มี FT ที่ลง: Rally ยังไม่รู้ว่ามี attempts ไหม จึงไม่สรุปว่าเป็นการพลาด'
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`
}

function getMissingRequiredStats(cardId: string, stats: BasketballStatLine): BasketballStatKey[] {
  const required = STAT_REQUIREMENTS_BY_CARD_ID[cardId] ?? []
  const missing = required.filter((key) => !hasStatValue(stats, key))
  if (ANY_OF_STAT_REQUIREMENT_CARD_IDS.has(cardId)) {
    // Any-of: only gated when every listed stat is absent.
    return missing.length === required.length ? missing : []
  }
  return missing
}

function hasStatValue(stats: BasketballStatLine, key: BasketballStatKey): boolean {
  return typeof stats[key] === 'number'
}

function isStatInputPromptCard(card: CoachInsightCard): boolean {
  return card.body === STAT_INPUT_PROMPT_BODY_EN ||
    card.body === STAT_INPUT_PROMPT_BODY_TH ||
    (
      card.source === 'context' &&
      card.metrics == null &&
      (card.title === 'Add stats to read' || card.title === 'เพิ่มสถิติก่อนอ่าน')
    )
}

function groundedCoachCardBody(card: CoachInsightCard, language: AppLanguage): string | null {
  if (card.type !== 'training_cue' || Object.keys(card.metrics ?? {}).length === 0) return null
  if (card.source === 'context') return language === 'en' ? card.body : null
  if (card.source === 'sensor' && card.id === 'sensor_coach_read') {
    return language === 'en' ? card.body : thaiSensorCoachReadBody(card)
  }
  if (card.source !== 'benchmark') return null
  if (language === 'en') return card.body
  return thaiBenchmarkBody(card)
}

function thaiSensorCoachReadBody(card: CoachInsightCard): string {
  const role = getStringMetric(card, 'role')
  const intensity = getNumericMetric(card, 'intensity_score')
  const intensityDelta = getNumericMetric(card, 'intensity_delta_percent')
  const steps = getNumericMetric(card, 'steps')
  const hrCoverage = getNumericMetric(card, 'heart_rate_coverage_seconds')
  const cadenceHigh = getNumericMetric(card, 'cadence_high_seconds')
  const points = getNumericMetric(card, 'points')
  const assists = getNumericMetric(card, 'assists')
  const rebounds = getNumericMetric(card, 'rebounds')
  const sensorConfidence = getStringMetric(card, 'sensor_confidence')
  const courtEffort = getStringMetric(card, 'court_mode_effort')
  const courtFootwork = getStringMetric(card, 'court_mode_footwork')
  const courtMovement = getStringMetric(card, 'court_mode_movement')
  const roleLabel = benchmarkRoleLabel(role)
  const signals = [
    intensity != null ? `Intensity ${Math.round(intensity)}` : null,
    intensityDelta != null ? `เทียบปกติ ${intensityDelta >= 0 ? '+' : ''}${Math.round(intensityDelta)}%` : null,
    steps != null ? `${Math.round(steps).toLocaleString()} steps` : null,
    cadenceHigh != null && cadenceHigh > 0 ? `high-cadence ${Math.round(cadenceHigh / 60)} นาที` : null,
  ].filter((value): value is string => Boolean(value))
  const coverage = thaiSensorConfidence(sensorConfidence, hrCoverage)
  const courtCue = thaiCourtModeSensorCue({ courtEffort, courtFootwork, courtMovement, role })
  const prefix = `${roleLabel}: ${signals.join(', ')} และ ${coverage}`
  if (role === 'handler' && (points != null || assists != null)) {
    const mainStats = [
      points != null ? `PTS ${points}` : null,
      assists != null ? `AST ${assists}` : null,
      rebounds != null ? `REB ${rebounds}` : null,
    ].filter((value): value is string => Boolean(value)).join(', ')
    return joinThaiCoachClauses([
      prefix,
      courtCue,
      `Creator read เริ่มจาก ${mainStats}`,
    ])
  }
  if (role === 'shooter' && courtMovement === 'missing' && points != null && points <= SHOOTER_POINTS_WARNING_THRESHOLD) {
    return joinThaiCoachClauses([
      prefix,
      courtCue,
      `Shooter: PTS ${points} ต่ำและ movement ต่ำ รอบหน้าขยับหลัง pass/drive ให้มากขึ้น แล้วหา catch-and-shoot ง่ายให้เร็ว`,
    ])
  }
  if (role === 'shooter' && points != null && points <= SHOOTER_POINTS_WARNING_THRESHOLD) {
    return joinThaiCoachClauses([
      prefix,
      courtCue,
      `PTS ${points} ยังน้อยสำหรับบทบาททำแต้ม รอบหน้าเริ่มจากหาช็อตง่ายให้เร็วขึ้น`,
    ])
  }
  if (role === 'big' && rebounds != null && rebounds >= BIG_REBOUND_WARNING_THRESHOLD) {
    return joinThaiCoachClauses([
      prefix,
      courtCue,
      `REB ${rebounds} แปลว่าแรงที่ใช้กลายเป็น possession จริง`,
    ])
  }
  return joinThaiCoachClauses([
    prefix,
    courtCue,
    'ใช้ข้อมูลนี้เทียบกับสถิติที่กรอก เพื่อดูว่าแรงที่ใช้กลายเป็น impact จริงแค่ไหน',
  ])
}

function thaiSensorConfidence(confidence: string | null, hrCoverage: number | null): string {
  if (confidence === 'high' || (hrCoverage != null && hrCoverage >= 360)) {
    return 'ข้อมูลแรงมั่นใจสูง เพราะ HR coverage แน่น'
  }
  if (confidence === 'partial_hr' || (hrCoverage != null && hrCoverage > 0)) {
    return 'ข้อมูลแรงมั่นใจกลาง เพราะ HR coverage มีบางส่วน'
  }
  return 'อ่านได้เฉพาะ movement; ยังไม่สรุปความหนักเต็ม'
}

function thaiCourtModeSensorCue({
  courtEffort,
  courtFootwork,
  courtMovement,
  role,
}: {
  courtEffort: string | null
  courtFootwork: string | null
  courtMovement: string | null
  role: string | null
}): string | null {
  if (courtEffort === 'passed' && courtFootwork !== 'passed') {
    return 'Effort ผ่าน แต่ Footwork ยังไม่ผ่าน: อาจเป็นเกมชนหรือยืนเยอะ ไม่ใช่เกมเคลื่อนที่ชัด'
  }
  if (courtFootwork === 'passed') {
    return 'Footwork ผ่าน: วันนี้มี movement/footwork พอ'
  }
  if (role === 'shooter' && courtMovement === 'missing') {
    return 'Movement ต่ำสำหรับ Shooter: รอบหน้าขยับหลัง pass/drive ให้มากขึ้น'
  }
  return null
}

function joinThaiCoachClauses(clauses: Array<string | null>): string {
  return clauses.filter((clause): clause is string => Boolean(clause)).join('; ')
}

function dedupeCoachCardsByTopic(
  cards: CoachInsightCard[],
  role: BasketballRole | null,
  language: AppLanguage,
): CoachInsightCard[] {
  const byTopic = new Map<string, CoachInsightCard>()
  for (const card of cards) {
    const topic = getCoachInsightHeaderTitle(card, false, language)
    const existing = byTopic.get(topic)
    if (!existing || getCardTopicSpecificity(card, role) > getCardTopicSpecificity(existing, role)) {
      byTopic.set(topic, card)
    }
  }
  return cards.filter((card) => byTopic.get(getCoachInsightHeaderTitle(card, false, language)) === card)
}

function getCardTopicSpecificity(card: CoachInsightCard, role: BasketballRole | null): number {
  if (role && card.id.startsWith(`cue_${role}_`)) return 40
  if (card.id.startsWith('cue_') && card.source === 'context') return 20
  if (card.id.startsWith('cue_')) return 10
  return 0
}

export function getCoachContextInitial(
  input: CoachActivityContextState | null | undefined,
): CompleteCoachInputSignalState | undefined {
  if (!input) return undefined
  return {
    role: input.role,
    resultTags: [],
    detailTags: [],
    focusTag: null,
    rpe: input.rpe,
    basketballStats: sanitizePlayerFacingBasketballStats(input.basketballStats),
  }
}

function localizeCoachCardBody(
  card: CoachInsightCard,
  copy: { title: string; body?: string },
  language: AppLanguage,
): string {
  if (language !== 'th') return copy.body ?? card.body

  if (card.id === 'low_data') {
    const logged = getNumericMetric(card, 'matches_logged')
    const target = getNumericMetric(card, 'matches_needed')
    const need = logged != null && target != null ? Math.max(0, target - logged) : null
    if (need === 1) return 'อีก 1 แมตช์ปลดล็อกแนวโน้มฟอร์ม'
    if (need != null) return `อีก ${need} แมตช์ปลดล็อกแนวโน้มฟอร์ม`
  }

  if (card.id === 'form_last5') {
    const wins = getNumericMetric(card, 'wins') ?? 0
    const losses = getNumericMetric(card, 'losses') ?? 0
    const ties = getNumericMetric(card, 'ties') ?? 0
    const avgMargin = getNumericMetric(card, 'avg_margin_last_5')
    const marginText = avgMargin == null ? '' : ` แต้มต่างเฉลี่ย ${avgMargin > 0 ? '+' : ''}${avgMargin}`
    return `ฟอร์มล่าสุด: ชนะ ${wins} แพ้ ${losses} เสมอ ${ties}${marginText}`
  }

  if (card.id === 'effort_rpe') {
    const rpe = getNumericMetric(card, 'rpe')
    if (rpe != null) return `RPE ${rpe}/10: ใช้เทียบความหนักกับแมตช์ถัดไป`
  }

  if (card.id === 'cue_handler_playmaking_balance') {
    const assists = getNumericMetric(card, 'assists')
    if (assists != null) return thaiPlaymakingBody(assists)
  }

  if (card.id === 'cue_shooter_scoring_profile') {
    const points = getNumericMetric(card, 'points')
    const twos = getNumericMetric(card, 'two_pointers_made')
    const threes = getNumericMetric(card, 'three_pointers_made')
    const freeThrows = getNumericMetric(card, 'free_throws_made')
    if (points != null) {
      return thaiShooterScoringBody(points, twos ?? undefined, threes ?? undefined, freeThrows ?? undefined)
    }
  }

  if (card.id === 'cue_defender_stat_impact') {
    const steals = getNumericMetric(card, 'steals')
    const blocks = getNumericMetric(card, 'blocks')
    if (steals != null && blocks != null) {
      return thaiDefenderStatsBody(steals, blocks)
    }
  }

  if (card.id === 'cue_big_rebounds') {
    const rebounds = getNumericMetric(card, 'rebounds')
    if (rebounds != null) return thaiBigReboundBody(rebounds)
  }

  if (card.id === 'cue_big_paint_defense_stats') {
    const blocks = getNumericMetric(card, 'blocks')
    if (blocks != null) return thaiBigBlockBody(blocks)
  }

  if (card.id === 'cue_all_around_balance') {
    const points = getNumericMetric(card, 'points')
    const rebounds = getNumericMetric(card, 'rebounds')
    const assists = getNumericMetric(card, 'assists')
    if (points != null || rebounds != null || assists != null) {
      return thaiAllAroundBody(points, rebounds, assists)
    }
  }

  if (card.id === 'cue_free_throws') {
    const freeThrows = getNumericMetric(card, 'free_throws_made')
    if (freeThrows != null) return thaiFreeThrowBody(freeThrows)
  }

  return copy.body ?? card.body
}

function thaiBenchmarkBody(card: CoachInsightCard): string | null {
  const metric = benchmarkMetricForCardId(card.id)
  if (!metric) return null
  const current = getNumericMetric(card, 'current')
  const benchmark = getNumericMetric(card, 'benchmark')
  const band = getStringMetric(card, `comparison_${metric}_band`)
  const unit = getStringMetric(card, `comparison_${metric}_unit`) ?? benchmarkUnitForCardId(card.id)
  const role = getStringMetric(card, 'benchmark_role')
  const roleLabel = benchmarkRoleLabel(role)
  if (current == null || benchmark == null) return null

  if (band === 'above_role_scale') {
    return `ดี: ${unit} ${current} สูงกว่า benchmark ของ ${roleLabel} (${benchmark} ${unit}); เกมหน้ารักษาคุณภาพจังหวะให้ได้`
  }
  if (band === 'below_role_scale') {
    return `ต้องแก้: ${unit} ${current} ต่ำกว่า benchmark ของ ${roleLabel} (${benchmark} ${unit}); เกมหน้าหาแต้มคุณภาพเพิ่มให้ชัด`
  }
  if (band === 'near_role_scale') {
    return `ใกล้เคียง: ${unit} ${current} อยู่ใกล้ benchmark ของ ${roleLabel} (${benchmark} ${unit}); เกมหน้าขยับอีกหนึ่งจังหวะให้ชัด`
  }
  return `${unit} ${current}: มีข้อมูลแล้ว แต่ยังเทียบ benchmark ไม่ครบ`
}

function benchmarkMetricForCardId(cardId: string): 'points' | 'assists' | 'rebounds' | null {
  if (cardId === 'web_benchmark_nba_points') return 'points'
  if (cardId === 'web_benchmark_nba_assists') return 'assists'
  if (cardId === 'web_benchmark_nba_rebounds') return 'rebounds'
  return null
}

function benchmarkUnitForCardId(cardId: string): string {
  if (cardId === 'web_benchmark_nba_assists') return 'AST'
  if (cardId === 'web_benchmark_nba_rebounds') return 'REB'
  return 'PTS'
}

function benchmarkRoleLabel(role: string | null): string {
  if (role === 'handler') return 'Handler'
  if (role === 'shooter') return 'Shooter'
  if (role === 'defender') return 'Defender'
  if (role === 'big') return 'Big'
  if (role === 'all_around') return 'All-around'
  return 'ผู้เล่น'
}

function getNumericMetric(card: CoachInsightCard, key: string): number | null {
  const value = card.metrics?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getStringMetric(card: CoachInsightCard, key: string): string | null {
  const value = card.metrics?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}
