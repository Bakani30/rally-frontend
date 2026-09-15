// Full-screen result beat shown after quest proof submission.
// Derives tone from resultBeatTone(session); shows headline + points delta + running total.
// Visual grammar (Task 7): dark vault card, lime #CEF17B border + ✓ badge for success,
// gold #eac31a delta line, running-total line only on success, flat "เยี่ยม!" CTA.
import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { PressableScale } from '@/components/motion/PressableScale'
import { QuestResultVideoPreview } from '@/components/quests/QuestResultVideoPreview'
import { onAccent, Radius, Spacing, type SportPalette } from '@/constants/theme'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useSportTheme } from '@/hooks/useAppTheme'
import { useAuth } from '@/hooks/useAuth'
import { useWalletSummary } from '@/hooks/useWalletSummary'
import { resultBeatTone } from '@/lib/quest-proof/questProofStatusPill'
import type { QuestProofSession } from '@/lib/quest-proof/questProofTypes'
import { shareQuestResult } from '@/lib/quest-proof/shareQuestResult'

// ── Design tokens ─────────────────────────────────────────────────────────────
const VAULT_BG = '#1a2230'
const VAULT_LINE = 'rgba(255,255,255,0.12)'
/** Lime accent for success tone — border, badge, headline tint. */
const LIME = '#CEF17B'
/** Gold for the points-delta numeral. */
const GOLD = '#eac31a'
/** Muted text on the always-dark card surface. */
const CARD_MUTED = 'rgba(255,255,255,0.50)'

// ── Tone brief ────────────────────────────────────────────────────────────────
type ToneBrief = {
  headline: string
  accentColor: string
  buttonLabel: string
  badgeMark: string
}

function buildBrief(
  tone: ReturnType<typeof resultBeatTone>,
  theme: SportPalette,
): ToneBrief {
  switch (tone) {
    case 'success':
      return { headline: 'เควสผ่าน', accentColor: LIME, buttonLabel: 'เยี่ยม!', badgeMark: '✓' }
    case 'capped':
      return { headline: 'ครบโควต้าวันนี้', accentColor: theme.economy, buttonLabel: 'เสร็จ', badgeMark: '✓' }
    case 'pending':
      return { headline: 'ส่งแล้ว', accentColor: theme.blue, buttonLabel: 'เสร็จ', badgeMark: '…' }
    case 'fail':
      return { headline: 'ยังไม่ผ่าน', accentColor: theme.redVivid, buttonLabel: 'เสร็จ', badgeMark: '✗' }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
type Props = {
  session: QuestProofSession
  /** Local clip URI captured this session; attached to the native share sheet. */
  shareMediaUri?: string | null
  onDownload?: () => Promise<boolean> | boolean
  isDownloading?: boolean
}

export function QuestResultBeat({ session, shareMediaUri, onDownload, isDownloading = false }: Props) {
  const theme = useSportTheme()
  const { user } = useAuth()
  const { track } = useAnalytics()
  const [isSharing, setIsSharing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Wallet hook is unconditional (Rules of Hooks). The submit/capture mutations
  // call invalidateQueries(['wallet-summary']) on success before this component
  // mounts, so the hook refetches and resolves to the post-grant balance.
  const { data: walletData } = useWalletSummary(user?.id ?? session.user_id)
  const newTotal: number | null = walletData?.wallet?.available_spendable ?? null

  const tone = resultBeatTone(session)
  const isSuccess = tone === 'success'
  const { headline, accentColor, buttonLabel, badgeMark } = buildBrief(tone, theme)

  // Fire analytics once on mount; ref guard prevents double-fire in Strict Mode.
  const resultViewedFiredRef = useRef(false)
  useEffect(() => {
    if (resultViewedFiredRef.current) return
    resultViewedFiredRef.current = true
    track({ name: 'quest_proof_result_viewed', properties: { tone } })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Native share — attaches the clip when one was captured, else a bare caption.
  async function handleShare() {
    if (isSharing) return
    setIsSharing(true)
    const points = session.points_granted ?? 0
    const message = points > 0 ? `เควสผ่าน! ได้ +${points} แต้มบน Rally 🏆` : 'เควสผ่านบน Rally 🏆'
    try {
      track({ name: 'quest_proof_result_shared', properties: { hasMedia: shareMediaUri != null } })
      const shared = await shareQuestResult({ mediaUri: shareMediaUri, message })
      if (!shared) setActionError('แชร์วิดีโอไม่สำเร็จ ลองใหม่')
    } finally {
      setIsSharing(false)
    }
  }

  async function handleDownload() {
    if (!onDownload || isDownloading) return
    setActionError(null)
    try {
      const saved = await onDownload()
      if (saved === false) setActionError('บันทึกวิดีโอไม่สำเร็จ ลองใหม่')
    } catch {
      setActionError('บันทึกวิดีโอไม่สำเร็จ ลองใหม่')
    }
  }

  const cardBorderColor = isSuccess ? LIME : VAULT_LINE
  // Badge: lime bg for success (dark mark), accent bg for others (white mark).
  const badgeBg = isSuccess ? LIME : accentColor
  const badgeMarkColor = isSuccess ? '#000' : '#fff'
  const buttonTextColor = onAccent(accentColor)

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { borderColor: cardBorderColor }]}>

        {/* Badge circle */}
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeMarkColor }]}>{badgeMark}</Text>
        </View>

        {/* Headline */}
        <Text style={[styles.headline, { color: isSuccess ? LIME : accentColor }]}>
          {headline}
        </Text>

        {shareMediaUri && <QuestResultVideoPreview uri={shareMediaUri} />}

        {/* Points delta — success only */}
        {isSuccess && (
          <Text style={styles.pointsDelta}>+{session.points_granted ?? 0} แต้ม</Text>
        )}

        {/* Running total — success only, shown once wallet refetch resolves */}
        {isSuccess && newTotal !== null && (
          <Text style={[styles.runningTotal, { color: CARD_MUTED }]}>
            {'รวมเป็น '}
            <Text style={styles.runningTotalBold}>{newTotal}</Text>
            {' แต้ม'}
          </Text>
        )}

        <View style={styles.divider} />

        {/* Share — success only. Opens the native sheet (LINE, IG Story, X, …). */}
        {isSuccess && (
          <PressableScale
            style={[styles.shareBtn, { backgroundColor: theme.orange }]}
            onPress={handleShare}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel="แชร์"
            accessibilityState={{ disabled: isSharing, busy: isSharing }}
          >
            <Text style={[styles.shareBtnText, { color: onAccent(theme.orange) }]}>
              {isSharing ? 'กำลังเปิด…' : 'แชร์ผลงาน'}
            </Text>
          </PressableScale>
        )}

        {onDownload && (
          <PressableScale
            style={[styles.downloadBtn, { backgroundColor: theme.blue }]}
            onPress={() => void handleDownload()}
            disabled={isDownloading}
            accessibilityRole="button"
            accessibilityLabel="ดาวน์โหลด"
            accessibilityState={{ disabled: isDownloading, busy: isDownloading }}
          >
            <Text style={[styles.downloadBtnText, { color: onAccent(theme.blue) }]}>
              {isDownloading ? 'กำลังบันทึก…' : 'บันทึกวิดีโอ'}
            </Text>
          </PressableScale>
        )}

        {actionError && <Text style={[styles.actionError, { color: theme.redVivid }]}>{actionError}</Text>}

        {/* Flat CTA — no shadow/elevation per design constraint */}
        <PressableScale
          style={[styles.doneBtn, { backgroundColor: accentColor }]}
          onPress={() => router.replace('/quests')}
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
        >
          <Text style={[styles.doneBtnText, { color: buttonTextColor }]}>{buttonLabel}</Text>
        </PressableScale>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: VAULT_BG,
    borderRadius: Radius.xxl,
    borderWidth: 2,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    // Flat card — no shadow/elevation intentionally (design spec).
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  headline: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  pointsDelta: {
    color: GOLD,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  runningTotal: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  runningTotalBold: {
    fontWeight: '800',
    color: GOLD,
  },
  divider: {
    height: 1,
    alignSelf: 'stretch',
    backgroundColor: VAULT_LINE,
  },
  shareBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Flat button — no shadow/elevation.
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  downloadBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  actionError: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneBtn: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Flat button — no shadow/elevation.
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
})
