import type { ProfileViewProps } from '@/components/profile/ProfileView'

export const PROFILE_STORY_STATES = ['new_player', 'experienced', 'identity_card_open', 'loading'] as const
export type ProfileStoryState = (typeof PROFILE_STORY_STATES)[number]

type ProfileFixture = Pick<ProfileViewProps, 'profile' | 'stats' | 'ratings' | 'positions' | 'checkedInToday'> & {
  cardOpen: boolean
  pins: []
}

export const PROFILE_STORY_FIXTURES: Record<Exclude<ProfileStoryState, 'loading'>, Readonly<ProfileFixture>> = {
  new_player: freezeDeep({
    cardOpen: false,
    profile: { displayName: 'Rookie Jay', idLabel: 'PLAYER #07', initials: 'J', avatarUrl: null, frameAssetRef: null, username: 'rookie-jay', nameId: 'ID.STORY007', classLabel: '—', rankingLabel: '—', guildLabel: '—', titleLabel: '—' },
    stats: { matches: 0, wins: 0, losses: 0, ties: 0 },
    ratings: [],
    positions: {},
    checkedInToday: false,
    pins: [],
  }),
  experienced: freezeDeep({
    cardOpen: false,
    profile: { displayName: 'Rally Player', idLabel: 'PLAYER #23', initials: 'R', avatarUrl: null, frameAssetRef: null, username: 'rally-player', nameId: 'ID.STORY023', classLabel: 'Basketball', rankingLabel: 'Silver', guildLabel: '—', titleLabel: 'Street Captain' },
    stats: { matches: 18, wins: 12, losses: 5, ties: 1 },
    ratings: [
      { activity: 'basketball', rating: 1240, tier: 'silver', matches: 14, wins: 9, losses: 5 },
      { activity: 'running', rating: 860, tier: 'bronze', matches: 4, wins: 3, losses: 1 },
    ],
    positions: { basketball: 'pg' },
    checkedInToday: true,
    pins: [],
  }),
  identity_card_open: freezeDeep({
    cardOpen: true,
    profile: { displayName: 'Rally Player', idLabel: 'PLAYER #23', initials: 'R', avatarUrl: null, frameAssetRef: null, username: 'rally-player', nameId: 'ID.STORY023', classLabel: 'Basketball', rankingLabel: 'Silver', guildLabel: '—', titleLabel: 'Street Captain' },
    stats: { matches: 18, wins: 12, losses: 5, ties: 1 },
    ratings: [
      { activity: 'basketball', rating: 1240, tier: 'silver', matches: 14, wins: 9, losses: 5 },
      { activity: 'running', rating: 860, tier: 'bronze', matches: 4, wins: 3, losses: 1 },
    ],
    positions: { basketball: 'pg' },
    checkedInToday: true,
    pins: [],
  }),
}

function freezeDeep<Value>(value: Value): Value {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeDeep(child)
    Object.freeze(value)
  }
  return value
}
