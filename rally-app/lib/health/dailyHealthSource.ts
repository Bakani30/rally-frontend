import { Platform } from 'react-native'
import { bangkokDayRange } from './bangkokDay'
import { readAndroidDailyHealthMetrics } from './androidDailyHealthSource'
import type { DailyHealthMetrics } from './dailyHealthTypes'

export async function readDeviceDailyHealthMetrics(): Promise<DailyHealthMetrics> {
  const window = bangkokDayRange()
  if (Platform.OS === 'ios') {
    const { readIosDailyHealthMetrics } = require('./iosDailyHealthSource')
    return readIosDailyHealthMetrics(window)
  }
  if (Platform.OS === 'android') return readAndroidDailyHealthMetrics(window)
  throw new Error('Daily mission health sync needs iOS or Android')
}
