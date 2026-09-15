import { RefereeMetricStrip } from '@/components/referee/RefereeMetricStrip'
import { useI18n } from '@/hooks/useI18n'
import { refereeDictionary } from '@/lib/i18n/dictionaries/referee'

type RefereeProfileStatsProps = {
  matchesRefereed: number
  rating: number | null
  cleanPct: number | null
  disputes: number
}

// Four lifetime referee counters in one card (mirrors ProfileStatsCard). Rating
// is a decimal so all cells use plain tabular text rather than count-up.
export function RefereeProfileStats({ matchesRefereed, rating, cleanPct, disputes }: RefereeProfileStatsProps) {
  const { t } = useI18n(refereeDictionary)
  return (
    <RefereeMetricStrip
      items={[
        { label: t('metricMatches'), value: String(matchesRefereed), tone: 'default' },
        { label: t('metricRating'), value: rating == null ? '—' : rating.toFixed(1), tone: 'positive' },
        { label: t('metricClean'), value: cleanPct == null ? '—' : `${cleanPct}%`, tone: 'default' },
        { label: t('metricDisputes'), value: String(disputes), tone: 'danger' },
      ]}
    />
  )
}
