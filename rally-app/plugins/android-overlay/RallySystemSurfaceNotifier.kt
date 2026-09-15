package com.rallyactiver.rallyapp.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.ReadableMap
import com.rallyactiver.rallyapp.R
import java.net.URL
import java.time.Instant
import kotlin.math.max

class RallySystemSurfaceNotifier(
  private val context: Context,
) {
  fun isSystemNotificationAvailable(): Boolean {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
  }

  fun areNotificationsEnabled(): Boolean {
    return canPostNotifications() && NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  fun systemSurfaceCapabilityTier(): String {
    if (!isSystemNotificationAvailable()) return TIER_REACT_FALLBACK
    if (isKnownDisplayOnlyCapsuleDevice()) return TIER_DISPLAY_ONLY_CAPSULE
    return TIER_STANDARD_NOTIFICATION
  }

  fun isSystemSurfaceInteractionAvailable(): Boolean {
    return systemSurfaceCapabilityTier() == TIER_CAPSULE_CAPABLE
  }

  fun showFromRemoteData(data: Map<String, String>) {
    if (!areNotificationsEnabled()) {
      android.util.Log.i(TAG, "Notification permission blocked; skipping Rally system surface.")
      return
    }
    showSurface(surfaceFromRemoteData(data))
  }

  fun showFromReadableMap(surface: ReadableMap) {
    if (!areNotificationsEnabled()) {
      throw IllegalStateException("Notification permission is not granted.")
    }
    showSurface(surfaceFromReadableMap(surface))
  }

  fun cancel(surfaceKey: String) {
    NotificationManagerCompat.from(context).cancel(stableRequestCode(surfaceKey))
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    if (prefs.getString(PREF_ACTIVE_SURFACE_KEY, null) == surfaceKey) {
      prefs.edit().remove(PREF_ACTIVE_SURFACE_KEY).apply()
    }
  }

  private fun showSurface(surface: RallySystemSurface) {
    ensureChannels()

    val quietCapsuleChannel = usesQuietCapsuleChannel()
    val channelId = when (surface.surfaceType) {
      "friend_request" -> if (quietCapsuleChannel) SOCIAL_REQUEST_QUIET_CHANNEL_ID else SOCIAL_REQUEST_ALERT_CHANNEL_ID
      else -> if (quietCapsuleChannel) MATCH_INVITE_QUIET_CHANNEL_ID else MATCH_INVITE_ALERT_CHANNEL_ID
    }
    val isMatchInvite = surface.surfaceType == "match_invite"
    val isFriendRequest = surface.surfaceType == "friend_request"
    val isLiveRun = surface.surfaceType == "live_run"
    val ongoing = isMatchInvite || isFriendRequest || isLiveRun
    val shortText = when (surface.surfaceType) {
      "friend_request" -> "Friend"
      "live_run" -> "Run"
      else -> formatActivity(surface.activityType).take(7)
    }

    val builder = NotificationCompat.Builder(context, channelId)
      .setSmallIcon(R.drawable.ic_notification_rally)
      .setContentTitle(surface.title)
      .setContentText(surface.body)
      .setSubText(shortText)
      .setStyle(NotificationCompat.BigTextStyle().bigText(surface.body))
      .setContentIntent(defaultContentIntent(surface))
      .setAutoCancel(!ongoing)
      .setOngoing(ongoing)
      .setCategory(if (surface.surfaceType == "friend_request") NotificationCompat.CATEGORY_SOCIAL else NotificationCompat.CATEGORY_EVENT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setPriority(if (quietCapsuleChannel) NotificationCompat.PRIORITY_DEFAULT else NotificationCompat.PRIORITY_HIGH)
      .setSilent(quietCapsuleChannel)
      .setOnlyAlertOnce(true)
      .setWhen(System.currentTimeMillis())
      .setShowWhen(true)
      .addAction(
        R.drawable.ic_notification_rally,
        surface.openActionLabel,
        pendingActivityIntent("open-action:${surface.notificationKey}", openActionUri(surface)),
      )

    if (usesAppExpandedFallback()) {
      builder.addAction(
        R.drawable.ic_notification_rally,
        "Expand",
        expandPendingIntent(surface),
      )
    }

    loadAvatar(surface.avatarUrl)?.let { builder.setLargeIcon(it) }

    if (isMatchInvite && surface.inviteId != null) {
      builder
        .addAction(
          R.drawable.ic_notification_rally,
          "Accept",
          pendingActivityIntent(
            "accept:${surface.inviteId}",
            overlayActionUri("accept_invite", surface),
          ),
        )
        .addAction(
          R.drawable.ic_notification_rally,
          "Decline",
          pendingActivityIntent(
            "decline:${surface.inviteId}",
            overlayActionUri("decline_invite", surface),
          ),
        )
    }

    if (surface.surfaceType == "live_run") {
      val status = surface.statusLabel?.uppercase() ?: ""
      // "READY TO SAVE" keeps just the Open action — saving needs the app UI.
      if (!status.contains("READY")) {
        val paused = status.contains("PAUSE")
        builder.addAction(
          R.drawable.ic_notification_rally,
          if (paused) "Resume" else "Pause",
          pendingActivityIntent(
            "run-toggle:${surface.notificationKey}",
            overlayActionUri(if (paused) "resume_run" else "pause_run", surface),
          ),
        )
        builder.addAction(
          R.drawable.ic_notification_rally,
          "End",
          pendingActivityIntent(
            "run-end:${surface.notificationKey}",
            overlayActionUri("end_run", surface),
          ),
        )
      }
    }

    if (surface.surfaceType == "friend_request" && surface.requesterId != null) {
      builder.addAction(
        R.drawable.ic_notification_rally,
        "Accept",
        pendingActivityIntent(
          "accept-friend:${surface.requesterId}",
          overlayActionUri("accept_friend_request", surface),
        ),
      )
      builder.addAction(
        R.drawable.ic_notification_rally,
        "Dismiss",
        dismissPendingIntent(
          "dismiss-friend:${surface.notificationKey}",
          surface,
        ),
      )
    }

    surface.expiresAtMs?.let {
      builder.setTimeoutAfter(max(10_000L, it - System.currentTimeMillis()))
    }

    if (ongoing) {
      requestPromotedOngoing(builder, shortText)
    }

    val notification = builder.build().apply {
      if (ongoing) {
        flags = flags or Notification.FLAG_ONGOING_EVENT
        extras.putBoolean("android.requestPromotedOngoing", true)
        extras.putCharSequence("android.shortCriticalText", shortText)
      }
    }

    replaceActiveSurface(surface.notificationKey)
    NotificationManagerCompat.from(context)
      .notify(stableRequestCode(surface.notificationKey), notification)
  }

  private fun ensureChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.deleteNotificationChannel(LEGACY_MATCH_INVITE_CHANNEL_ID)
    ensureChannel(
      manager,
      MATCH_INVITE_QUIET_CHANNEL_ID,
      "Match invites",
      "Match invitations shown quietly for OS/OEM capsule surfaces.",
      NotificationManager.IMPORTANCE_DEFAULT,
      quiet = true,
    )
    ensureChannel(
      manager,
      SOCIAL_REQUEST_QUIET_CHANNEL_ID,
      "Friend requests",
      "Friend requests shown quietly for OS/OEM capsule surfaces.",
      NotificationManager.IMPORTANCE_DEFAULT,
      quiet = true,
    )
    ensureChannel(
      manager,
      MATCH_INVITE_ALERT_CHANNEL_ID,
      "Match invites",
      "Match invitations shown as standard alerts on unsupported devices.",
      NotificationManager.IMPORTANCE_HIGH,
      quiet = false,
    )
    ensureChannel(
      manager,
      SOCIAL_REQUEST_ALERT_CHANNEL_ID,
      "Friend requests",
      "Friend requests shown as standard alerts on unsupported devices.",
      NotificationManager.IMPORTANCE_HIGH,
      quiet = false,
    )
  }

  private fun ensureChannel(
    manager: NotificationManager,
    channelId: String,
    name: String,
    description: String,
    importance: Int,
    quiet: Boolean,
  ) {
    if (manager.getNotificationChannel(channelId) != null) return
    val channel = NotificationChannel(channelId, name, importance).apply {
      this.description = description
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      enableLights(false)
      enableVibration(!quiet)
      if (quiet) setSound(null, null)
      setShowBadge(true)
    }
    manager.createNotificationChannel(channel)
  }

  private fun surfaceFromRemoteData(data: Map<String, String>): RallySystemSurface {
    val surfaceType = data["rally_surface_kind"]
      ?: (if (data["type"] == "match_invited") "match_invite" else data["type"])
      ?: "match_invite"
    val matchId = data["rally_surface_match_id"] ?: data["matchId"] ?: data["match_id"]
    val inviteId = data["rally_surface_invite_id"] ?: data["inviteId"] ?: data["invite_id"]
    val route = data["rally_surface_route"]
      ?: data["route"]
      ?: matchId?.let { "/match/$it" }
      ?: if (surfaceType == "friend_request") "/friends" else "/notifications"
    val actorName = data["rally_surface_actor_name"] ?: "เพื่อน"
    val actorUserId = data["rally_surface_actor_user_id"] ?: data["requester_id"] ?: data["actor_user_id"]
    val activityType = data["rally_surface_activity_type"] ?: "match"
    val headline = data["rally_surface_headline"]
      ?: if (surfaceType == "friend_request") "$actorName added you" else actorName
    val title = data["rally_surface_title"]
      ?: data["title"]
      ?: if (surfaceType == "friend_request") "คำขอเป็นเพื่อน" else "คำเชิญเข้า match"
    val body = data["body"]
      ?: if (surfaceType == "friend_request") "$actorName ส่งคำขอเป็นเพื่อน" else "$actorName ชวนคุณแข่ง ${formatActivity(activityType)}"
    val subtitle = data["rally_surface_subtitle"] ?: body

    return RallySystemSurface(
      surfaceType = surfaceType,
      surfaceKey = data["rally_surface_key"],
      title = title,
      headline = headline,
      actorName = actorName,
      subtitle = subtitle,
      body = body,
      route = route,
      activityType = activityType,
      matchId = matchId,
      inviteId = inviteId,
      requesterId = if (surfaceType == "friend_request") actorUserId else null,
      avatarUrl = data["rally_surface_actor_avatar_url"],
      expiresAtMs = parseIsoMillis(data["rally_surface_expires_at"]),
      openActionLabel = "Open",
    )
  }

  private fun surfaceFromReadableMap(map: ReadableMap): RallySystemSurface {
    val surfaceType = readString(map, "surfaceType", "match_invite")
    val route = readString(map, "route", if (surfaceType == "friend_request") "/friends" else "/notifications")
    return RallySystemSurface(
      surfaceType = surfaceType,
      surfaceKey = readString(map, "surfaceKey", route),
      title = readString(map, "title", if (surfaceType == "friend_request") "คำขอเป็นเพื่อน" else "คำเชิญเข้า match"),
      headline = readString(map, "headline", readString(map, "expandedTitle", readString(map, "title", "Rally"))),
      actorName = readString(map, "actorName", readString(map, "title", "เพื่อน")),
      subtitle = readString(map, "subtitle", readString(map, "expandedSubtitle", readString(map, "body", ""))),
      body = readString(map, "expandedSubtitle", readString(map, "body", "")),
      route = route,
      activityType = readString(map, "activityType", readString(map, "primaryMetricValue", "match")),
      matchId = readNullableString(map, "matchId"),
      inviteId = readNullableString(map, "inviteId"),
      requesterId = readNullableString(map, "requesterId"),
      avatarUrl = readNullableString(map, "avatarUrl"),
      expiresAtMs = parseIsoMillis(readNullableString(map, "expiresAt")),
      openActionLabel = "Open",
      statusLabel = readNullableString(map, "statusLabel"),
    )
  }

  private fun canPostNotifications(): Boolean {
    return Build.VERSION.SDK_INT < 33 ||
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
  }

  private fun requestPromotedOngoing(
    builder: NotificationCompat.Builder,
    shortText: String,
  ) {
    runCatching {
      val method = builder.javaClass.getMethod(
        "setRequestPromotedOngoing",
        java.lang.Boolean.TYPE,
      )
      method.invoke(builder, true)
    }
    runCatching {
      val method = builder.javaClass.getMethod(
        "setShortCriticalText",
        CharSequence::class.java,
      )
      method.invoke(builder, shortText)
    }
  }

  private fun routeToUri(route: String): Uri {
    if (route.startsWith("rallyapp://")) return Uri.parse(route)
    return Uri.parse("rallyapp://${route.trimStart('/')}")
  }

  private fun overlayActionUri(action: String, surface: RallySystemSurface): Uri {
    return Uri.Builder()
      .scheme("rallyapp")
      .authority("overlay-action")
      .appendQueryParameter("action", action)
      .appendQueryParameter("surfaceType", surface.surfaceType)
      .appendQueryParameter("surfaceKey", surface.notificationKey)
      .appendQueryParameter("route", surface.route)
      .appendQueryParameter("title", surface.title)
      .appendQueryParameter("body", surface.body)
      .appendQueryParameter("headline", surface.headline)
      .appendQueryParameter("actorName", surface.actorName)
      .appendQueryParameter("subtitle", surface.subtitle)
      .apply {
        surface.matchId?.let { appendQueryParameter("matchId", it) }
        surface.inviteId?.let { appendQueryParameter("inviteId", it) }
        surface.requesterId?.let { appendQueryParameter("requesterId", it) }
        surface.activityType?.let { appendQueryParameter("activityType", it) }
        surface.avatarUrl?.let { appendQueryParameter("avatarUrl", it) }
      }
      .build()
  }

  private fun defaultContentIntent(surface: RallySystemSurface): PendingIntent {
    return pendingActivityIntent("open:${surface.notificationKey}", openActionUri(surface))
  }

  private fun openActionUri(surface: RallySystemSurface): Uri {
    return if (usesAppExpandedFallback()) {
      overlayActionUri("expand_in_app", surface)
    } else {
      routeToUri(surface.route)
    }
  }

  private fun expandPendingIntent(surface: RallySystemSurface): PendingIntent {
    return pendingActivityIntent(
      "expand-open:${surface.notificationKey}",
      overlayActionUri("expand_in_app", surface),
    )
  }

  private fun dismissPendingIntent(key: String, surface: RallySystemSurface): PendingIntent {
    return PendingIntent.getBroadcast(
      context,
      stableRequestCode(key),
      Intent(context, RallyNotificationActionReceiver::class.java).apply {
        action = RallyNotificationActionReceiver.ACTION_DISMISS_SURFACE
        setPackage(context.packageName)
        putExtra(RallyNotificationActionReceiver.EXTRA_SURFACE_KEY, surface.notificationKey)
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun pendingActivityIntent(key: String, uri: Uri): PendingIntent {
    return PendingIntent.getActivity(
      context,
      stableRequestCode(key),
      Intent(Intent.ACTION_VIEW, uri).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun parseIsoMillis(value: String?): Long? {
    if (value.isNullOrBlank()) return null
    return runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()
  }

  private fun loadAvatar(url: String?): Bitmap? {
    if (url.isNullOrBlank()) return null
    return runCatching {
      val connection = URL(url).openConnection().apply {
        connectTimeout = 800
        readTimeout = 800
      }
      connection.getInputStream().use(BitmapFactory::decodeStream)
    }.getOrNull()
  }

  private fun stableRequestCode(value: String): Int {
    return value.hashCode()
  }

  private fun replaceActiveSurface(notificationKey: String) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val previousKey = prefs.getString(PREF_ACTIVE_SURFACE_KEY, null)
    if (!previousKey.isNullOrBlank() && previousKey != notificationKey) {
      NotificationManagerCompat.from(context).cancel(stableRequestCode(previousKey))
    }
    prefs.edit().putString(PREF_ACTIVE_SURFACE_KEY, notificationKey).apply()
  }

  private fun usesQuietCapsuleChannel(): Boolean {
    return when (systemSurfaceCapabilityTier()) {
      TIER_CAPSULE_CAPABLE,
      TIER_DISPLAY_ONLY_CAPSULE -> true
      else -> false
    }
  }

  private fun usesAppExpandedFallback(): Boolean {
    return systemSurfaceCapabilityTier() == TIER_DISPLAY_ONLY_CAPSULE
  }

  private fun isKnownDisplayOnlyCapsuleDevice(): Boolean {
    val manufacturer = Build.MANUFACTURER.lowercase()
    val brand = Build.BRAND.lowercase()
    val model = Build.MODEL.lowercase()
    return manufacturer.contains("vivo") ||
      brand.contains("vivo") ||
      brand.contains("iqoo") ||
      model.contains("vivo") ||
      model.contains("iqoo")
  }

  private fun formatActivity(activityType: String?): String {
    return when (activityType?.lowercase()) {
      "basketball" -> "Basketball"
      "badminton" -> "Badminton"
      "running" -> "Running"
      else -> "Match"
    }
  }

  private fun readString(map: ReadableMap, key: String, fallback: String): String {
    if (!map.hasKey(key) || map.isNull(key)) return fallback
    return map.getString(key)?.takeIf { it.isNotBlank() } ?: fallback
  }

  private fun readNullableString(map: ReadableMap, key: String): String? {
    if (!map.hasKey(key) || map.isNull(key)) return null
    return map.getString(key)?.takeIf { it.isNotBlank() }
  }

  private data class RallySystemSurface(
    val surfaceType: String,
    val surfaceKey: String?,
    val title: String,
    val headline: String,
    val actorName: String,
    val subtitle: String,
    val body: String,
    val route: String,
    val activityType: String?,
    val matchId: String?,
    val inviteId: String?,
    val requesterId: String?,
    val avatarUrl: String?,
    val expiresAtMs: Long?,
    val openActionLabel: String,
    // Live-run state label ("LIVE RUN" / "AUTO PAUSE" / "PAUSED" /
    // "READY TO SAVE") — decides which run control actions render.
    val statusLabel: String? = null,
  ) {
    val notificationKey: String
      get() = when {
        matchId != null -> "$surfaceType:$matchId"
        surfaceKey != null -> "$surfaceType:$surfaceKey"
        else -> "$surfaceType:$route"
      }
  }

  companion object {
    private const val TAG = "RallySystemSurface"
    private const val PREFS_NAME = "rally_system_surfaces"
    private const val PREF_ACTIVE_SURFACE_KEY = "active_surface_key"
    private const val MATCH_INVITE_QUIET_CHANNEL_ID = "match_invites_quiet_v5"
    private const val MATCH_INVITE_ALERT_CHANNEL_ID = "match_invites_alert_v5"
    private const val SOCIAL_REQUEST_QUIET_CHANNEL_ID = "social_requests_quiet_v5"
    private const val SOCIAL_REQUEST_ALERT_CHANNEL_ID = "social_requests_alert_v5"
    private const val LEGACY_MATCH_INVITE_CHANNEL_ID = "match_invites_v2"
    private const val TIER_CAPSULE_CAPABLE = "capsule_capable"
    private const val TIER_DISPLAY_ONLY_CAPSULE = "display_only_capsule"
    private const val TIER_STANDARD_NOTIFICATION = "standard_notification"
    private const val TIER_REACT_FALLBACK = "react_fallback"
  }
}
