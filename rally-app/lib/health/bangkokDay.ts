const BANGKOK_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayBangkokDate(now = new Date()): string {
  return BANGKOK_DATE_FMT.format(now)
}

export function bangkokDayRange(missionDate = todayBangkokDate()) {
  const start = new Date(`${missionDate}T00:00:00+07:00`)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { missionDate, start, end }
}
