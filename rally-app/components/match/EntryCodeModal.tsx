import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { PressableScale } from '@/components/motion/PressableScale'
import { Fonts, Radius, Spacing, Sport } from '@/constants/theme'
import { ENTRY_CODE_LENGTH, isCompleteEntryCode, normalizeEntryCode } from '@/lib/match/joinCode'

type Props = {
  visible: boolean
  pending?: boolean
  errorMessage?: string
  onSubmit: (entryCode: string) => void
  onCancel: () => void
}

export function EntryCodeModal({ visible, pending, errorMessage, onSubmit, onCancel }: Props) {
  const [code, setCode] = useState('')
  const inputRef = useRef<TextInput>(null)
  const submittedRef = useRef('')
  const cells = Array.from({ length: ENTRY_CODE_LENGTH }, (_, i) => code[i] ?? '')
  const activeIndex = Math.min(code.length, ENTRY_CODE_LENGTH - 1)

  useEffect(() => {
    if (!visible) {
      setCode('')
      submittedRef.current = ''
    }
  }, [visible])

  useEffect(() => {
    if (visible && !pending) {
      const t = setTimeout(() => inputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [visible, pending])

  // Auto-submit once the code is complete (only once per value).
  useEffect(() => {
    if (!isCompleteEntryCode(code)) return
    if (pending) return
    if (submittedRef.current === code) return
    submittedRef.current = code
    onSubmit(code)
  }, [code, pending, onSubmit])

  // Reset submission tracking when an error comes back so user can retry.
  useEffect(() => {
    if (errorMessage) submittedRef.current = ''
  }, [errorMessage])

  function handleChange(text: string) {
    const next = normalizeEntryCode(text)
    if (next !== code) setCode(next)
  }

  function handleClose() {
    setCode('')
    onCancel()
  }

  const hasError = Boolean(errorMessage) && !pending

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={() => inputRef.current?.focus()}>
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={Sport.amber} />
          </View>
          <Text style={styles.title}>Entry password</Text>
          <Text style={styles.hint}>
            ห้องนี้ตั้งรหัสไว้ — กรอก {ENTRY_CODE_LENGTH} หลักจากเจ้าของห้อง
          </Text>

          <View style={styles.cells}>
            {cells.map((char, idx) => {
              const filled = idx < code.length
              const isCursor = idx === activeIndex && code.length < ENTRY_CODE_LENGTH
              return (
                <View
                  key={idx}
                  style={[
                    styles.cell,
                    filled && styles.cellFilled,
                    isCursor && styles.cellActive,
                    hasError && filled && styles.cellError,
                  ]}
                >
                  <Text style={[styles.cellText, hasError && styles.cellTextError]}>
                    {filled ? '•' : ''}
                  </Text>
                  {isCursor ? <View style={styles.caret} /> : null}
                </View>
              )
            })}
          </View>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={ENTRY_CODE_LENGTH}
            caretHidden
            style={styles.hiddenInput}
            selectionColor="transparent"
            editable={!pending}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
          />

          <View style={styles.statusRow}>
            {pending ? (
              <Text style={[styles.status, styles.statusMuted]}>กำลังเข้าห้อง…</Text>
            ) : hasError ? (
              <Text style={[styles.status, styles.statusError]}>{errorMessage}</Text>
            ) : (
              <Text style={[styles.status, styles.statusMuted]}>
                {code.length} / {ENTRY_CODE_LENGTH}
              </Text>
            )}
          </View>

          <PressableScale style={styles.cancel} onPress={handleClose}>
            <Text style={styles.cancelText}>CANCEL</Text>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const CELL = 44

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Sport.bgElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Sport.line,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Sport.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: Sport.ink, fontSize: 18, fontWeight: '800', letterSpacing: 0.4 },
  hint: { color: Sport.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  cells: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  cell: {
    width: CELL,
    height: CELL + 4,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Sport.line,
    backgroundColor: Sport.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: Sport.lineStrong, backgroundColor: Sport.surfacePressed },
  cellActive: { borderColor: Sport.amber, backgroundColor: Sport.amberSoft },
  cellError: { borderColor: Sport.red, backgroundColor: Sport.redSoft },
  cellText: {
    color: Sport.ink,
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts?.mono,
    lineHeight: 28,
  },
  cellTextError: { color: Sport.red },
  caret: {
    position: 'absolute',
    bottom: 8,
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: Sport.amber,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: CELL,
  },
  statusRow: { minHeight: 16, alignItems: 'center', alignSelf: 'stretch' },
  status: { fontSize: 12, fontWeight: '600' },
  statusMuted: { color: Sport.muted },
  statusError: { color: Sport.red, fontWeight: '700', textAlign: 'center' },
  cancel: {
    marginTop: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: Sport.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
})
