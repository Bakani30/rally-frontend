// Orchestrates capture watermarking. Owns a hidden WatermarkComposer and bridges
// screens/components to it. On any compose/native-export failure it surfaces
// status 'error' and tracks analytics. Quest capture opts into strict mode so
// an unwatermarked proof is never silently uploaded; other share flows may
// still use the raw fallback.
import { createElement, useCallback, useRef, useState } from 'react'
import { Platform } from 'react-native'

import { WatermarkComposer, type WatermarkComposerHandle } from '@/components/share/WatermarkComposer'
import type { DataSlot } from '@/components/share/CaptureWatermarkBoard'
import { useAnalytics } from '@/hooks/useAnalytics'
import { MAX_PROOF_CLIP_SECONDS } from '@/lib/quest-proof/recordingAutoStop'
import { shouldApplyNativeVideoWatermark } from '@/lib/share/videoWatermarkPolicy'

export type WatermarkCaptureDomain = 'quest' | 'basketball_proof' | 'basketball_recap'
export type WatermarkCaptureStatus = 'idle' | 'processing' | 'error'

export function useWatermarkedCapture(params: {
  slot: DataSlot
  domain: WatermarkCaptureDomain
  maxVideoDurationSeconds?: number
  requireWatermark?: boolean
}) {
  const {
    slot,
    domain,
    maxVideoDurationSeconds = MAX_PROOF_CLIP_SECONDS,
    requireWatermark = false,
  } = params
  const composerRef = useRef<WatermarkComposerHandle>(null)
  const [status, setStatus] = useState<WatermarkCaptureStatus>('idle')
  const { track } = useAnalytics()

  const composerElement = createElement(WatermarkComposer, { ref: composerRef, slot })

  const watermarkPhoto = useCallback(
    async (rawUri: string): Promise<string> => {
      setStatus('processing')
      try {
        const out = await composerRef.current?.composePhoto(rawUri)
        if (!out) throw new Error('composer_unavailable')
        setStatus('idle')
        track({ name: 'watermark_apply_succeeded', properties: { domain, media: 'photo' } })
        return out
      } catch (e) {
        setStatus('error')
        track({
          name: 'watermark_apply_failed',
          properties: { domain, media: 'photo', reason: e instanceof Error ? e.message : 'unknown' },
        })
        if (requireWatermark) throw e
        return rawUri // fall back to the raw file — never block share/proof
      }
    },
    [domain, requireWatermark, track],
  )

  const watermarkVideo = useCallback(
    async (rawUri: string): Promise<string> => {
      if (!shouldApplyNativeVideoWatermark(Platform.OS)) {
        setStatus('idle')
        return rawUri
      }

      setStatus('processing')
      try {
        const pngUri = await composerRef.current?.composeOverlayPng()
        if (!pngUri) throw new Error('composer_unavailable')
        const { overlayStaticWatermark } = await import('@/lib/share/videoWatermarkService')
        const out = await overlayStaticWatermark({
          videoUri: rawUri,
          watermarkPngUri: pngUri,
          maxDurationSeconds: maxVideoDurationSeconds,
        })
        setStatus('idle')
        track({ name: 'watermark_apply_succeeded', properties: { domain, media: 'video' } })
        return out
      } catch (e) {
        setStatus('error')
        track({
          name: 'watermark_apply_failed',
          properties: { domain, media: 'video', reason: e instanceof Error ? e.message : 'unknown' },
        })
        if (requireWatermark) throw e
        return rawUri // fall back to the raw clip — never block share/proof
      }
    },
    [domain, maxVideoDurationSeconds, requireWatermark, track],
  )

  return { composerElement, watermarkPhoto, watermarkVideo, status }
}
