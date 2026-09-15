import ActivityKit
import Foundation
import React

private enum RallyLiveActivityShared {
  static let appGroupId = "group.com.anonymous.rally-app"
  static let accessTokenKey = "rally.liveActivity.accessToken"
  static let expiresAtKey = "rally.liveActivity.expiresAt"
  static let supabaseUrlKey = "rally.liveActivity.supabaseUrl"
  static let functionRegionKey = "rally.liveActivity.functionRegion"
}

@objc(RallyLiveActivity)
final class RallyLiveActivity: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(isAvailable:rejecter:)
  func isAvailable(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(false)
      return
    }

    resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
  }

  @objc(startOrUpdate:resolver:rejecter:)
  func startOrUpdate(
    _ surface: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      resolve(nil)
      return
    }
    guard let payload = RallyLiveActivityPayload(surface) else {
      reject("invalid_surface", "Rally Live Activity surface payload is invalid.", nil)
      return
    }

    Task {
      do {
        if let activity = Activity<RallyLiveActivityAttributes>.activities.first(where: {
          $0.attributes.surfaceId == payload.attributes.surfaceId
        }) {
          await activity.update(ActivityContent(
            state: payload.state,
            staleDate: payload.staleDate
          ))
        } else {
          _ = try Activity.request(
            attributes: payload.attributes,
            content: ActivityContent(state: payload.state, staleDate: payload.staleDate),
            pushType: .token
          )
        }
        resolve(nil)
      } catch {
        reject("activity_start_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(end:resolver:rejecter:)
  func end(
    _ surfaceKey: NSString,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.2, *) else {
      resolve(nil)
      return
    }
    let key = surfaceKey as String
    Task {
      for activity in Activity<RallyLiveActivityAttributes>.activities where activity.attributes.surfaceId == key {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      resolve(nil)
    }
  }

  @objc(getPushToStartToken:rejecter:)
  func getPushToStartToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 17.2, *) else {
      resolve(nil)
      return
    }

    Task {
      let token = await firstPushToStartToken(timeoutNanoseconds: 1_500_000_000)
      resolve(token)
    }
  }

  @objc(setActionAuthContext:resolver:rejecter:)
  func setActionAuthContext(
    _ context: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: RallyLiveActivityShared.appGroupId) else {
      reject("app_group_unavailable", "Rally Live Activity app group is unavailable.", nil)
      return
    }
    defaults.set(context["accessToken"] as? String, forKey: RallyLiveActivityShared.accessTokenKey)
    defaults.set(context["supabaseUrl"] as? String, forKey: RallyLiveActivityShared.supabaseUrlKey)
    defaults.set(context["functionRegion"] as? String, forKey: RallyLiveActivityShared.functionRegionKey)
    if let expiresAt = context["expiresAt"] as? NSNumber {
      defaults.set(expiresAt.doubleValue, forKey: RallyLiveActivityShared.expiresAtKey)
    }
    resolve(nil)
  }

  @objc(clearActionAuthContext:rejecter:)
  func clearActionAuthContext(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: RallyLiveActivityShared.appGroupId) else {
      resolve(nil)
      return
    }
    defaults.removeObject(forKey: RallyLiveActivityShared.accessTokenKey)
    defaults.removeObject(forKey: RallyLiveActivityShared.supabaseUrlKey)
    defaults.removeObject(forKey: RallyLiveActivityShared.functionRegionKey)
    defaults.removeObject(forKey: RallyLiveActivityShared.expiresAtKey)
    resolve(nil)
  }

  @available(iOS 17.2, *)
  private func firstPushToStartToken(timeoutNanoseconds: UInt64) async -> String? {
    await withTaskGroup(of: String?.self) { group in
      group.addTask {
        for await token in Activity<RallyLiveActivityAttributes>.pushToStartTokenUpdates {
          return token.map { String(format: "%02x", $0) }.joined()
        }
        return nil
      }
      group.addTask {
        try? await Task.sleep(nanoseconds: timeoutNanoseconds)
        return nil
      }
      let value = await group.next() ?? nil
      group.cancelAll()
      return value
    }
  }
}

@available(iOS 16.2, *)
private struct RallyLiveActivityPayload {
  let attributes: RallyLiveActivityAttributes
  let state: RallyLiveActivityAttributes.ContentState
  let staleDate: Date?

  init?(_ surface: NSDictionary) {
    let surfaceId = Self.string(surface["key"]) ?? Self.string(surface["surfaceKey"])
    let surfaceType = Self.string(surface["surfaceType"]) ?? "match_invite"
    guard let surfaceId else { return nil }

    let headline = Self.string(surface["headline"]) ?? Self.string(surface["expandedTitle"]) ?? Self.string(surface["title"]) ?? "Rally"
    let subtitle = Self.string(surface["subtitle"]) ?? Self.string(surface["expandedSubtitle"]) ?? Self.string(surface["body"]) ?? ""
    let actorName = Self.string(surface["actorName"]) ?? headline
    let route = Self.string(surface["route"]) ?? "/notifications"

    self.attributes = RallyLiveActivityAttributes(
      surfaceId: surfaceId,
      surfaceType: surfaceType,
      matchId: Self.actionString(surface, "matchId"),
      inviteId: Self.actionString(surface, "inviteId"),
      requesterId: Self.actionString(surface, "requesterId"),
      route: route
    )
    self.state = RallyLiveActivityAttributes.ContentState(
      title: Self.string(surface["title"]) ?? headline,
      headline: headline,
      subtitle: subtitle,
      actorName: actorName,
      activityType: Self.string(surface["activityType"]),
      avatarUrl: Self.string(surface["avatarUrl"]),
      compactTitle: Self.string(surface["compactTitle"]),
      expandedTitle: Self.string(surface["expandedTitle"]) ?? headline,
      expandedSubtitle: Self.string(surface["expandedSubtitle"]) ?? subtitle,
      expiresAt: Self.string(surface["expiresAt"]),
      statusLabel: Self.string(surface["statusLabel"]),
      runState: Self.string(surface["runState"]),
      accentColorHex: Self.string(surface["accentColor"]),
      distanceValue: Self.string(surface["distanceValue"]),
      distanceUnit: Self.string(surface["distanceUnit"]),
      contextLabel: Self.string(surface["contextLabel"]),
      progressLabel: Self.string(surface["progressLabel"]),
      progressFraction: Self.double(surface["progressFraction"]),
      primaryMetricLabel: Self.metricString(surface, "primaryMetric", "label"),
      primaryMetricValue: Self.metricString(surface, "primaryMetric", "value"),
      secondaryMetricLabel: Self.metricString(surface, "secondaryMetric", "label"),
      secondaryMetricValue: Self.metricString(surface, "secondaryMetric", "value")
    )
    self.staleDate = Self.parseDate(Self.string(surface["expiresAt"]))
  }

  private static func string(_ value: Any?) -> String? {
    guard let value = value as? String else { return nil }
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }

  private static func double(_ value: Any?) -> Double? {
    if let number = value as? NSNumber { return number.doubleValue }
    if let string = value as? String { return Double(string) }
    return nil
  }

  /// Metrics arrive as `{ label, value }` objects on the JS surface.
  private static func metricString(
    _ surface: NSDictionary,
    _ metricKey: String,
    _ field: String
  ) -> String? {
    guard let metric = surface[metricKey] as? NSDictionary else { return nil }
    return string(metric[field])
  }

  private static func actionString(_ surface: NSDictionary, _ key: String) -> String? {
    if let value = string(surface[key]) { return value }
    for actionKey in ["primaryAction", "secondaryAction"] {
      guard let action = surface[actionKey] as? NSDictionary else { continue }
      if let value = string(action[key]) { return value }
    }
    return nil
  }

  private static func parseDate(_ value: String?) -> Date? {
    guard let value else { return nil }
    return ISO8601DateFormatter().date(from: value)
  }
}
