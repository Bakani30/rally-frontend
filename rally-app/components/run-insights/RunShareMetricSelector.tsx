import { StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

import { PressableScale } from '@/components/motion/PressableScale'
import { runFlowColors, type RunFlowColors } from '@/components/run/theme/runFlowColors'
import { useThemeMode } from '@/hooks/useAppTheme'
import type { RunShareCandidate } from '@/lib/run-insights'

type RunShareMetricSelectorProps = {
  publicMetrics: RunShareCandidate[]
  sensitiveMetrics: RunShareCandidate[]
  selectedMetricIds: readonly string[]
  sensitiveMetricsEnabled: boolean
  onToggleMetric: (metricId: string) => void
  onToggleSensitiveMetrics: () => void
}

export function RunShareMetricSelector({
  publicMetrics,
  sensitiveMetrics,
  selectedMetricIds,
  sensitiveMetricsEnabled,
  onToggleMetric,
  onToggleSensitiveMetrics,
}: RunShareMetricSelectorProps) {
  const mode = useThemeMode()
  const colors = runFlowColors(mode)
  const styles = createStyles(colors)
  const selected = new Set(selectedMetricIds)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>การ์ดแชร์</Text>
          <Text style={styles.title}>เลือกค่าที่จะโชว์</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{selectedMetricIds.length}</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        {publicMetrics.map((metric) => (
          <MetricPill
            key={metric.id}
            metric={metric}
            selected={selected.has(metric.id)}
            onPress={() => onToggleMetric(metric.id)}
            colors={colors}
          />
        ))}
      </View>

      {sensitiveMetrics.length > 0 && (
        <View style={styles.sensitiveBlock}>
          <PressableScale
            style={[styles.sensitiveToggle, sensitiveMetricsEnabled && styles.sensitiveToggleOn]}
            onPress={onToggleSensitiveMetrics}
            accessibilityLabel="สลับข้อมูลละเอียดอ่อน"
          >
            <MaterialCommunityIcons
              name={sensitiveMetricsEnabled ? 'lock-open-variant-outline' : 'lock-outline'}
              size={17}
              color={sensitiveMetricsEnabled ? colors.onAccent : colors.accent}
            />
            <View style={styles.sensitiveCopy}>
              <Text style={[styles.sensitiveTitle, sensitiveMetricsEnabled && styles.sensitiveTitleOn]}>
                ข้อมูลละเอียดอ่อน
              </Text>
              <Text style={[styles.sensitiveSub, sensitiveMetricsEnabled && styles.sensitiveSubOn]}>
                HR/recovery จะแชร์เมื่อคุณเปิดเองเท่านั้น
              </Text>
            </View>
          </PressableScale>

          {sensitiveMetricsEnabled && (
            <View style={styles.metricGrid}>
              {sensitiveMetrics.map((metric) => (
                <MetricPill
                  key={metric.id}
                  metric={metric}
                  selected={selected.has(metric.id)}
                  onPress={() => onToggleMetric(metric.id)}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function MetricPill({
  metric,
  selected,
  onPress,
  colors,
}: {
  metric: RunShareCandidate
  selected: boolean
  onPress: () => void
  colors: RunFlowColors
}) {
  const styles = createStyles(colors)
  return (
    <PressableScale
      style={[styles.metricPill, selected && styles.metricPillSelected]}
      onPress={onPress}
      accessibilityLabel={`${selected ? 'เอาออก' : 'เพิ่ม'} ${metric.label}`}
    >
      <MaterialCommunityIcons
        name={selected ? 'check-circle' : 'plus-circle-outline'}
        size={16}
        color={selected ? colors.onAccent : colors.pillIdleText}
      />
      <View style={styles.metricCopy}>
        <Text style={[styles.metricValue, selected && styles.metricValueSelected]} numberOfLines={1}>
          {metric.value}
        </Text>
        <Text style={[styles.metricLabel, selected && styles.metricLabelSelected]} numberOfLines={1}>
          {metric.label}
        </Text>
      </View>
    </PressableScale>
  )
}

function createStyles(colors: RunFlowColors) {
  return StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: colors.eyebrow,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
    countBadge: {
      minWidth: 36,
      height: 36,
      borderRadius: 18,
      paddingHorizontal: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    metricPill: {
      minHeight: 54,
      width: '48%',
      minWidth: 132,
      flexGrow: 1,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.pillIdleBorder,
      backgroundColor: colors.pillIdleBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    metricPillSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    metricCopy: { flex: 1, minWidth: 0 },
    metricValue: { color: colors.text, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
    metricValueSelected: { color: colors.onAccent },
    metricLabel: { color: colors.pillIdleText, fontSize: 10, fontWeight: '900', marginTop: 1 },
    metricLabelSelected: { color: colors.onAccent },
    sensitiveBlock: {
      borderTopWidth: 1,
      borderTopColor: colors.secondaryBorder,
      paddingTop: 12,
      gap: 10,
    },
    sensitiveToggle: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.pillIdleBorder,
      backgroundColor: colors.pillIdleBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },
    sensitiveToggleOn: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    sensitiveCopy: { flex: 1, minWidth: 0 },
    sensitiveTitle: { color: colors.accent, fontSize: 13, fontWeight: '900' },
    sensitiveTitleOn: { color: colors.onAccent },
    sensitiveSub: { color: colors.subText, fontSize: 11, fontWeight: '800', marginTop: 1 },
    sensitiveSubOn: { color: colors.onAccent },
  })
}
