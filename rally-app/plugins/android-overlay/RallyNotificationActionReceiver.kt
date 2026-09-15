package com.rallyactiver.rallyapp.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class RallyNotificationActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_DISMISS_SURFACE) return
    val surfaceKey = intent.getStringExtra(EXTRA_SURFACE_KEY)?.takeIf { it.isNotBlank() } ?: return
    RallySystemSurfaceNotifier(context.applicationContext).cancel(surfaceKey)
  }

  companion object {
    const val ACTION_DISMISS_SURFACE = "com.rallyactiver.rallyapp.notifications.DISMISS_SURFACE"
    const val EXTRA_SURFACE_KEY = "surfaceKey"
  }
}
