// RallyVideoWatermark — iOS AVFoundation implementation.
//
// Composites a static PNG (the transparent watermark board produced by
// WatermarkComposer.composeOverlayPng, ~1080px wide) onto an existing MP4,
// anchored to the TOP and scaled to the oriented video width, then trims to
// `maxDurationSeconds`. First-party only: AVFoundation + CoreAnimation. No ffmpeg.
//
// ── On-device gotchas (documented for the founder's device-validation pass) ──
//
// 1. ORIENTATION. A camera track's raw `naturalSize` is the sensor size (usually
//    landscape, e.g. 1920×1080) and the display rotation lives in
//    `preferredTransform`. If we render at naturalSize and ignore the transform,
//    a portrait clip exports SIDEWAYS. We therefore (a) derive `renderSize` from
//    the *oriented* dimensions (naturalSize.applying(preferredTransform)) and
//    (b) hand that same preferredTransform to the layer instruction so the pixels
//    are rotated upright inside `renderSize`.
//
// 2. COREANIMATION ORIGIN IS BOTTOM-LEFT. Unlike UIKit, a CALayer's y grows
//    UPWARD. To pin the overlay to the visual TOP of the frame we place it at
//    `y = renderSize.height - overlayHeight` (a HIGH y), not y = 0.
//
// The Expo AsyncFunction closure runs off the main thread on the module queue, so
// the synchronous AVAsset reads below do not block the UI.
import AVFoundation
import ExpoModulesCore
import ImageIO
import QuartzCore

public class RallyVideoWatermarkModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RallyVideoWatermark")

    AsyncFunction("overlayImageOnVideo") {
      (videoUri: String, overlayPngUri: String, maxDurationSeconds: Double, promise: Promise) in
      self.overlay(
        videoUri: videoUri,
        overlayPngUri: overlayPngUri,
        maxDurationSeconds: maxDurationSeconds,
        promise: promise
      )
    }
  }

  // MARK: - Core

  private func overlay(
    videoUri: String,
    overlayPngUri: String,
    maxDurationSeconds: Double,
    promise: Promise
  ) {
    let videoURL = Self.fileURL(from: videoUri)
    let pngURL = Self.fileURL(from: overlayPngUri)

    let asset = AVURLAsset(url: videoURL)

    guard let sourceVideoTrack = asset.tracks(withMediaType: .video).first else {
      promise.reject("watermark_no_video_track", "Source asset has no video track")
      return
    }

    guard let overlayImage = Self.loadCGImage(from: pngURL) else {
      promise.reject("watermark_png_decode_failed", "Could not decode overlay PNG")
      return
    }

    // ── Trim range: 0 ..< min(assetDuration, maxDurationSeconds) ──
    let assetDuration = asset.duration
    let timescale = assetDuration.timescale == 0 ? CMTimeScale(600) : assetDuration.timescale
    let maxDuration = CMTime(seconds: maxDurationSeconds, preferredTimescale: timescale)
    let clippedDuration = CMTimeMinimum(assetDuration, maxDuration)
    let trimRange = CMTimeRange(start: .zero, duration: clippedDuration)

    // ── Composition (video + audio) ──
    let composition = AVMutableComposition()
    guard
      let compVideoTrack = composition.addMutableTrack(
        withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)
    else {
      promise.reject("watermark_composition_failed", "Could not create composition video track")
      return
    }

    do {
      try compVideoTrack.insertTimeRange(trimRange, of: sourceVideoTrack, at: .zero)
      // Carry the source rotation so tooling that reads the track sees it upright;
      // the layer instruction below is what actually rotates the rendered pixels.
      compVideoTrack.preferredTransform = sourceVideoTrack.preferredTransform

      if let sourceAudioTrack = asset.tracks(withMediaType: .audio).first,
        let compAudioTrack = composition.addMutableTrack(
          withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
      {
        try compAudioTrack.insertTimeRange(trimRange, of: sourceAudioTrack, at: .zero)
      }
    } catch {
      promise.reject("watermark_insert_failed", "Could not insert time range: \(error.localizedDescription)")
      return
    }

    // ── Oriented render size (see gotcha #1) ──
    let preferredTransform = sourceVideoTrack.preferredTransform
    let naturalSize = sourceVideoTrack.naturalSize
    let orientedRect = CGRect(origin: .zero, size: naturalSize).applying(preferredTransform)
    let renderSize = CGSize(width: abs(orientedRect.width), height: abs(orientedRect.height))

    // ── CoreAnimation layer tree: video layer + top-anchored overlay ──
    let videoLayer = CALayer()
    videoLayer.frame = CGRect(origin: .zero, size: renderSize)

    let parentLayer = CALayer()
    parentLayer.frame = CGRect(origin: .zero, size: renderSize)
    parentLayer.isGeometryFlipped = false
    parentLayer.addSublayer(videoLayer)

    // Scale overlay to the full render width, preserve its aspect for height.
    let overlayWidth = renderSize.width
    let overlayScale = overlayWidth / CGFloat(overlayImage.width)
    let overlayHeight = CGFloat(overlayImage.height) * overlayScale

    let overlayLayer = CALayer()
    overlayLayer.contents = overlayImage
    overlayLayer.contentsGravity = .resizeAspect
    // gotcha #2: CoreAnimation y grows UP, so "top" is a HIGH y.
    overlayLayer.frame = CGRect(
      x: 0,
      y: renderSize.height - overlayHeight,
      width: overlayWidth,
      height: overlayHeight
    )
    parentLayer.addSublayer(overlayLayer)

    // ── Video composition ──
    let videoComposition = AVMutableVideoComposition()
    videoComposition.renderSize = renderSize
    videoComposition.frameDuration = CMTime(value: 1, timescale: 30)
    videoComposition.animationTool = AVVideoCompositionCoreAnimationTool(
      postProcessingAsVideoLayer: videoLayer, in: parentLayer)

    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: composition.duration)
    let layerInstruction = AVMutableVideoCompositionLayerInstruction(assetTrack: compVideoTrack)
    layerInstruction.setTransform(preferredTransform, at: .zero)
    instruction.layerInstructions = [layerInstruction]
    videoComposition.instructions = [instruction]

    // ── Export ──
    let outputURL = URL(fileURLWithPath: NSTemporaryDirectory())
      .appendingPathComponent("rally-wm-\(UUID().uuidString).mp4")

    guard
      let exportSession = AVAssetExportSession(
        asset: composition, presetName: AVAssetExportPresetHighestQuality)
    else {
      promise.reject("watermark_export_unavailable", "Could not create export session")
      return
    }
    exportSession.videoComposition = videoComposition
    exportSession.outputURL = outputURL
    exportSession.outputFileType = .mp4
    exportSession.shouldOptimizeForNetworkUse = true

    exportSession.exportAsynchronously {
      switch exportSession.status {
      case .completed:
        promise.resolve(outputURL.absoluteString)
      case .cancelled:
        promise.reject("watermark_export_cancelled", "Export was cancelled")
      default:
        let message = exportSession.error?.localizedDescription ?? "Unknown export error"
        promise.reject("watermark_export_failed", message)
      }
    }
  }

  // MARK: - Helpers

  /// Accept `file://…` uris as well as bare filesystem paths.
  private static func fileURL(from uri: String) -> URL {
    if let url = URL(string: uri), url.scheme != nil {
      return url
    }
    return URL(fileURLWithPath: uri)
  }

  private static func loadCGImage(from url: URL) -> CGImage? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(source, 0, nil)
  }
}
