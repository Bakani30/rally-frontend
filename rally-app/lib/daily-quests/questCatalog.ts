import {
  BASKETBALL_COURT_MODE_REWARD_POINTS,
} from '@/lib/activities/basketball/courtModeTypes'
import type { DailyQuestDefinition } from './questTypes'

export const DAILY_QUEST_CATALOG: DailyQuestDefinition[] = [
  {
    id: 'sync-daily-7k',
    title: 'Daily Walk 7K',
    subtitle: 'เดิน/วิ่งให้ครบ 7km วันนี้ แล้วระบบซิงค์ให้อัตโนมัติ',
    activity: 'running',
    evidenceMode: 'sensor_sync',
    action: 'sync_daily_mission',
    rewardPoints: 50,
    icon: 'run-fast',
  },
  {
    id: 'basketball-court-mode',
    title: '15-Min Court Mode',
    subtitle: 'จับเวลา 15 นาที แล้วซิงค์ Workout / Effort / Footwork',
    activity: 'basketball',
    evidenceMode: 'timed_sensor_session',
    action: 'court_mode',
    rewardPoints: BASKETBALL_COURT_MODE_REWARD_POINTS,
    icon: 'basketball',
  },
  {
    id: 'basketball-free-throw-check',
    title: 'Free Throw Check',
    subtitle: 'วิดีโอ timestamp: ยิงลูกโทษ 3 ลูก ต้องลงอย่างน้อย 2 ลูก',
    activity: 'basketball',
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 10,
    icon: 'basketball-hoop-outline',
  },
  {
    id: 'basketball-handle-burst',
    title: '15s Handle Burst',
    subtitle: 'วิดีโอ timestamp: เลี้ยงบอลต่อเนื่อง 15 วินาที',
    activity: 'basketball',
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 8,
    icon: 'gesture-tap-button',
  },
  {
    id: 'basketball-layup-pair',
    title: 'Layup Pair',
    subtitle: 'วิดีโอ timestamp: ทำ layup ให้เห็น 2 ครั้ง',
    activity: 'basketball',
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 8,
    icon: 'run-fast',
  },
  {
    id: 'basketball-spot-shot-practice',
    title: 'Spot Shot Practice',
    subtitle: 'วิดีโอ timestamp: ชู้ตจากจุดเดิม 5 ลูก',
    activity: 'basketball',
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 10,
    icon: 'target',
  },
  {
    id: 'badminton-rally-video',
    title: 'Rally Control',
    subtitle: 'ส่งวิดีโอ drill แบดแบบเล่นคนเดียว',
    activity: 'badminton',
    evidenceMode: 'video_proof',
    action: 'video_submission',
    rewardPoints: 20,
    icon: 'badminton',
  },
  {
    id: 'badminton-footwork-proof',
    title: 'Footwork Ladder',
    subtitle: 'ส่งวิดีโอ footwork หรือ shadow drill',
    activity: 'badminton',
    evidenceMode: 'manual_proof',
    action: 'manual_submission',
    rewardPoints: 15,
    icon: 'shoe-print',
  },
]

export function getDailyQuestById(id: string): DailyQuestDefinition | null {
  return DAILY_QUEST_CATALOG.find((quest) => quest.id === id) ?? null
}
