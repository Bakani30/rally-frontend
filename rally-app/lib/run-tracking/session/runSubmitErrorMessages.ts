/**
 * Central Thai copy for run-submit rejections. Pure module — MUST stay free of
 * react/react-native/expo imports (see runNotice.ts for the same rule).
 *
 * Sources of truth for the code list:
 *   - supabase/functions/submit-run-session (index/service RPC_ERROR_MAP + pre-checks)
 *   - submit_run_session_atomic RPC (RAISE EXCEPTION codes)
 *   - supabase/functions/submit-activity RPC_ERROR_MAP + submit_match_activity_atomic
 *   - forward-compat codes for upcoming integrity checks (teleport / segment speed /
 *     background gap / FFA health-import gate)
 *
 * Copy contract per code: what happened + effect on the result/points + what to
 * do, in ≤2 short clauses. `title` names the cause; `detail` opens with the
 * effect and ends with the action, so `${title} ${detail}` reads as one line.
 *
 * `retryable` = retrying the same submission may succeed without a new run
 * (transport/temporary failures). false = this attempt is terminally rejected.
 * Unknown codes fall back to an honest generic entry that SHOWS the raw code
 * — but that raw-code fallback is only appropriate on true submit surfaces
 * (see `describeRunSubmitErrorWithFallback` vs `describeRunSubmitError` below).
 */

export type RunSubmitErrorMessage = {
  title: string
  detail: string
  retryable: boolean
}

const MESSAGES = {
  // ---- Edge transport / envelope (submit-run-session + submit-activity index.ts) ----
  unauthorized: {
    title: 'เซสชันหมดอายุ',
    detail: 'ยังไม่ได้ส่งผล — ล็อกอินใหม่แล้วลองอีกครั้ง ข้อมูลวิ่งยังอยู่ในเครื่อง',
    retryable: true,
  },
  rate_limited: {
    title: 'ส่งถี่เกินไป',
    detail: 'ยังไม่ได้ส่งผล — รอสักครู่แล้วลองใหม่ ข้อมูลวิ่งยังอยู่ในเครื่อง',
    retryable: true,
  },
  invalid_json: {
    title: 'ข้อมูลส่งไม่สมบูรณ์',
    detail: 'ยังไม่ได้ส่งผล — ลองส่งใหม่ ถ้ายังไม่หายให้อัปเดตแอป',
    retryable: true,
  },
  invalid_input: {
    title: 'รูปแบบข้อมูลไม่ถูกต้อง',
    detail: 'ระบบไม่รับผลรอบนี้ — อัปเดตแอปแล้วลองส่งใหม่',
    retryable: true,
  },
  method_not_allowed: {
    title: 'คำขอไม่ถูกต้อง',
    detail: 'ยังไม่ได้ส่งผล — อัปเดตแอปแล้วลองใหม่',
    retryable: true,
  },
  internal_error: {
    title: 'เซิร์ฟเวอร์ขัดข้อง',
    detail: 'ยังไม่ได้ส่งผล — ลองใหม่อีกครั้ง ข้อมูลวิ่งยังถูกเก็บไว้ในเครื่อง',
    retryable: true,
  },
  alpha_feature_gate_closed: {
    title: 'บัญชีนี้ยังไม่เปิดฟีเจอร์วิ่ง',
    detail: 'ส่งผลวิ่งไม่ได้ — ติดต่อทีม Rally ถ้าคิดว่าเป็นข้อผิดพลาด',
    retryable: false,
  },

  // ---- submit-run-session pre-RPC checks (service.ts) ----
  hash_mismatch: {
    title: 'ข้อมูลเส้นทางไม่ตรงกับที่บันทึก',
    detail: 'ระบบไม่รับผล — ลองส่งใหม่ ถ้ายังไม่หายให้เริ่มวิ่งรอบใหม่',
    retryable: true,
  },
  path_timestamp_not_monotonic: {
    title: 'ลำดับเวลา GPS ผิดปกติ',
    detail: 'ระบบไม่รับผลรอบนี้ — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  paused_exceeds_duration: {
    title: 'เวลาพักเกินเวลาวิ่งรวม',
    detail: 'ระบบไม่รับผลรอบนี้ — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  path_distance_too_short: {
    title: 'ระยะจากเส้นทาง GPS ไม่ถึง 100 ม.',
    detail: 'ผลนี้ไม่ถูกนับ — วิ่งให้เกิน 100 ม. แล้วค่อยส่ง',
    retryable: false,
  },
  distance_path_mismatch: {
    title: 'ระยะไม่ตรงกับเส้นทาง GPS',
    detail: 'ระยะที่ส่งต่างจากเส้นทางเกิน 10% ระบบไม่รับผล — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },

  // ---- submit_run_session_atomic RPC ----
  duration_invalid: {
    title: 'เวลาวิ่งไม่ถูกต้อง',
    detail: 'เวลาจบต้องอยู่หลังเวลาเริ่ม ระบบไม่รับผล — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  session_too_long: {
    title: 'เซสชันยาวเกิน 12 ชั่วโมง',
    detail: 'ระบบไม่รับผลรอบนี้ — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  distance_too_short: {
    title: 'ระยะไม่ถึง 100 เมตร',
    detail: 'ระยะไม่ถึงเกณฑ์ขั้นต่ำ ผลนี้ไม่ถูกนับ — วิ่งให้เกิน 100 ม. ก่อนส่ง',
    retryable: false,
  },
  distance_too_long: {
    title: 'ระยะเกิน 100 กม.',
    detail: 'ระบบไม่รับผลรอบนี้ — แบ่งเป็นหลายรอบแล้วส่งใหม่',
    retryable: false,
  },
  path_too_sparse: {
    title: 'จุด GPS น้อยเกินไป',
    detail: 'ระบบไม่รับผลรอบนี้ — วิ่งกลางแจ้งให้ GPS จับต่อเนื่องแล้วเริ่มใหม่',
    retryable: false,
  },
  path_too_dense: {
    title: 'จุด GPS เยอะเกินที่ระบบรับ',
    detail: 'ระบบไม่รับผลรอบนี้ — อัปเดตแอปแล้วลองส่งใหม่',
    retryable: true,
  },
  paused_duration_invalid: {
    title: 'เวลาพักไม่ถูกต้อง',
    detail: 'ระบบไม่รับผลรอบนี้ — เริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  pace_too_fast: {
    title: 'PACE เร็วเกินระดับการวิ่ง',
    detail: 'ระบบไม่รับผลรอบนี้ — ถ้าโดยสารรถระหว่างวิ่ง ให้กดพักก่อน',
    retryable: false,
  },
  pace_too_slow: {
    title: 'PACE ช้ากว่าเกณฑ์การวิ่ง',
    detail: 'ระบบไม่รับผลรอบนี้ — กดพักเมื่อหยุดนาน แล้วเริ่มวิ่งรอบใหม่',
    retryable: false,
  },
  challenge_id_required: {
    title: 'ไม่พบข้อมูลชาเลนจ์',
    detail: 'ผลวิ่งไม่ถูกส่งเข้าชาเลนจ์ — เปิดหน้าชาเลนจ์แล้วลองใหม่',
    retryable: true,
  },
  challenge_not_found: {
    title: 'ไม่พบชาเลนจ์นี้',
    detail: 'ชาเลนจ์อาจถูกลบไปแล้ว ผลวิ่งไม่ถูกส่งเข้าชาเลนจ์ — เช็คหน้าชาเลนจ์อีกครั้ง',
    retryable: false,
  },
  challenge_activity_mismatch: {
    title: 'ชาเลนจ์นี้ไม่รับผลการวิ่ง',
    detail: 'ผลวิ่งไม่ถูกส่งเข้าชาเลนจ์ — เช็คประเภทกิจกรรมของชาเลนจ์',
    retryable: false,
  },
  challenge_not_open: {
    title: 'ชาเลนจ์ยังไม่เปิดรับผล',
    detail: 'ผลวิ่งไม่ถูกส่งเข้าชาเลนจ์ — ส่งใหม่เมื่อชาเลนจ์เปิด',
    retryable: true,
  },
  not_joined: {
    title: 'ยังไม่ได้เข้าร่วมชาเลนจ์',
    detail: 'ผลวิ่งไม่ถูกส่งเข้าชาเลนจ์ — กดเข้าร่วมก่อนแล้วส่งใหม่',
    retryable: true,
  },
  challenge_session_out_of_window: {
    title: 'วิ่งนอกช่วงเวลาชาเลนจ์',
    detail: 'รอบนี้ไม่ถูกนับเข้าชาเลนจ์ — วิ่งใหม่ในช่วงเวลาที่กำหนด',
    retryable: false,
  },
  match_not_found: {
    title: 'ไม่พบแมตช์',
    detail: 'แมตช์อาจถูกยกเลิกไปแล้ว ผลวิ่งไม่ถูกส่งเข้าแมตช์ — เช็คหน้าแมตช์อีกครั้ง',
    retryable: false,
  },
  match_not_running: {
    title: 'แมตช์นี้ไม่ใช่แมตช์วิ่ง',
    detail: 'ผลวิ่งส่งเข้าแมตช์นี้ไม่ได้ — เช็คประเภทกิจกรรมของแมตช์',
    retryable: false,
  },
  match_participant_required: {
    title: 'คุณไม่ได้อยู่ในแมตช์นี้',
    detail: 'ผลวิ่งไม่ถูกส่งเข้าแมตช์ — เข้าร่วมแมตช์ก่อนแล้วลองใหม่',
    retryable: false,
  },

  // ---- submit-activity (match-link) ----
  winner_required: {
    title: 'ยังไม่ได้ระบุผู้ชนะ',
    detail: 'ผลยังไม่ถูกส่ง — เลือกผู้ชนะหรือเลือกเสมอก่อนส่ง',
    retryable: true,
  },
  coop_min_distance_not_met: {
    title: 'ระยะของคุณไม่ถึง 1 กม.',
    detail: 'ผลรอบนี้ยังไม่นับเข้าแมตช์ทีม — ต้องวิ่งอย่างน้อย 1 กม.',
    retryable: false,
  },
  coop_team_distance_not_met: {
    title: 'ระยะรวมทีมยังไม่ถึง 1 กม.',
    detail: 'ทีมที่ยังอยู่ต้องมีระยะรวมอย่างน้อย 1 กม. ก่อนส่งผล — วิ่งเพิ่มแล้วส่งใหม่',
    retryable: false,
  },
  activity_session_required: {
    title: 'แมตช์นี้ต้องใช้ผลวิ่งจริง',
    detail: 'ผลยังไม่ถูกส่ง — วิ่งด้วย GPS หรือ import จาก Health ก่อน',
    retryable: false,
  },
  activity_session_not_found: {
    title: 'ไม่พบผลวิ่งที่จะส่ง',
    detail: 'ผลยังไม่เข้าแมตช์ — เริ่มวิ่งรอบใหม่แล้วส่งอีกครั้ง',
    retryable: false,
  },
  activity_session_not_owned: {
    title: 'ผลวิ่งนี้ไม่ใช่ของบัญชีคุณ',
    detail: 'ผลยังไม่เข้าแมตช์ — ส่งได้เฉพาะผลวิ่งของตัวเอง',
    retryable: false,
  },
  activity_session_not_running: {
    title: 'ผลนี้ไม่ใช่กิจกรรมวิ่ง',
    detail: 'ผลยังไม่เข้าแมตช์ — ส่งได้เฉพาะผลจากการวิ่ง',
    retryable: false,
  },
  activity_session_not_sensor_verified: {
    title: 'แมตช์นี้รับเฉพาะผลจาก GPS/Health',
    detail: 'ผลที่กรอกเองใช้ไม่ได้ — วิ่งด้วย GPS หรือ import จาก Health',
    retryable: false,
  },
  activity_session_not_verified: {
    title: 'ผลวิ่งยังไม่ผ่านการยืนยัน',
    detail: 'ผลยังไม่เข้าแมตช์ — ลองส่งใหม่ ถ้ายังไม่หายให้วิ่งรอบใหม่',
    retryable: true,
  },
  activity_session_before_match_acceptance: {
    title: 'วิ่งก่อนแมตช์เริ่ม',
    detail: 'ผลรอบนี้ไม่นับเข้าแมตช์ — ใช้ได้เฉพาะการวิ่งหลังทุกคนกดรับแมตช์',
    retryable: false,
  },
  activity_session_already_used_for_match: {
    title: 'ผลวิ่งนี้ถูกใช้กับแมตช์อื่นแล้ว',
    detail: 'หนึ่งผลวิ่งใช้ได้กับหนึ่งแมตช์ — วิ่งรอบใหม่สำหรับแมตช์นี้',
    retryable: false,
  },
  activity_session_distance_below_rule: {
    title: 'ระยะไม่ถึงกติกาแมตช์',
    detail: 'ผลรอบนี้สั้นกว่าที่แมตช์กำหนด — วิ่งให้ครบระยะแล้วส่งใหม่',
    retryable: false,
  },
  activity_session_missing_distance: {
    title: 'ผลวิ่งไม่มีข้อมูลระยะทาง',
    detail: 'ผลยังไม่เข้าแมตช์ — เริ่มวิ่งรอบใหม่ด้วย GPS',
    retryable: false,
  },
  activity_session_missing_moving_time: {
    title: 'ผลวิ่งไม่มีข้อมูลเวลา',
    detail: 'ผลยังไม่เข้าแมตช์ — เริ่มวิ่งรอบใหม่ด้วย GPS',
    retryable: false,
  },
  referee_result_required: {
    title: 'แมตช์นี้ใช้กรรมการตัดสิน',
    detail: 'ส่งผลเองไม่ได้ — รอกรรมการส่งผล แล้วค่อยตรวจหรือขอแก้',
    retryable: false,
  },

  // ---- Forward-compat (upcoming integrity checks) ----
  teleport_detected: {
    title: 'ตำแหน่ง GPS กระโดดผิดปกติ',
    detail: 'ระบบไม่รับผลรอบนี้ — วิ่งกลางแจ้งให้ GPS จับต่อเนื่องแล้วเริ่มใหม่',
    retryable: false,
  },
  segment_speed_exceeded: {
    title: 'ความเร็วบางช่วงเกินระดับการวิ่ง',
    detail: 'ระบบไม่รับผลรอบนี้ — ถ้าโดยสารรถระหว่างวิ่ง ให้กดพักก่อน',
    retryable: false,
  },
  background_gap_distance_excluded: {
    title: 'ตัดระยะช่วงที่ GPS ขาดหาย',
    detail: 'บางช่วงสัญญาณหายนานจึงไม่ถูกนับระยะ — ผลส่วนที่เหลือยังถูกบันทึกตามปกติ',
    retryable: false,
  },
  health_import_not_allowed_for_ffa: {
    title: 'แมตช์ FFA ไม่รับผลจาก Health',
    detail: 'ผลยังไม่เข้าแมตช์ — ต้องวิ่งด้วย GPS สดในแอปเท่านั้น',
    retryable: false,
  },

  // ---- Client retry-queue dead-letter sentinel (retryQueue.ts) ----
  // Written when a run exhausts MAX_RETRY_ATTEMPTS with no server code — almost
  // always a genuine transport/network outage. NOT a server rejection, so the
  // copy points at connectivity, not the run itself.
  max_retries: {
    title: 'ส่งไม่สำเร็จหลายครั้ง',
    detail: 'ลองส่งหลายครั้งแล้วยังไม่ผ่าน อาจเป็นที่สัญญาณเน็ต — เชื่อมต่อแล้วกดลองอีกครั้ง ข้อมูลวิ่งยังอยู่ในเครื่อง',
    retryable: true,
  },

  // ---- submit-activity / submit_match_activity_atomic (session lifecycle) ----
  activity_session_not_submittable: {
    title: 'เซสชันนี้ส่งผลไม่ได้แล้ว',
    detail: 'สถานะเซสชันไม่พร้อมส่ง — ใช้การวิ่งครั้งใหม่',
    retryable: false,
  },
} as const satisfies Record<string, RunSubmitErrorMessage>

export type RunSubmitErrorCode = keyof typeof MESSAGES

export const RUN_SUBMIT_ERROR_CODES = Object.keys(MESSAGES) as RunSubmitErrorCode[]

// Longest-first so message scans never match a code that is a substring of
// another (e.g. 'duration_invalid' inside 'paused_duration_invalid').
const CODES_BY_LENGTH_DESC = [...RUN_SUBMIT_ERROR_CODES].sort((a, b) => b.length - a.length)

export function isKnownRunSubmitErrorCode(code: string): code is RunSubmitErrorCode {
  return Object.prototype.hasOwnProperty.call(MESSAGES, code)
}

/** Unknown codes get honest generic copy that SHOWS the raw code. */
export function getRunSubmitErrorMessage(code: string): RunSubmitErrorMessage {
  if (isKnownRunSubmitErrorCode(code)) return MESSAGES[code]
  return {
    title: 'ส่งผลไม่สำเร็จ',
    detail: `เกิดข้อผิดพลาด (โค้ด ${code}) — ลองส่งใหม่อีกครั้ง`,
    retryable: true,
  }
}

/**
 * Pull a rejection code off an unknown error. Prefers the structured `.code`
 * (EdgeFunctionError / AppError envelope), then scans the message for a known
 * code token (RPC errors surfaced as plain messages). Returns null when there
 * is no code at all (e.g. network failures) so callers keep their offline copy.
 */
export function extractRunSubmitErrorCode(error: unknown): string | null {
  const structured = (error as { code?: unknown } | null | undefined)?.code
  if (typeof structured === 'string' && structured.length > 0) return structured

  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : null
  if (!message) return null
  for (const code of CODES_BY_LENGTH_DESC) {
    if (message.includes(code)) return code
  }
  return null
}

/**
 * One-line Thai description for a coded submit error, or null when the code
 * is UNKNOWN or absent (caller falls back to its own contextual copy).
 *
 * Strict on purpose: this is for surfaces where the error may not even be a
 * submit rejection (e.g. a data-load failure whose PostgrestError happens to
 * carry a `.code`) — showing a raw unmapped code there would misattribute a
 * read failure as a rejected submission. Use on: run summary data-load /
 * verify-mutation errors, health-import banner (`toReadableRunError`,
 * `sync.tsx`).
 */
export function describeRunSubmitError(error: unknown): string | null {
  const code = extractRunSubmitErrorCode(error)
  if (!code || !isKnownRunSubmitErrorCode(code)) return null
  const message = getRunSubmitErrorMessage(code)
  return `${message.title} ${message.detail}`
}

/**
 * Lenient sibling of `describeRunSubmitError`: still returns null when there
 * is no code at all, but for a PRESENT-but-unknown code it shows the honest
 * generic copy with the raw code rather than deferring to the caller. Use
 * ONLY on true submit surfaces where the error is known to come from an
 * actual submission attempt: `useRunSession` submit/stopAndSubmit.
 */
export function describeRunSubmitErrorWithFallback(error: unknown): string | null {
  const code = extractRunSubmitErrorCode(error)
  if (!code) return null
  const message = getRunSubmitErrorMessage(code)
  return `${message.title} ${message.detail}`
}
