export type QuestActivity = 'running' | 'basketball' | 'badminton' | 'special'

export type QuestEvidenceMode =
  | 'sensor_sync'
  | 'timed_sensor_session'
  | 'video_proof'
  | 'manual_proof'

export type QuestAction =
  | 'sync_daily_mission'
  | 'court_mode'
  | 'video_submission'
  | 'manual_submission'

export type QuestStatus =
  | 'ready'
  | 'in_progress'
  | 'pending_sync'
  | 'completed'
  | 'claimed'
  | 'draft'
  | 'failed'

export type DailyQuestDefinition = {
  id: string
  title: string
  subtitle: string
  activity: QuestActivity
  evidenceMode: QuestEvidenceMode
  action: QuestAction
  rewardPoints: number
  icon: string
}

export type DailyQuestItem = DailyQuestDefinition & {
  status: QuestStatus
  statusLabel: string
  progress: number
}
