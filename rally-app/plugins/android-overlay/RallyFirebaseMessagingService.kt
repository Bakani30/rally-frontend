package com.rallyactiver.rallyapp.notifications

import com.google.firebase.messaging.RemoteMessage
import expo.modules.notifications.service.ExpoFirebaseMessagingService

class RallyFirebaseMessagingService : ExpoFirebaseMessagingService() {
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val data = remoteMessage.data
    if (!isRallySystemSurface(data)) {
      super.onMessageReceived(remoteMessage)
      return
    }

    Thread {
      RallySystemSurfaceNotifier(this).showFromRemoteData(data)
    }.start()
  }

  private fun isRallySystemSurface(data: Map<String, String>): Boolean {
    return when (data["rally_surface_kind"] ?: data["type"]) {
      "match_invite", "match_invited", "friend_request", "live_run" -> true
      else -> false
    }
  }
}
