import type { HomeViewProps } from '@/components/home/HomeView'
import type { QuestTemplateView } from '@/lib/quest-proof/questProofTypes'
import promoLight from '../../assets/images/home/figma-new-home-promo-light.png'
import promoDark from '../../assets/images/home/figma-new-home-promo-dark.png'

export const HOME_STORY_STATES = [
  'ready',
  'no_venue',
  'no_point_delta',
  'wallet_loading',
  'wallet_unavailable',
  'empty_missions',
  'missions_loading',
  'missions_syncing',
  'missions_sync_failed',
  'missions_proof_needed',
  'missions_complete',
] as const

export type HomeStoryState = (typeof HOME_STORY_STATES)[number]

type HomeStoryFixture = Pick<
  HomeViewProps,
  'refreshing' | 'wallet' | 'heroSlides' | 'quests' | 'identity' | 'otaUpdate'
>

function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child)
    Object.freeze(value)
  }
  return value
}

const runningQuest = freezeDeep<QuestTemplateView>({
  templateId: 'storybook-running-distance',
  slug: 'storybook-running-distance',
  activity: 'running',
  lane: 'move',
  verifier: 'sensor_sync',
  titleTH: 'เดินหรือวิ่ง 7 กม.',
  requirementTH: 'สะสมระยะทาง 7 กม.',
  ctaTH: 'เริ่มภารกิจ',
  evidenceTH: 'ซิงก์กิจกรรม',
  targetTH: '',
  rewardPoints: 50,
  attemptsPerDay: 1,
  accentColor: '#0fa968',
  icon: 'run',
  timeLimitSeconds: null,
  startable: true,
  needsCapture: false,
  captureMedia: null,
})

const basketballQuest = freezeDeep<QuestTemplateView>({
  ...runningQuest,
  templateId: 'storybook-basketball-shot',
  slug: 'storybook-basketball-shot',
  activity: 'basketball',
  verifier: 'capture_audit',
  titleTH: 'ชู้ตบาส 30 ลูก',
  requirementTH: 'สะสมชู้ตให้ครบ 30 ลูก',
  evidenceTH: 'ยืนยันกับเพื่อน',
  rewardPoints: 40,
  accentColor: '#ff8e28',
  icon: 'basketball',
})

const badmintonQuest = freezeDeep<QuestTemplateView>({
  ...runningQuest,
  templateId: 'storybook-badminton-rally',
  slug: 'storybook-badminton-rally',
  activity: 'badminton',
  verifier: 'capture_audit',
  titleTH: 'ตีโต้ 50 ครั้ง',
  requirementTH: 'ตีโต้ให้ครบ 50 ครั้ง',
  evidenceTH: 'ยืนยันกับเพื่อน',
  rewardPoints: 40,
  accentColor: '#6155f5',
  icon: 'badminton',
})

const baseFixture = freezeDeep<HomeStoryFixture>({
  refreshing: false,
  wallet: { walletPoints: 1280, walletStatus: 'ready', pointsDelta: 18 },
  heroSlides: [
    {
      id: 'new-home-promo',
      kicker: 'RALLY',
      title: 'Rally promotion',
      body: '',
      icon: 'run',
      imageSource: promoLight,
      darkImageSource: promoDark,
      tone: 'orange',
      visualOnly: true,
    },
  ],
  quests: {
    views: [runningQuest, basketballQuest, badmintonQuest],
    loading: false,
    dailyWalkSyncing: false,
    dailyWalkDistanceMeters: 3200,
    dailyWalkSteps: 4580,
    dailyState: {},
  },
  identity: {
    displayName: 'RALLY PLAYER',
    rallyId: '1234567890',
    venueName: 'Benjasiri Park',
    avatarUrl: null,
    notificationUnread: true,
    notificationLabel: 'Notifications',
    profileLabel: 'Profile',
  },
  otaUpdate: null,
})

export const HOME_STORY_FIXTURES: Record<HomeStoryState, HomeStoryFixture> = freezeDeep({
  ready: baseFixture,
  no_venue: {
    ...baseFixture,
    identity: { ...baseFixture.identity, venueName: null },
  },
  no_point_delta: {
    ...baseFixture,
    wallet: { ...baseFixture.wallet, pointsDelta: null },
  },
  wallet_loading: {
    ...baseFixture,
    wallet: { walletPoints: 0, walletStatus: 'loading', pointsDelta: null },
  },
  wallet_unavailable: {
    ...baseFixture,
    wallet: { walletPoints: 0, walletStatus: 'unavailable', pointsDelta: null },
  },
  empty_missions: {
    ...baseFixture,
    quests: {
      ...baseFixture.quests,
      views: [],
      loading: false,
    },
  },
  missions_loading: {
    ...baseFixture,
    quests: { ...baseFixture.quests, views: [], loading: true },
  },
  missions_syncing: {
    ...baseFixture,
    quests: { ...baseFixture.quests, dailyWalkSyncing: true },
  },
  missions_sync_failed: {
    ...baseFixture,
    quests: { ...baseFixture.quests, dailyWalkSyncFailed: true },
  },
  missions_proof_needed: {
    ...baseFixture,
    quests: {
      ...baseFixture.quests,
      dailyState: {
        'storybook-basketball-shot': { status: 'needs_review', doneToday: false, attemptsUsed: 1, grantedToday: 0 },
      },
    },
  },
  missions_complete: {
    ...baseFixture,
    quests: {
      ...baseFixture.quests,
      dailyWalkDistanceMeters: 7000,
      dailyState: {
        'storybook-basketball-shot': { status: 'passed', doneToday: true, attemptsUsed: 1, grantedToday: 1 },
        'storybook-badminton-rally': { status: 'claimed', doneToday: true, attemptsUsed: 1, grantedToday: 1 },
      },
    },
  },
})
