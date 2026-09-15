import {
  DAILY_MISSION_DISTANCE_METERS,
  type DailyMissionInsight,
} from './dailyMissionTypes'

export function analyzeDailyMissionHealth(
  distanceMeters: number,
  steps: number,
): DailyMissionInsight {
  if (distanceMeters >= DAILY_MISSION_DISTANCE_METERS * 1.75) {
    return {
      status: 'high_load',
      title: 'โหลดวันนี้สูง',
      body: 'ถึงเป้าแล้ว เหลือแค่รักษาร่างกายให้ฟื้นตัวดี',
    }
  }
  if (distanceMeters >= DAILY_MISSION_DISTANCE_METERS) {
    return {
      status: 'goal_met',
      title: 'ครบ 7km แล้ว',
      body: 'ข้อมูลเครื่องพร้อมใช้ claim daily mission วันนี้',
    }
  }
  if (distanceMeters >= DAILY_MISSION_DISTANCE_METERS * 0.7 || steps >= 7000) {
    return {
      status: 'near_goal',
      title: 'ใกล้ถึงเป้า',
      body: 'เดินหรือวิ่งต่ออีกนิดเดียวก็ครบ mission วันนี้',
    }
  }
  return {
    status: 'needs_movement',
    title: 'ยังไม่ถึงเป้า',
    body: 'สะสมระยะเดินและวิ่งให้ครบ 7km เพื่อรับแต้ม',
  }
}
