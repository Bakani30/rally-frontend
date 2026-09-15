// RallyVideoWatermark — Android Media3 Transformer implementation.
//
// Composites a static PNG (the transparent watermark board produced by
// WatermarkComposer.composeOverlayPng, ~1080px wide) onto an existing MP4,
// anchored to the TOP and scaled to the oriented video width, then trims to
// `maxDurationSeconds`. First-party only: androidx.media3 (Transformer + effects).
// No ffmpeg.
//
// ── On-device gotchas (documented for the founder's device-validation pass) ──
//
// 1. MAIN THREAD. `Transformer` must be built and `start()`ed on a thread with a
//    prepared Looper, and its `Transformer.Listener` callbacks are delivered on
//    that same thread. Expo's AsyncFunction runs the closure on a background
//    module queue with NO Looper, so we hop to the main thread via a Handler
//    before touching the Transformer, and resolve/reject the promise from the
//    listener (which then also fires on the main thread).
//
// 2. TOP ANCHOR. Media3 overlay anchors use normalized device coordinates where
//    (0, 0) is the frame centre and y grows UPWARD, so the TOP-centre is (0, +1).
//    We anchor the overlay's own top-centre (0, +1) to the frame's top-centre
//    (0, +1). To make "scaled to video width" exact, we pre-scale the bitmap to
//    the oriented frame width (Transformer already outputs frames upright, so we
//    read WIDTH/HEIGHT/ROTATION from the source and swap on 90°/270°).
package expo.modules.rallyvideowatermark

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.OverlaySettings
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import com.google.common.collect.ImmutableList
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import kotlin.math.min
import kotlin.math.roundToInt

@UnstableApi
class RallyVideoWatermarkModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("RallyVideoWatermark")

    AsyncFunction("overlayImageOnVideo") {
      videoUri: String, overlayPngUri: String, maxDurationSeconds: Double, promise: Promise ->
      // gotcha #1: everything Transformer-related must run on the main thread.
      Handler(Looper.getMainLooper()).post {
        startOverlay(videoUri, overlayPngUri, maxDurationSeconds, promise)
      }
    }
  }

  private fun startOverlay(
    videoUri: String,
    overlayPngUri: String,
    maxDurationSeconds: Double,
    promise: Promise,
  ) {
    val context = appContext.reactContext
    if (context == null) {
      promise.reject(CodedException("watermark_no_context", "React context unavailable", null))
      return
    }

    try {
      val source = Uri.parse(videoUri)

      // Decode the overlay PNG.
      val rawBitmap = decodeOverlayBitmap(context, overlayPngUri)
        ?: throw CodedException("watermark_png_decode_failed", "Could not decode overlay PNG", null)

      // Determine the oriented video width so we can scale the overlay to match it.
      val orientedWidth = orientedVideoWidth(context, source) ?: rawBitmap.width

      val scale = orientedWidth.toFloat() / rawBitmap.width.toFloat()
      val overlayBitmap =
        if (scale != 1f) {
          val scaledHeight = (rawBitmap.height * scale).roundToInt().coerceAtLeast(1)
          Bitmap.createScaledBitmap(rawBitmap, orientedWidth, scaledHeight, true)
        } else {
          rawBitmap
        }

      // gotcha #2: anchor overlay top-centre (0, +1) to frame top-centre (0, +1).
      val overlaySettings = OverlaySettings.Builder()
        .setBackgroundFrameAnchor(0f, 1f)
        .setOverlayFrameAnchor(0f, 1f)
        .build()
      val bitmapOverlay = BitmapOverlay.createStaticBitmapOverlay(overlayBitmap, overlaySettings)
      val overlayEffect = OverlayEffect(ImmutableList.of(bitmapOverlay))

      // Trim to maxDurationSeconds via clipping.
      val maxDurationMs = (maxDurationSeconds * 1000).toLong().coerceAtLeast(1)
      // Do not ask Media3 to clip past the source duration. Some Android
      // encoders reject that range and leave the export promise in a failed
      // state even though the original clip is valid.
      val endPositionMs = sourceDurationMs(context, source)?.let { min(it, maxDurationMs) } ?: maxDurationMs
      val clipping = MediaItem.ClippingConfiguration.Builder()
        .setEndPositionMs(endPositionMs)
        .build()
      val mediaItem = MediaItem.Builder()
        .setUri(source)
        .setClippingConfiguration(clipping)
        .build()

      val editedMediaItem = EditedMediaItem.Builder(mediaItem)
        .setEffects(Effects(/* audioProcessors = */ emptyList(), /* videoEffects = */ listOf(overlayEffect)))
        .build()

      val outputFile = File.createTempFile("rally-wm-", ".mp4", context.cacheDir)

      val transformer = Transformer.Builder(context)
        .addListener(
          object : Transformer.Listener {
            override fun onCompleted(composition: Composition, exportResult: ExportResult) {
              promise.resolve(Uri.fromFile(outputFile).toString())
            }

            override fun onError(
              composition: Composition,
              exportResult: ExportResult,
              exportException: ExportException,
            ) {
              promise.reject(
                CodedException("watermark_transform_failed", exportException.message, exportException)
              )
            }
          }
        )
        .build()

      transformer.start(editedMediaItem, outputFile.absolutePath)
    } catch (e: CodedException) {
      promise.reject(e)
    } catch (e: Exception) {
      promise.reject(CodedException("watermark_transform_failed", e.message, e))
    }
  }

  /** Decode both file:// paths and Android content:// URIs returned by capture APIs. */
  private fun decodeOverlayBitmap(context: android.content.Context, uriString: String): Bitmap? {
    val uri = Uri.parse(uriString)
    return if (uri.scheme == "content") {
      context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it) }
    } else {
      BitmapFactory.decodeFile(uri.path ?: uriString)
    }
  }

  /** Oriented (display) width of the source video, accounting for rotation metadata. */
  private fun orientedVideoWidth(context: android.content.Context, uri: Uri): Int? {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, uri)
      val width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
      val height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
      val rotation =
        retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      when {
        width == null || height == null -> null
        rotation == 90 || rotation == 270 -> height
        else -> width
      }
    } catch (e: Exception) {
      null
    } finally {
      retriever.release()
    }
  }

  private fun sourceDurationMs(context: android.content.Context, uri: Uri): Long? {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, uri)
      retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
    } catch (e: Exception) {
      null
    } finally {
      retriever.release()
    }
  }
}
