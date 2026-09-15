package com.rallyactiver.rallyapp.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.rallyactiver.rallyapp.notifications.RallySystemSurfaceNotifier

class RallyOverlayModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "RallyOverlay"

  @ReactMethod
  fun isOverlayPermissionGranted(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    val packageUri = Uri.parse("package:${reactContext.packageName}")
    val overlayIntent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, packageUri).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val fallbackIntent = Intent(Settings.ACTION_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val intent = if (overlayIntent.resolveActivity(reactContext.packageManager) != null) {
      overlayIntent
    } else {
      fallbackIntent
    }

    runCatching {
      reactContext.startActivity(intent)
    }.onSuccess {
      promise.resolve(null)
    }.onFailure {
      promise.reject("overlay_settings_failed", it)
    }
  }

  @ReactMethod
  fun show(surface: ReadableMap, promise: Promise) {
    if (!Settings.canDrawOverlays(reactContext)) {
      promise.reject(
        "overlay_permission_required",
        "Draw over other apps permission is not granted.",
      )
      return
    }

    val intent = Intent(reactContext, RallyOverlayService::class.java).apply {
      action = RallyOverlayService.ACTION_SHOW
      putExtra(RallyOverlayService.EXTRA_KIND, readString(surface, "kind", "notification"))
      putExtra(RallyOverlayService.EXTRA_SURFACE_TYPE, readString(surface, "surfaceType", readString(surface, "kind", "notification")))
      putExtra(RallyOverlayService.EXTRA_SURFACE_KEY, readString(surface, "surfaceKey", readString(surface, "title", "rally-island")))
      putExtra(RallyOverlayService.EXTRA_PRESENTATION, readString(surface, "presentation", "expanded"))
      putExtra(RallyOverlayService.EXTRA_EYEBROW, readString(surface, "eyebrow", "RALLY"))
      putExtra(RallyOverlayService.EXTRA_TITLE, readString(surface, "title", "Rally Island"))
      putExtra(RallyOverlayService.EXTRA_BODY, readString(surface, "body", "Ready"))
      putExtra(RallyOverlayService.EXTRA_COMPACT_TITLE, readString(surface, "compactTitle", readString(surface, "title", "Rally Island")))
      putExtra(RallyOverlayService.EXTRA_COMPACT_BODY, readString(surface, "compactBody", readString(surface, "body", "Ready")))
      putExtra(RallyOverlayService.EXTRA_EXPANDED_TITLE, readString(surface, "expandedTitle", readString(surface, "title", "Rally Island")))
      putExtra(RallyOverlayService.EXTRA_EXPANDED_SUBTITLE, readString(surface, "expandedSubtitle", readString(surface, "body", "Ready")))
      putExtra(RallyOverlayService.EXTRA_ACCENT_COLOR, readString(surface, "accentColor", "#eb773c"))
      putExtra(RallyOverlayService.EXTRA_ROUTE, readString(surface, "route", "/"))
      putExtra(RallyOverlayService.EXTRA_ICON_NAME, readString(surface, "iconName", "trophy-award"))
      putExtra(RallyOverlayService.EXTRA_AVATAR_URL, readString(surface, "avatarUrl", ""))
      putExtra(RallyOverlayService.EXTRA_STATUS_LABEL, readString(surface, "statusLabel", ""))
      putExtra(RallyOverlayService.EXTRA_PRIMARY_METRIC_LABEL, readString(surface, "primaryMetricLabel", ""))
      putExtra(RallyOverlayService.EXTRA_PRIMARY_METRIC_VALUE, readString(surface, "primaryMetricValue", ""))
      putExtra(RallyOverlayService.EXTRA_SECONDARY_METRIC_LABEL, readString(surface, "secondaryMetricLabel", ""))
      putExtra(RallyOverlayService.EXTRA_SECONDARY_METRIC_VALUE, readString(surface, "secondaryMetricValue", ""))
      putExtra(RallyOverlayService.EXTRA_PROGRESS, readDouble(surface, "progress", -1.0))
      putExtra(RallyOverlayService.EXTRA_EXPIRES_AT, readString(surface, "expiresAt", ""))
      putExtra(RallyOverlayService.EXTRA_AUTO_DISMISS_MS, readLong(surface, "autoDismissMs", 0L))
      putActionExtra(this, readMap(surface, "primaryAction"), "primary")
      putActionExtra(this, readMap(surface, "secondaryAction"), "secondary")
    }

    runCatching {
      reactContext.startService(intent)
    }.onSuccess {
      promise.resolve(null)
    }.onFailure {
      promise.reject("overlay_show_failed", it)
    }
  }

  @ReactMethod
  fun hide(promise: Promise) {
    runCatching {
      val intent = Intent(reactContext, RallyOverlayService::class.java).apply {
        action = RallyOverlayService.ACTION_HIDE
      }
      reactContext.startService(intent)
      reactContext.stopService(Intent(reactContext, RallyOverlayService::class.java))
    }.onSuccess {
      promise.resolve(null)
    }.onFailure {
      promise.reject("overlay_hide_failed", it)
    }
  }

  @ReactMethod
  fun isSystemNotificationAvailable(promise: Promise) {
    promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
  }

  @ReactMethod
  fun isSystemSurfaceInteractionAvailable(promise: Promise) {
    promise.resolve(RallySystemSurfaceNotifier(reactContext).isSystemSurfaceInteractionAvailable())
  }

  @ReactMethod
  fun getSystemSurfaceCapabilityTier(promise: Promise) {
    promise.resolve(RallySystemSurfaceNotifier(reactContext).systemSurfaceCapabilityTier())
  }

  @ReactMethod
  fun areSystemNotificationsEnabled(promise: Promise) {
    promise.resolve(RallySystemSurfaceNotifier(reactContext).areNotificationsEnabled())
  }

  @ReactMethod
  fun showSystemSurface(surface: ReadableMap, promise: Promise) {
    runCatching {
      RallySystemSurfaceNotifier(reactContext).showFromReadableMap(surface)
    }.onSuccess {
      promise.resolve(null)
    }.onFailure {
      promise.reject("system_surface_show_failed", it)
    }
  }

  @ReactMethod
  fun cancelSystemSurface(surfaceKey: String, promise: Promise) {
    runCatching {
      RallySystemSurfaceNotifier(reactContext).cancel(surfaceKey)
    }.onSuccess {
      promise.resolve(null)
    }.onFailure {
      promise.reject("system_surface_cancel_failed", it)
    }
  }

  private fun readString(map: ReadableMap, key: String, fallback: String): String {
    if (!map.hasKey(key) || map.isNull(key)) return fallback
    return map.getString(key)?.takeIf { it.isNotBlank() } ?: fallback
  }

  private fun readLong(map: ReadableMap, key: String, fallback: Long): Long {
    if (!map.hasKey(key) || map.isNull(key)) return fallback
    return runCatching { map.getDouble(key).toLong() }.getOrDefault(fallback)
  }

  private fun readDouble(map: ReadableMap, key: String, fallback: Double): Double {
    if (!map.hasKey(key) || map.isNull(key)) return fallback
    return runCatching { map.getDouble(key) }.getOrDefault(fallback)
  }

  private fun readMap(map: ReadableMap, key: String): ReadableMap? {
    if (!map.hasKey(key) || map.isNull(key)) return null
    return runCatching { map.getMap(key) }.getOrNull()
  }

  private fun putActionExtra(intent: Intent, action: ReadableMap?, slot: String) {
    if (action == null) return
    val prefix = if (slot == "primary") "Primary" else "Secondary"
    intent.putExtra("${prefix}ActionType", readString(action, "type", "open"))
    intent.putExtra("${prefix}ActionLabel", readString(action, "label", "Open"))
    intent.putExtra("${prefix}ActionStyle", readString(action, "style", "secondary"))
    intent.putExtra("${prefix}ActionUrl", readString(action, "url", ""))
  }
}
