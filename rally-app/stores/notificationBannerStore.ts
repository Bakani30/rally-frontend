import { create } from 'zustand'

export type NotificationBannerKind = 'match_invited' | 'friend_request'

export type NotificationBanner = {
  id: string
  kind: NotificationBannerKind
  title: string
  body: string
  headline?: string | null
  actorName?: string | null
  subtitle?: string | null
  route: string
  matchId?: string | null
  inviteId?: string | null
  requesterId?: string | null
  avatarUrl?: string | null
  activityType?: string | null
  priority?: number
  dedupeKey?: string | null
  expiresAt?: number | null
  targetRoute?: string | null
}

export type NotificationBannerInput = Omit<NotificationBanner, 'id'> & {
  id?: string
}

type ShowBannerOptions = {
  expanded?: boolean
  expandedMode?: 'temporary' | 'pinned'
  priority?: number
  dedupeKey?: string | null
  ttlMs?: number | null
  expiresAt?: number | null
  targetRoute?: string | null
}

type NotificationBannerState = {
  current: NotificationBanner | null
  queue: NotificationBanner[]
  requestedExpandedBannerId: string | null
  expandedBannerMode: ShowBannerOptions['expandedMode'] | null
  showBanner: (banner: NotificationBannerInput, options?: ShowBannerOptions) => void
  dismissBanner: (id?: string) => void
  consumeExpandedRequest: (id?: string) => string | null
  pruneExpired: () => void
  clearAll: () => void
}

let nextBannerId = 0
const DEFAULT_PRIORITY = 50

export const useNotificationBannerStore = create<NotificationBannerState>((set, get) => ({
  current: null,
  queue: [],
  requestedExpandedBannerId: null,
  expandedBannerMode: null,
  showBanner(banner, options) {
    const nextBanner = normalizeBanner(banner, options)
    const now = Date.now()
    if (isExpired(nextBanner, now)) return

    set((state) => {
      let current = isExpired(state.current, now) ? null : state.current
      let queue = state.queue.filter((item) => !isExpired(item, now))

      if (nextBanner.dedupeKey) {
        if (current?.dedupeKey === nextBanner.dedupeKey) {
          current = nextBanner
        } else {
          queue = queue.filter((item) => item.dedupeKey !== nextBanner.dedupeKey)
        }
      }

      if (current?.id !== nextBanner.id) {
        if (!current) {
          current = nextBanner
        } else if (priorityOf(nextBanner) > priorityOf(current)) {
          queue = insertByPriority(queue, current)
          current = nextBanner
        } else {
          queue = insertByPriority(queue, nextBanner)
        }
      }

      return {
        current,
        queue,
        requestedExpandedBannerId: options?.expanded ? nextBanner.id : null,
        expandedBannerMode: options?.expanded
          ? options.expandedMode ?? 'temporary'
          : null,
      }
    })
  },
  dismissBanner(id) {
    const current = get().current
    if (!current) return
    if (id && current.id !== id) return
    set((state) => promoteNextBanner(state.queue))
  },
  consumeExpandedRequest(id) {
    const requestedExpandedBannerId = get().requestedExpandedBannerId
    if (!requestedExpandedBannerId) return null
    if (id && requestedExpandedBannerId !== id) return null
    set({ requestedExpandedBannerId: null })
    return requestedExpandedBannerId
  },
  pruneExpired() {
    const now = Date.now()
    set((state) => {
      if (!isExpired(state.current, now)) {
        return {
          queue: state.queue.filter((item) => !isExpired(item, now)),
        }
      }
      return promoteNextBanner(state.queue, now)
    })
  },
  clearAll() {
    set({
      current: null,
      queue: [],
      requestedExpandedBannerId: null,
      expandedBannerMode: null,
    })
  },
}))

function normalizeBanner(
  banner: NotificationBannerInput,
  options: ShowBannerOptions | undefined,
): NotificationBanner {
  const id = banner.id ?? `notification-banner-${nextBannerId + 1}`
  if (!banner.id) nextBannerId += 1
  const ttlMs = options?.ttlMs
  return {
    ...banner,
    id,
    priority: options?.priority ?? banner.priority ?? DEFAULT_PRIORITY,
    dedupeKey: options?.dedupeKey ?? banner.dedupeKey ?? null,
    expiresAt: options?.expiresAt ?? banner.expiresAt ?? (ttlMs ? Date.now() + ttlMs : null),
    targetRoute: options?.targetRoute ?? banner.targetRoute ?? banner.route ?? null,
  }
}

function promoteNextBanner(queue: NotificationBanner[], now = Date.now()) {
  const activeQueue = queue.filter((item) => !isExpired(item, now))
  const [next, ...rest] = activeQueue
  return {
    current: next ?? null,
    queue: rest,
    requestedExpandedBannerId: null,
    expandedBannerMode: null,
  }
}

function insertByPriority(queue: NotificationBanner[], banner: NotificationBanner): NotificationBanner[] {
  return [...queue, banner].sort((a, b) => priorityOf(b) - priorityOf(a))
}

function priorityOf(banner: NotificationBanner): number {
  return banner.priority ?? DEFAULT_PRIORITY
}

function isExpired(banner: NotificationBanner | null, now: number): boolean {
  if (!banner?.expiresAt) return false
  return banner.expiresAt <= now
}
