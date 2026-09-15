import type { CompetitionCategory } from '@/lib/profile/analysisProfileTypes'

export type RunBenchmarkSourceKey =
  | 'age_grade_road_2025'
  | 'adult_compendium_running_2024'
  | 'strava_year_in_sport_2025'
  | 'runsignup_racetrends_2025'

export type RunBenchmarkSource = {
  key: RunBenchmarkSourceKey
  sourceName: string
  sourceUrl: string
  season: string
  version: string
  license: string
  reviewedAt: string
  comparisonMode: 'numeric' | 'source_note'
}

export type RunBenchmarkDistanceKey = '5k' | '10k' | 'half_marathon' | 'marathon'

type AgeGradeCategory = Extract<CompetitionCategory, 'men' | 'women'>

type AgeGradeTable = {
  distanceMeters: number
  label: string
  standardSeconds: Record<AgeGradeCategory, number>
  factors: Record<AgeGradeCategory, number[]>
}

export type RunAgeGradeBenchmark = {
  distanceKey: RunBenchmarkDistanceKey
  distanceLabel: string
  age: number
  category: AgeGradeCategory
  ageFactor: number
  standardSeconds: number
  adjustedSeconds: number
  ageGradePercent: number
  contextOnly: true
  source: RunBenchmarkSource
}

export type RunningEffortBenchmark = {
  met: number
  speedMph: number
  intensityBand: 'light' | 'moderate' | 'vigorous'
  activityCode: string
  activityLabel: string
  contextOnly: true
  source: RunBenchmarkSource
}

export const RUN_BENCHMARK_SOURCES = {
  ageGrade: {
    key: 'age_grade_road_2025',
    sourceName: 'Alan Jones 2025 Long Distance Running Age-Grade Tables',
    sourceUrl: 'https://github.com/AlanLyttonJones/Age-Grade-Tables/tree/master/2025%20Files',
    season: '2025',
    version: '2025 road standards, approved 2025-01-10',
    license: 'CC0-1.0',
    reviewedAt: '2026-05-26',
    comparisonMode: 'numeric',
  },
  compendium: {
    key: 'adult_compendium_running_2024',
    sourceName: '2024 Adult Compendium of Physical Activities: Running',
    sourceUrl: 'https://pacompendium.com/running/',
    season: '2024',
    version: '2024 Adult Compendium running MET values',
    license: 'Source-reviewed public reference',
    reviewedAt: '2026-05-26',
    comparisonMode: 'numeric',
  },
  stravaTrend: {
    key: 'strava_year_in_sport_2025',
    sourceName: 'Strava Year In Sport Trend Report',
    sourceUrl: 'https://press.strava.com/en-gb/articles/strava-releases-12th-annual-year-in-sport-trend-report-2025',
    season: '2025',
    version: '12th annual trend report, published 2025-12-02',
    license: 'Source report; labels only',
    reviewedAt: '2026-05-26',
    comparisonMode: 'source_note',
  },
  runSignupTrend: {
    key: 'runsignup_racetrends_2025',
    sourceName: 'RunSignup 2025 RaceTrends Report',
    sourceUrl: 'https://info.runsignup.com/2026/02/02/2025-race-trends-report/',
    season: '2025',
    version: 'Annual RaceTrends industry report, published 2026-02-02',
    license: 'Source report; labels only',
    reviewedAt: '2026-05-26',
    comparisonMode: 'source_note',
  },
} as const satisfies Record<string, RunBenchmarkSource>

const RUN_BENCHMARK_SOURCE_LIST: RunBenchmarkSource[] = [
  RUN_BENCHMARK_SOURCES.ageGrade,
  RUN_BENCHMARK_SOURCES.compendium,
  RUN_BENCHMARK_SOURCES.stravaTrend,
  RUN_BENCHMARK_SOURCES.runSignupTrend,
]

const AGE_FACTOR_MIN_AGE = 5

const AGE_GRADE_TABLES: Record<RunBenchmarkDistanceKey, AgeGradeTable> = {
  '5k': {
    distanceMeters: 5000,
    label: '5K',
    standardSeconds: { men: 769, women: 834 },
    factors: {
      men: [
        0.6080, 0.6664, 0.7200, 0.7688, 0.8128, 0.8520, 0.8864, 0.9160, 0.9408, 0.9608, 0.9760, 0.9864,
        0.9944, 0.9995, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000,
        1.0000, 0.9999, 0.9988, 0.9965, 0.9930, 0.9883, 0.9824, 0.9755, 0.9685, 0.9615, 0.9545, 0.9475,
        0.9405, 0.9335, 0.9265, 0.9195, 0.9125, 0.9055, 0.8985, 0.8915, 0.8845, 0.8775, 0.8705, 0.8635,
        0.8565, 0.8495, 0.8425, 0.8355, 0.8285, 0.8215, 0.8145, 0.8075, 0.8005, 0.7935, 0.7865, 0.7795,
        0.7725, 0.7655, 0.7585, 0.7514, 0.7436, 0.7353, 0.7264, 0.7169, 0.7068, 0.6960, 0.6847, 0.6728,
        0.6603, 0.6472, 0.6334, 0.6191, 0.6042, 0.5887, 0.5726, 0.5558, 0.5385, 0.5206, 0.5021, 0.4830,
        0.4632, 0.4429, 0.4220, 0.4005, 0.3784, 0.3556, 0.3323, 0.3084, 0.2839, 0.2588, 0.2330,
      ],
      women: [
        0.6903, 0.7222, 0.7527, 0.7816, 0.8091, 0.8351, 0.8596, 0.8827, 0.9042, 0.9243, 0.9433, 0.9622,
        0.9811, 0.9953, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.9997, 0.9990,
        0.9977, 0.9959, 0.9936, 0.9908, 0.9875, 0.9836, 0.9793, 0.9744, 0.9691, 0.9632, 0.9568, 0.9499,
        0.9425, 0.9346, 0.9262, 0.9172, 0.9078, 0.8980, 0.8883, 0.8786, 0.8689, 0.8592, 0.8495, 0.8398,
        0.8301, 0.8204, 0.8107, 0.8009, 0.7912, 0.7815, 0.7718, 0.7621, 0.7524, 0.7427, 0.7330, 0.7233,
        0.7136, 0.7038, 0.6941, 0.6844, 0.6747, 0.6650, 0.6553, 0.6456, 0.6359, 0.6262, 0.6165, 0.6067,
        0.5970, 0.5868, 0.5758, 0.5640, 0.5515, 0.5382, 0.5242, 0.5094, 0.4938, 0.4775, 0.4604, 0.4426,
        0.4240, 0.4046, 0.3845, 0.3636, 0.3419, 0.3195, 0.2964, 0.2725, 0.2478, 0.2223, 0.1961,
      ],
    },
  },
  '10k': {
    distanceMeters: 10000,
    label: '10K',
    standardSeconds: { men: 1584, women: 1726 },
    factors: {
      men: [
        0.5073, 0.5678, 0.6243, 0.6768, 0.7253, 0.7698, 0.8103, 0.8468, 0.8793, 0.9078, 0.9323, 0.9528,
        0.9693, 0.9818, 0.9903, 0.9968, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000,
        1.0000, 1.0000, 0.9996, 0.9985, 0.9967, 0.9942, 0.9909, 0.9869, 0.9822, 0.9767, 0.9705, 0.9636,
        0.9561, 0.9486, 0.9411, 0.9336, 0.9261, 0.9186, 0.9111, 0.9036, 0.8961, 0.8886, 0.8811, 0.8736,
        0.8661, 0.8586, 0.8511, 0.8436, 0.8361, 0.8286, 0.8211, 0.8136, 0.8061, 0.7986, 0.7911, 0.7836,
        0.7761, 0.7686, 0.7611, 0.7536, 0.7461, 0.7386, 0.7308, 0.7223, 0.7131, 0.7033, 0.6928, 0.6816,
        0.6697, 0.6572, 0.6440, 0.6301, 0.6156, 0.6004, 0.5845, 0.5680, 0.5508, 0.5329, 0.5143, 0.4951,
        0.4752, 0.4546, 0.4334, 0.4115, 0.3889, 0.3657, 0.3418, 0.3172, 0.2919, 0.2660, 0.2394,
      ],
      women: [
        0.6850, 0.7183, 0.7498, 0.7794, 0.8072, 0.8333, 0.8574, 0.8798, 0.9004, 0.9191, 0.9360, 0.9520,
        0.9680, 0.9820, 0.9920, 0.9980, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.9998,
        0.9991, 0.9980, 0.9964, 0.9944, 0.9920, 0.9891, 0.9857, 0.9819, 0.9777, 0.9730, 0.9679, 0.9623,
        0.9563, 0.9499, 0.9429, 0.9356, 0.9278, 0.9195, 0.9109, 0.9017, 0.8921, 0.8822, 0.8723, 0.8623,
        0.8524, 0.8425, 0.8325, 0.8226, 0.8126, 0.8027, 0.7928, 0.7828, 0.7729, 0.7629, 0.7530, 0.7431,
        0.7331, 0.7232, 0.7132, 0.7033, 0.6934, 0.6834, 0.6735, 0.6635, 0.6536, 0.6437, 0.6337, 0.6234,
        0.6123, 0.6005, 0.5879, 0.5745, 0.5604, 0.5455, 0.5299, 0.5135, 0.4963, 0.4784, 0.4597, 0.4403,
        0.4201, 0.3991, 0.3774, 0.3549, 0.3317, 0.3077, 0.2829, 0.2574, 0.2311, 0.2041, 0.1763,
      ],
    },
  },
  half_marathon: {
    distanceMeters: 21097.5,
    label: 'Half marathon',
    standardSeconds: { men: 3451, women: 3772 },
    factors: {
      men: [
        0.4621, 0.5364, 0.6050, 0.6678, 0.7248, 0.7762, 0.8218, 0.8616, 0.8957, 0.9241, 0.9467, 0.9636,
        0.9750, 0.9850, 0.9950, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000,
        1.0000, 1.0000, 1.0000, 0.9996, 0.9982, 0.9960, 0.9928, 0.9888, 0.9839, 0.9781, 0.9714, 0.9638,
        0.9560, 0.9483, 0.9405, 0.9327, 0.9249, 0.9171, 0.9094, 0.9016, 0.8938, 0.8860, 0.8782, 0.8705,
        0.8627, 0.8549, 0.8471, 0.8393, 0.8316, 0.8238, 0.8160, 0.8082, 0.8004, 0.7927, 0.7849, 0.7771,
        0.7693, 0.7615, 0.7538, 0.7460, 0.7382, 0.7304, 0.7223, 0.7135, 0.7040, 0.6938, 0.6830, 0.6715,
        0.6593, 0.6464, 0.6328, 0.6185, 0.6036, 0.5880, 0.5717, 0.5547, 0.5370, 0.5186, 0.4996, 0.4799,
        0.4595, 0.4384, 0.4167, 0.3942, 0.3711, 0.3473, 0.3228, 0.2976, 0.2718, 0.2452, 0.2180,
      ],
      women: [
        0.6080, 0.6474, 0.6847, 0.7200, 0.7533, 0.7845, 0.8137, 0.8408, 0.8659, 0.8890, 0.9100, 0.9300,
        0.9500, 0.9680, 0.9820, 0.9920, 0.9980, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.9998,
        0.9991, 0.9979, 0.9962, 0.9941, 0.9915, 0.9884, 0.9849, 0.9809, 0.9764, 0.9714, 0.9660, 0.9601,
        0.9537, 0.9468, 0.9395, 0.9317, 0.9234, 0.9147, 0.9055, 0.8958, 0.8856, 0.8753, 0.8649, 0.8546,
        0.8442, 0.8339, 0.8235, 0.8132, 0.8028, 0.7925, 0.7821, 0.7718, 0.7614, 0.7511, 0.7407, 0.7304,
        0.7200, 0.7097, 0.6993, 0.6890, 0.6786, 0.6683, 0.6579, 0.6476, 0.6372, 0.6269, 0.6165, 0.6059,
        0.5945, 0.5822, 0.5692, 0.5554, 0.5407, 0.5253, 0.5091, 0.4921, 0.4742, 0.4556, 0.4362, 0.4159,
        0.3949, 0.3731, 0.3504, 0.3270, 0.3028, 0.2778, 0.2519, 0.2253, 0.1979, 0.1696, 0.1406,
      ],
    },
  },
  marathon: {
    distanceMeters: 42195,
    label: 'Marathon',
    standardSeconds: { men: 7235, women: 7796 },
    factors: {
      men: [
        0.4414, 0.5080, 0.5702, 0.6279, 0.6812, 0.7301, 0.7745, 0.8145, 0.8500, 0.8811, 0.9078, 0.9300,
        0.9500, 0.9680, 0.9820, 0.9920, 0.9980, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000,
        1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 1.0000, 0.9999, 0.9979, 0.9934, 0.9865, 0.9783,
        0.9701, 0.9619, 0.9537, 0.9455, 0.9373, 0.9291, 0.9209, 0.9127, 0.9045, 0.8963, 0.8881, 0.8799,
        0.8717, 0.8635, 0.8553, 0.8471, 0.8389, 0.8307, 0.8225, 0.8143, 0.8061, 0.7979, 0.7897, 0.7815,
        0.7733, 0.7651, 0.7569, 0.7487, 0.7405, 0.7323, 0.7241, 0.7155, 0.7063, 0.6963, 0.6857, 0.6743,
        0.6623, 0.6495, 0.6361, 0.6219, 0.6071, 0.5915, 0.5753, 0.5583, 0.5407, 0.5223, 0.5033, 0.4835,
        0.4631, 0.4419, 0.4201, 0.3975, 0.3743, 0.3503, 0.3257, 0.3003, 0.2743, 0.2475, 0.2201,
      ],
      women: [
        0.5405, 0.5874, 0.6311, 0.6718, 0.7093, 0.7438, 0.7751, 0.8034, 0.8285, 0.8506, 0.8695, 0.8869,
        0.9043, 0.9217, 0.9391, 0.9553, 0.9689, 0.9801, 0.9888, 0.9950, 0.9988, 1.0000, 1.0000, 0.9998,
        0.9992, 0.9983, 0.9970, 0.9953, 0.9932, 0.9907, 0.9879, 0.9847, 0.9811, 0.9771, 0.9727, 0.9680,
        0.9629, 0.9574, 0.9515, 0.9453, 0.9386, 0.9316, 0.9242, 0.9165, 0.9083, 0.8998, 0.8909, 0.8816,
        0.8720, 0.8619, 0.8515, 0.8407, 0.8297, 0.8186, 0.8076, 0.7965, 0.7854, 0.7744, 0.7633, 0.7523,
        0.7412, 0.7301, 0.7191, 0.7080, 0.6970, 0.6859, 0.6748, 0.6638, 0.6527, 0.6413, 0.6290, 0.6159,
        0.6021, 0.5874, 0.5720, 0.5557, 0.5386, 0.5208, 0.5021, 0.4827, 0.4624, 0.4413, 0.4195, 0.3968,
        0.3734, 0.3491, 0.3240, 0.2982, 0.2715, 0.2441, 0.2158, 0.1867, 0.1569, 0.1262, 0.0948,
      ],
    },
  },
}

const RUNNING_EFFORT_BANDS = [
  { activityCode: '12028', speedMph: 4.1, met: 6.5, activityLabel: 'Running, 4 to 4.2 mph' },
  { activityCode: '12029', speedMph: 4.6, met: 7.8, activityLabel: 'Running, 4.3 to 4.8 mph' },
  { activityCode: '12030', speedMph: 5.1, met: 8.5, activityLabel: 'Running, 5.0 to 5.2 mph' },
  { activityCode: '12045', speedMph: 5.7, met: 9.0, activityLabel: 'Running, 5.5 to 5.8 mph' },
  { activityCode: '12050', speedMph: 6.1, met: 9.3, activityLabel: 'Running, 6.0 to 6.3 mph' },
  { activityCode: '12060', speedMph: 6.7, met: 10.5, activityLabel: 'Running, 6.7 mph' },
  { activityCode: '12070', speedMph: 7.0, met: 11.0, activityLabel: 'Running, 7 mph' },
  { activityCode: '12080', speedMph: 7.5, met: 11.8, activityLabel: 'Running, 7.5 mph' },
  { activityCode: '12090', speedMph: 8.0, met: 12.0, activityLabel: 'Running, 8 mph' },
  { activityCode: '12100', speedMph: 8.6, met: 12.5, activityLabel: 'Running, 8.6 mph' },
  { activityCode: '12110', speedMph: 9.0, met: 13.0, activityLabel: 'Running, 9 mph' },
  { activityCode: '12120', speedMph: 10.0, met: 14.8, activityLabel: 'Running, 10 mph' },
  { activityCode: '12130', speedMph: 11.0, met: 16.8, activityLabel: 'Running, 11 mph' },
  { activityCode: '12132', speedMph: 12.0, met: 18.5, activityLabel: 'Running, 12 mph' },
  { activityCode: '12134', speedMph: 13.0, met: 19.8, activityLabel: 'Running, 13 mph' },
] as const

export function getRunBenchmarkSources(): RunBenchmarkSource[] {
  return [...RUN_BENCHMARK_SOURCE_LIST]
}

export function getRunTrendBenchmarkSources(): RunBenchmarkSource[] {
  return [
    RUN_BENCHMARK_SOURCES.stravaTrend,
    RUN_BENCHMARK_SOURCES.runSignupTrend,
  ]
}

export function resolveAgeGradeBenchmark({
  distanceMeters,
  movingTimeSeconds,
  age,
  category,
}: {
  distanceMeters: number | null | undefined
  movingTimeSeconds: number | null | undefined
  age: number | null | undefined
  category: CompetitionCategory | null | undefined
}): RunAgeGradeBenchmark | null {
  if (
    distanceMeters == null ||
    movingTimeSeconds == null ||
    age == null ||
    distanceMeters <= 0 ||
    movingTimeSeconds <= 0
  ) {
    return null
  }

  const ageGradeCategory = normalizeAgeGradeCategory(category)
  if (!ageGradeCategory) return null

  const tableEntry = findSupportedAgeGradeTable(distanceMeters)
  if (!tableEntry) return null

  const roundedAge = Math.floor(age)
  const factor = tableEntry.table.factors[ageGradeCategory][roundedAge - AGE_FACTOR_MIN_AGE]
  if (factor == null || factor <= 0) return null

  const standardSeconds = tableEntry.table.standardSeconds[ageGradeCategory]
  const adjustedSeconds = movingTimeSeconds * factor
  const ageGradePercent = (standardSeconds / adjustedSeconds) * 100

  return {
    distanceKey: tableEntry.key,
    distanceLabel: tableEntry.table.label,
    age: roundedAge,
    category: ageGradeCategory,
    ageFactor: factor,
    standardSeconds,
    adjustedSeconds,
    ageGradePercent,
    contextOnly: true,
    source: RUN_BENCHMARK_SOURCES.ageGrade,
  }
}

export function resolveRunningEffortBenchmark(
  paceSecondsPerKm: number | null | undefined,
): RunningEffortBenchmark | null {
  if (paceSecondsPerKm == null || paceSecondsPerKm <= 0) return null

  const speedMph = 3600 / paceSecondsPerKm / 1.609344
  const band = RUNNING_EFFORT_BANDS.reduce((nearest, candidate) => (
    Math.abs(candidate.speedMph - speedMph) < Math.abs(nearest.speedMph - speedMph)
      ? candidate
      : nearest
  ), RUNNING_EFFORT_BANDS[0])

  return {
    met: band.met,
    speedMph,
    intensityBand: intensityBandForMet(band.met),
    activityCode: band.activityCode,
    activityLabel: band.activityLabel,
    contextOnly: true,
    source: RUN_BENCHMARK_SOURCES.compendium,
  }
}

function normalizeAgeGradeCategory(category: CompetitionCategory | null | undefined): AgeGradeCategory | null {
  if (category === 'men' || category === 'women') return category
  return null
}

function findSupportedAgeGradeTable(distanceMeters: number): {
  key: RunBenchmarkDistanceKey
  table: AgeGradeTable
} | null {
  const entries = Object.entries(AGE_GRADE_TABLES) as Array<[RunBenchmarkDistanceKey, AgeGradeTable]>
  const candidates = entries
    .map(([key, table]) => ({
      key,
      table,
      distanceDelta: Math.abs(distanceMeters - table.distanceMeters),
      tolerance: Math.max(200, table.distanceMeters * 0.025),
    }))
    .filter((candidate) => candidate.distanceDelta <= candidate.tolerance)
    .sort((a, b) => a.distanceDelta - b.distanceDelta)

  return candidates[0] ?? null
}

function intensityBandForMet(met: number): RunningEffortBenchmark['intensityBand'] {
  if (met >= 6) return 'vigorous'
  if (met >= 3) return 'moderate'
  return 'light'
}
