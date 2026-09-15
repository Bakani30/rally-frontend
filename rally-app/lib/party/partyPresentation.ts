import type { PartyDetail, PartyMember, PartyMemberStatus, PartySummary, PartyTeamSize } from '@/types/party'
import type { AppLanguage } from '@/lib/i18n/language'

export const PARTY_TEAM_SIZES = [1, 2, 3, 5] as const satisfies readonly PartyTeamSize[]

export function formatPartyTeamSize(teamSize: PartyTeamSize): string {
  return `${teamSize}v${teamSize}`
}

export function getPartyActivityLabel(activityType: PartySummary['activity_type'], language: AppLanguage = 'en'): string {
  if (language === 'th') return activityType === 'basketball' ? 'บาสเกตบอล' : 'แบดมินตัน'
  return activityType === 'basketball' ? 'Basketball' : 'Badminton'
}

export function getPartyVisibilityLabel(visibility: PartySummary['visibility'], language: AppLanguage = 'en'): string {
  if (language === 'th') return visibility === 'discoverable' ? 'เปิดให้ค้นหา' : 'ส่วนตัว'
  return visibility === 'discoverable' ? 'Discoverable' : 'Private'
}

export function getPartyStatusLabel(status: PartySummary['status'], language: AppLanguage = 'en'): string {
  if (language === 'th') {
    if (status === 'forming') return 'กำลังรวมทีม'
    if (status === 'closed') return 'ปิดแล้ว'
    return 'หมดอายุแล้ว'
  }
  if (status === 'forming') return 'Forming'
  if (status === 'closed') return 'Closed'
  return 'Expired'
}

export function getPartyMemberStatusLabel(status: PartyMemberStatus, language: AppLanguage = 'en'): string {
  if (language === 'th') {
    if (status === 'active') return 'เข้าร่วมแล้ว'
    if (status === 'requested') return 'รออนุมัติ'
    if (status === 'invited') return 'ได้รับเชิญ'
    if (status === 'left') return 'ออกแล้ว'
    if (status === 'declined') return 'ปฏิเสธแล้ว'
    if (status === 'removed') return 'ถูกนำออก'
    return 'หมดอายุแล้ว'
  }
  if (status === 'active') return 'Joined'
  if (status === 'requested') return 'Requested'
  if (status === 'invited') return 'Invited'
  if (status === 'left') return 'Left'
  if (status === 'declined') return 'Declined'
  if (status === 'removed') return 'Removed'
  return 'Expired'
}

export function getActivePartyMembers(party: PartyDetail | null | undefined): PartyMember[] {
  return (party?.party_members ?? []).filter((member) => member.status === 'active')
}

export function getPartyMember(party: PartyDetail | null | undefined, userId: string | undefined): PartyMember | null {
  if (!party || !userId) return null
  return party.party_members.find((member) => member.user_id === userId) ?? null
}

export type PartyViewerState = 'host' | 'active' | 'invited' | 'requested' | 'visitor' | 'left'

export function getPartyViewerState(
  party: PartyDetail | null | undefined,
  userId: string | undefined,
): PartyViewerState {
  if (!party || !userId) return 'visitor'
  if ((party.host?.userId ?? party.host_user_id) === userId) return 'host'

  const status = party.viewerMembership?.status
    ?? getPartyMember(party, userId)?.status
  if (status === 'active') return 'active'
  if (status === 'invited') return 'invited'
  if (status === 'requested') return 'requested'
  if (status === 'left' || status === 'declined' || status === 'removed' || status === 'expired') return 'left'
  return 'visitor'
}

export function formatPartyExpiry(expiresAt: string, now = new Date(), language: AppLanguage = 'en'): string {
  const expiry = new Date(expiresAt)
  if (Number.isNaN(expiry.getTime())) return language === 'th' ? 'ไม่ทราบเวลาหมดอายุ' : 'Expiry unavailable'

  const remainingHours = (expiry.getTime() - now.getTime()) / (60 * 60 * 1000)
  if (remainingHours <= 0) return language === 'th' ? 'หมดอายุแล้ว' : 'Expired'
  if (remainingHours < 1) return language === 'th' ? 'หมดอายุในไม่ถึง 1 ชม.' : 'Ends in less than 1h'
  if (remainingHours < 24) return language === 'th' ? `หมดอายุใน ${Math.ceil(remainingHours)} ชม.` : `Ends in ${Math.ceil(remainingHours)}h`

  const date = new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(expiry)
  return language === 'th' ? `หมดอายุ ${date}` : `Ends ${date}`
}
