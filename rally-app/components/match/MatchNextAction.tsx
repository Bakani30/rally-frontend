import { memo } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Reveal } from '@/components/motion/Reveal'
import { Radius, Sport, Spacing } from '@/constants/theme'
import type { NextAction } from '@/lib/match/matchNextAction'
import { getSubmitResultActionView } from '@/lib/match/matchNextActionSubmitView'

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name']
type Tone = 'red' | 'amber' | 'green' | 'neutral'

type Props = {
  action: NextAction
  onSubmit: () => void
}

function MatchNextActionInner({
  action,
  onSubmit,
}: Props) {
  if (
    action.kind === 'spectator' ||
    action.kind === 'accepting_invite' ||
    action.kind === 'review_team_result' ||
    action.kind === 'confirm_result' ||
    action.kind === 'settled' ||
    action.kind === 'cancelled' ||
    action.kind === 'waiting_start'
  ) {
    return null
  }

  const view = getSubmitResultActionView(action) ?? describe(action)
  if (!view) return null
  const tone = TONE[view.tone]

  return (
    <Reveal delay={40}>
      <View style={[styles.card, { borderColor: tone.border, backgroundColor: tone.bg }]}>
        <View style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}>
          <MaterialCommunityIcons name={view.icon} size={22} color={tone.fg} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, { color: tone.fg }]}>{view.title}</Text>
          <Text style={styles.sub}>{view.sub}</Text>
        </View>
        {view.cta && (
          <PressableScale
            style={[styles.cta, { backgroundColor: tone.fg }]}
            onPress={onSubmit}
          >
            <Text style={[styles.ctaText, { color: Sport.bg }]}>{view.cta.label}</Text>
          </PressableScale>
        )}
      </View>
    </Reveal>
  )
}

type ActionView = {
  icon: IconName
  tone: Tone
  title: string
  sub: string
  cta?: { label: string }
}

function describe(action: NextAction): ActionView | null {
  switch (action.kind) {
    case 'choose_side':
      return {
        icon: 'gesture-tap',
        tone: 'amber',
        title: 'เลือกฝั่งเพื่อเข้าร่วม',
        sub: 'แตะปุ่ม Join ในการ์ดทีมด้านล่าง',
      }
    case 'waiting_start':
      return {
        icon: 'timer-sand',
        tone: 'neutral',
        title: 'รอเจ้าของห้องกดเริ่ม',
        sub: 'เจ้าของห้องจะกด START เมื่อทุกฝั่งพร้อม',
      }
    case 'waiting_confirmation':
      return {
        icon: 'eye-outline',
        tone: 'neutral',
        title: 'รออีกฝ่ายยืนยันผล',
        sub: 'ผลที่คุณส่งกำลังรอการยืนยัน เมื่อยืนยันแล้วระบบจะจ่ายแต้มอัตโนมัติ',
      }
    case 'waiting_opponent_team_result':
      return {
        icon: 'account-clock-outline',
        tone: 'neutral',
        title: 'รออีกทีมส่งคะแนน',
        sub: 'ทีมของคุณส่งผลแล้ว ระบบจะรวมคะแนนและเข้าสู่ขั้นยืนยันเมื่ออีกทีมส่งครบ',
        cta: { label: 'Edit' },
      }
    case 'review_team_result':
      return {
        icon: 'clipboard-check-outline',
        tone: 'amber',
        title: 'ตรวจคะแนนรวม',
        sub: 'ทั้งสองทีมส่งคะแนนแล้ว ตรวจคะแนนรวมด้านล่างก่อนกดยอมรับผล',
      }
    case 'waiting_team_result_acceptance':
      return {
        icon: 'account-clock-outline',
        tone: 'neutral',
        title: 'รออีกทีมยอมรับผล',
        sub: 'คุณยอมรับคะแนนรวมแล้ว หากคะแนนผิดยังแก้ผลทีมตัวเองได้ก่อนอีกทีมยอมรับ',
      }
    case 'disputed':
      return {
        icon: 'alert-octagon-outline',
        tone: 'red',
        title: 'ผลถูกโต้แย้ง',
        sub: 'แมตช์นี้หยุดรอตรวจสอบก่อนจ่ายแต้ม',
      }
    default:
      return null
  }
}

const TONE: Record<Tone, { fg: string; bg: string; border: string; iconBg: string }> = {
  red: {
    fg: Sport.red,
    bg: Sport.redSoft,
    border: 'rgba(255,77,61,0.28)',
    iconBg: 'rgba(255,77,61,0.18)',
  },
  amber: {
    fg: Sport.amber,
    bg: Sport.amberSoft,
    border: 'rgba(255,178,61,0.3)',
    iconBg: 'rgba(255,178,61,0.18)',
  },
  green: {
    fg: Sport.green,
    bg: Sport.greenSoft,
    border: 'rgba(50,213,131,0.3)',
    iconBg: 'rgba(50,213,131,0.18)',
  },
  neutral: {
    fg: Sport.inkSoft,
    bg: Sport.surface,
    border: Sport.line,
    iconBg: Sport.surfaceStrong,
  },
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    flexWrap: 'wrap',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px -12px rgba(0,0,0,0.4)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
        elevation: 3,
      },
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 160, gap: 2 },
  title: { fontSize: 15, fontWeight: '900', letterSpacing: 0 },
  sub: { fontSize: 12, color: Sport.muted, lineHeight: 17 },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
})

export const MatchNextAction = memo(MatchNextActionInner)
