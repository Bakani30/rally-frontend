import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useState } from 'react'

import { PressableScale } from '@/components/motion/PressableScale'
import { ProfileFrame } from '@/components/profile/ProfileFrame'
import { useSportTheme } from '@/hooks/useAppTheme'
import type { FriendCandidate } from '@/lib/users/friendCandidateService'
import type { FriendDiscoveryLocationStatus } from '@/hooks/useFriendDiscoveryLocation'
import { createFriendsHubStyles } from './friendsHubStyles'

export type FriendsRecommendationRailProps = {
  candidates: FriendCandidate[]
  isAuthenticated: boolean
  isLoading: boolean
  hasError: boolean
  isRetrying: boolean
  onRetry: () => void
  onOpenCandidate: (candidate: FriendCandidate) => void
  onAddCandidate: (candidate: FriendCandidate) => Promise<boolean>
  locationAgeEligible: boolean
  locationStatus: FriendDiscoveryLocationStatus
  locationEnabled: boolean
  onEnableLocation: () => void
  onDisableLocation: () => void
  onOpenLocationSettings: () => void
}

export function FriendsRecommendationRail({
  candidates,
  isAuthenticated,
  isLoading,
  hasError,
  isRetrying,
  onRetry,
  onOpenCandidate,
  onAddCandidate,
  locationAgeEligible,
  locationStatus,
  locationEnabled,
  onEnableLocation,
  onDisableLocation,
  onOpenLocationSettings,
}: FriendsRecommendationRailProps) {
  const theme = useSportTheme()
  const styles = createFriendsHubStyles(theme)
  const [addedCandidateIds, setAddedCandidateIds] = useState<Set<string>>(() => new Set())
  const [addingCandidateIds, setAddingCandidateIds] = useState<Set<string>>(() => new Set())

  if (!isAuthenticated) return null

  const showLoading = isLoading && candidates.length === 0
  const showError = hasError && candidates.length === 0

  async function handleAddCandidate(candidate: FriendCandidate) {
    if (addedCandidateIds.has(candidate.id) || addingCandidateIds.has(candidate.id)) return

    setAddingCandidateIds((current) => new Set(current).add(candidate.id))
    try {
      const succeeded = await onAddCandidate(candidate)
      if (succeeded) {
        setAddedCandidateIds((current) => new Set(current).add(candidate.id))
      }
    } catch {
      // Keep the control retryable when the parent mutation rejects.
    } finally {
      setAddingCandidateIds((current) => {
        const next = new Set(current)
        next.delete(candidate.id)
        return next
      })
    }
  }

  return (
    <View style={styles.recommendationSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>แนะนำ</Text>
        {locationAgeEligible ? (
          <PressableScale
            style={[styles.locationToggle, locationEnabled && styles.locationToggleEnabled]}
            onPress={
              locationEnabled
                ? onDisableLocation
                : locationStatus === 'denied'
                  ? onOpenLocationSettings
                  : onEnableLocation
            }
            disabled={locationStatus === 'requesting' || locationStatus === 'hydrating'}
            accessibilityRole="button"
            accessibilityLabel={
              locationEnabled
                ? 'ปิดการใช้ตำแหน่งสำหรับคำแนะนำเพื่อน'
                : locationStatus === 'denied'
                  ? 'เปิดการอนุญาต Location ในการตั้งค่า'
                  : 'ใช้ตำแหน่งเพื่อแนะนำเพื่อนใกล้เคียง'
            }
            accessibilityState={{
              disabled: locationStatus === 'requesting' || locationStatus === 'hydrating',
              selected: locationEnabled,
            }}
          >
            {locationStatus === 'requesting' || locationStatus === 'hydrating' ? (
              <ActivityIndicator size="small" color={theme.orange} />
            ) : (
              <MaterialCommunityIcons
                name={locationEnabled ? 'crosshairs-gps' : 'map-marker-radius-outline'}
                size={14}
                color={locationEnabled ? theme.orange : theme.muted}
              />
            )}
            <Text style={[styles.locationToggleText, locationEnabled && styles.locationToggleTextEnabled]}>
              {locationEnabled ? 'ใกล้ฉัน' : locationStatus === 'denied' ? 'เปิด Location' : 'ใกล้ฉัน'}
            </Text>
          </PressableScale>
        ) : null}
      </View>

      {showLoading ? (
        <View style={styles.recommendationState} accessibilityRole="text">
          <ActivityIndicator size="small" color={theme.orange} />
          <Text style={styles.recommendationStateText}>กำลังโหลดผู้เล่น…</Text>
        </View>
      ) : showError ? (
        <View style={styles.recommendationState} accessibilityRole="alert">
          <MaterialCommunityIcons name="cloud-alert-outline" size={18} color={theme.red} />
          <Text style={[styles.recommendationStateText, styles.recommendationErrorText]}>
            โหลดผู้เล่นไม่สำเร็จ
          </Text>
          <PressableScale
            style={styles.recommendationRetry}
            onPress={onRetry}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel="ลองโหลดผู้เล่นอีกครั้ง"
          >
            <Text style={styles.recommendationRetryText}>{isRetrying ? 'กำลังลองใหม่…' : 'ลองใหม่'}</Text>
          </PressableScale>
        </View>
      ) : candidates.length === 0 ? (
        <View style={styles.recommendationState} accessibilityRole="text">
          <Text style={styles.recommendationStateText}>ยังไม่มีผู้เล่นให้แสดง</Text>
        </View>
      ) : (
        <>
          {hasError ? (
            <View style={styles.recommendationRefreshError} accessibilityRole="alert">
              <Text style={styles.recommendationRefreshErrorText}>โหลดข้อมูลล่าสุดไม่สำเร็จ</Text>
              <PressableScale
                style={styles.recommendationRetry}
                onPress={onRetry}
                disabled={isRetrying}
                accessibilityRole="button"
                accessibilityLabel="ลองโหลดผู้เล่นอีกครั้ง"
              >
                <Text style={styles.recommendationRetryText}>{isRetrying ? 'กำลังลองใหม่…' : 'ลองใหม่'}</Text>
              </PressableScale>
            </View>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendationRail}
          >
            {candidates.map((candidate) => {
              const initials = getInitials(candidate)
              const avatarSource = getAvatarSource(candidate.avatarUrl)
              const isAdded = addedCandidateIds.has(candidate.id)
              const isAdding = addingCandidateIds.has(candidate.id)
              return (
                <PressableScale
                  key={candidate.id}
                  style={styles.candidateTile}
                  onPress={() => onOpenCandidate(candidate)}
                  accessibilityRole="button"
                  accessibilityLabel={`เปิดโปรไฟล์ ${candidate.displayName}`}
                >
                  <ProfileFrame frameAssetRef={candidate.frameAssetRef} size={50}>
                    {avatarSource ? (
                      <Image
                        source={avatarSource}
                        style={styles.candidateImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={styles.candidateInitials}>{initials}</Text>
                    )}
                  </ProfileFrame>
                  <Text style={styles.candidateName} numberOfLines={1}>
                    {candidate.displayName}
                  </Text>
                  <PressableScale
                    style={[styles.candidateAddButton, isAdded && styles.candidateAddButtonAdded]}
                    onPressIn={(event) => event.stopPropagation()}
                    onPress={(event) => {
                      event.stopPropagation()
                      void handleAddCandidate(candidate)
                    }}
                    disabled={isAdding || isAdded}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isAdding
                        ? `กำลังเพิ่ม ${candidate.displayName}`
                        : isAdded
                          ? `ส่งคำขอเป็นเพื่อนแล้วสำหรับ ${candidate.displayName}`
                          : `เพิ่ม ${candidate.displayName} เป็นเพื่อน`
                    }
                    accessibilityState={{
                      busy: isAdding,
                      disabled: isAdding || isAdded,
                      selected: isAdded,
                    }}
                  >
                    {isAdding ? (
                      <ActivityIndicator size="small" color={theme.orange} />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={isAdded ? 'check' : 'plus'}
                          size={12}
                          color={isAdded ? theme.muted : theme.orange}
                        />
                        <Text
                          style={[styles.candidateAddButtonText, isAdded && styles.candidateAddButtonTextAdded]}
                        >
                          {isAdded ? 'ส่งแล้ว' : '+Add'}
                        </Text>
                      </>
                    )}
                  </PressableScale>
                </PressableScale>
              )
            })}
          </ScrollView>
        </>
      )}
    </View>
  )
}

function getAvatarSource(avatarUrl: FriendCandidate['avatarUrl']) {
  // The dev fixture may contain a Metro asset module id while backend candidates
  // continue to provide remote URL strings through the existing contract.
  const source = avatarUrl as string | number | null
  return typeof source === 'number' ? source : source ? { uri: source } : null
}

function getInitials(candidate: FriendCandidate): string {
  const source = candidate.displayName.trim() || candidate.handle?.trim() || ''
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2)
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
  return initials || '?'
}
