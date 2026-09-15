import type { Dictionary } from '../translate'

export const onboardingDictionary = {
  // ── Screen titles + subtitles ──
  title_welcome: { th: 'ยินดีต้อนรับสู่ RALLY', en: 'Welcome to RALLY' },
  subtitle_welcome: { th: 'มาปรับแต่งประสบการณ์ของคุณกัน', en: "Let's set up your experience" },
  title_about: { th: 'เล่าเรื่องของคุณให้เราฟัง', en: 'Tell us about yourself' },
  subtitle_about: { th: 'เราจะปรับการวิเคราะห์ให้เข้ากับคุณ', en: "We'll tailor your insights to you" },
  title_sports: { th: 'คุณชอบเล่นกีฬาอะไร?', en: 'What sports do you enjoy?' },
  subtitle_sports: { th: 'เลือกได้มากกว่า 1 อย่าง', en: 'Pick as many as you like' },
  title_done: { th: 'เรียบร้อยแล้ว!', en: "You're all set!" },
  subtitle_done: { th: 'ไปลุยชาเลนจ์และสะสมรางวัลกับ RALLY ได้เลย', en: 'Jump into challenges and earn rewards with RALLY' },

  // ── Step / pager ──
  step_label: { th: 'ขั้นที่ {step} จาก {total}', en: 'Step {step} of {total}' },
  experience_sport_pager: { th: 'กีฬาที่ {index} จาก {total}', en: 'Sport {index} of {total}' },
  experience_subtitle_level: { th: 'ช่วยให้เราจับคู่ผู้เล่นระดับเดียวกับคุณ', en: 'Helps us match you with players at your level' },
  experience_subtitle_styles: { th: 'เลือกได้มากกว่า 1 (ไม่บังคับ)', en: 'Pick more than one (optional)' },

  // ── Section headers ──
  section_name: { th: 'ให้เราเรียกคุณว่าอะไร?', en: 'What should we call you?' },
  section_dob: { th: 'วันเกิด', en: 'Date of birth' },
  section_gender: { th: 'เพศ', en: 'Gender' },
  section_level: { th: 'ระดับ', en: 'Level' },
  section_styles: { th: 'สายที่ใช่ (เลือกได้ {max})', en: 'Your style (pick up to {max})' },
  section_position: { th: 'ตำแหน่ง / บทบาทที่ถนัด', en: 'Preferred position / role' },
  section_available: { th: 'เปิดแข่งใน Rally แล้ว', en: 'Available in Rally now' },

  // ── Name field (welcome) ──
  name_placeholder: { th: 'ตั้งชื่อของคุณ', en: 'Choose your name' },
  name_hint: { th: 'ชื่อนี้จะแสดงบน Leaderboard และ Challenges', en: 'This name shows on the Leaderboard and Challenges' },
  change_name: { th: 'เปลี่ยนชื่อ', en: 'Change name' },

  // ── Body fields + units ──
  field_height: { th: 'ส่วนสูง', en: 'Height' },
  field_weight: { th: 'น้ำหนัก', en: 'Weight' },
  unit_cm: { th: 'ซม.', en: 'cm' },
  unit_kg: { th: 'กก.', en: 'kg' },
  privacy_note: { th: 'ส่วนตัว · เว้นว่างได้', en: 'Private · optional' },

  // ── Buttons ──
  button_continue: { th: 'ไปต่อ', en: 'Continue' },
  button_done: { th: 'เสร็จสิ้น', en: 'Done' },
  button_start: { th: 'เริ่มใช้ RALLY', en: 'Start RALLY' },
  button_saving: { th: 'กำลังบันทึก…', en: 'Saving…' },
  button_cancel: { th: 'ยกเลิก', en: 'Cancel' },
  button_close: { th: 'ปิด', en: 'Close' },

  // ── Sports screen chrome ──
  sports_selected_count: { th: 'เลือกแล้ว ({count})', en: 'Selected ({count})' },
  sports_badge_available: { th: 'แข่งได้เลย', en: 'Playable' },

  // ── Sport names (activity slug → label) ──
  sport_basketball: { th: 'บาสเกตบอล', en: 'Basketball' },
  sport_running: { th: 'วิ่ง', en: 'Running' },
  sport_badminton: { th: 'แบดมินตัน', en: 'Badminton' },
  sport_football: { th: 'ฟุตบอล', en: 'Football' },
  sport_cycling: { th: 'ปั่นจักรยาน', en: 'Cycling' },
  sport_gym: { th: 'ฟิตเนส', en: 'Gym' },
  sport_swimming: { th: 'ว่ายน้ำ', en: 'Swimming' },
  sport_tennis: { th: 'เทนนิส', en: 'Tennis' },
  sport_boxing: { th: 'มวย', en: 'Boxing' },
  sport_pingpong: { th: 'ปิงปอง', en: 'Table Tennis' },
  sport_volleyball: { th: 'วอลเลย์บอล', en: 'Volleyball' },
  sport_golf: { th: 'กอล์ฟ', en: 'Golf' },

  // ── Experience levels (value → label + helper) ──
  level_beginner: { th: 'มือใหม่', en: 'Beginner' },
  level_casual: { th: 'เล่นสนุก', en: 'Casual' },
  level_competitive: { th: 'จริงจัง', en: 'Competitive' },
  level_pro: { th: 'โปร', en: 'Pro' },
  level_helper_beginner: { th: 'เพิ่งเริ่มต้น', en: 'Just starting out' },
  level_helper_casual: { th: 'เล่นสนุก สม่ำเสมอ', en: 'Casual & regular' },
  level_helper_competitive: { th: 'จริงจัง ชอบวัดผล', en: 'Competitive & measured' },
  level_helper_pro: { th: 'แข่งขันระดับสูง', en: 'High-level competition' },

  // ── Gender (value slug → label) ──
  gender_male: { th: 'ชาย', en: 'Male' },
  gender_female: { th: 'หญิง', en: 'Female' },
  gender_other: { th: 'อื่นๆ', en: 'Other' },
  gender_prefer_not_to_say: { th: 'ไม่ระบุ', en: 'Prefer not to say' },

  // ── Basketball positions (value → label) — TH transliterated per spec ──
  position_pg: { th: 'พอยต์การ์ด', en: 'PG' },
  position_sg: { th: 'ชู้ตติ้งการ์ด', en: 'SG' },
  position_sf: { th: 'สมอลฟอร์เวิร์ด', en: 'SF' },
  position_pf: { th: 'เพาเวอร์ฟอร์เวิร์ด', en: 'PF' },
  position_c: { th: 'เซ็นเตอร์', en: 'C' },

  // ── Basketball play styles (unchanged values) ──
  style_shooter: { th: 'ชู้ตเตอร์', en: 'Shooter' },
  style_slasher: { th: 'สายบุกทำแต้ม', en: 'Slasher' },
  style_playmaker: { th: 'เพลย์เมกเกอร์', en: 'Playmaker' },
  style_defense: { th: 'สายเกมรับ', en: 'Defense' },
  style_streetball: { th: 'สตรีทบอล', en: 'Streetball' },

  // ── Running play styles (new set) ──
  style_marathon: { th: 'สายมาราธอน', en: 'Marathon' },
  style_trail: { th: 'สายเทรล', en: 'Trail' },
  style_track: { th: 'สายลู่', en: 'Track' },
  style_fun_run: { th: 'ฟันรัน', en: 'Fun Run' },
  style_race: { th: 'สายแข่ง', en: 'Race' },

  // ── Badminton positions (new; badminton styles removed entirely) ──
  bmpos_front: { th: 'หน้า', en: 'Front Court' },
  bmpos_rear: { th: 'หลัง', en: 'Rear Court' },
  bmpos_defense: { th: 'ตั้งรับ', en: 'Defense' },
  bmpos_rotation: { th: 'ยืนสับหว่าง', en: 'Rotation' },

  // ── Date-of-birth picker ──
  dob_picker_month: { th: 'เดือนเกิด', en: 'Birth month' },
  dob_picker_year: { th: 'ปีเกิด (ค.ศ.)', en: 'Birth year (CE)' },
  dob_label_month: { th: 'เดือน', en: 'Month' },
  dob_label_year: { th: 'ปี ค.ศ.', en: 'Year (CE)' },
  dob_placeholder: { th: 'เลือก', en: 'Select' },
  month_1: { th: 'มกราคม', en: 'January' },
  month_2: { th: 'กุมภาพันธ์', en: 'February' },
  month_3: { th: 'มีนาคม', en: 'March' },
  month_4: { th: 'เมษายน', en: 'April' },
  month_5: { th: 'พฤษภาคม', en: 'May' },
  month_6: { th: 'มิถุนายน', en: 'June' },
  month_7: { th: 'กรกฎาคม', en: 'July' },
  month_8: { th: 'สิงหาคม', en: 'August' },
  month_9: { th: 'กันยายน', en: 'September' },
  month_10: { th: 'ตุลาคม', en: 'October' },
  month_11: { th: 'พฤศจิกายน', en: 'November' },
  month_12: { th: 'ธันวาคม', en: 'December' },

  // ── Alerts / errors ──
  alert_cannot_continue: { th: 'ยังไปต่อไม่ได้', en: "Can't continue yet" },
  alert_avatar_failed: { th: 'อัปโหลดรูปไม่สำเร็จ', en: 'Avatar upload failed' },
  alert_name_invalid: { th: 'ชื่อยังไม่ถูกต้อง', en: "Name isn't valid" },
  alert_name_set_failed: { th: 'ตั้งชื่อไม่สำเร็จ', en: "Couldn't set name" },
  error_try_again: { th: 'ลองใหม่อีกครั้ง', en: 'Please try again' },
  error_username_format: { th: 'ใช้ได้เฉพาะ a-z, 0-9, _ ยาว 3–20 ตัว', en: 'Use a-z, 0-9, _ (3–20 chars)' },
  error_username_taken: { th: 'ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นดูนะ', en: 'That name is taken — try another' },

  // ── Accessibility labels ──
  a11y_back: { th: 'ย้อนกลับ', en: 'Go back' },
  a11y_close: { th: 'ปิด', en: 'Close' },
  a11y_pick_avatar: { th: 'เลือกรูปโปรไฟล์', en: 'Pick profile photo' },
  a11y_username_field: { th: 'ชื่อที่ใช้ในแอป', en: 'Display name' },
  a11y_cancel_rename: { th: 'ยกเลิกการเปลี่ยนชื่อ', en: 'Cancel rename' },
  a11y_change_name: { th: 'เปลี่ยนชื่อ', en: 'Change name' },
  a11y_height: { th: 'ส่วนสูง เซนติเมตร', en: 'Height in centimetres' },
  a11y_weight: { th: 'น้ำหนัก กิโลกรัม', en: 'Weight in kilograms' },
} satisfies Dictionary
