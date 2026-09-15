import ActivityKit
import Foundation

struct RallyLiveActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var title: String
    var headline: String
    var subtitle: String
    var actorName: String
    var activityType: String?
    var avatarUrl: String?
    var compactTitle: String?
    var expandedTitle: String?
    var expandedSubtitle: String?
    var expiresAt: String?
    /// Live-run state label ("LIVE RUN" / "AUTO PAUSE" / "PAUSED" /
    /// "READY TO SAVE") — drives the eyebrow and which run controls render.
    /// Optional so payloads from older JS bundles keep decoding.
    var statusLabel: String?

    // MARK: - Run surface (live_run)
    //
    // Structured run fields for the redesigned lock-screen card and Dynamic
    // Island (docs/design/2026-07-21-run-live-activity-redesign.md). All
    // optional so payloads from older JS bundles keep decoding — the widget
    // falls back to the generic title/subtitle layout when they are absent.

    /// "active" | "paused" | "finished" — drives accent, pill and affordances.
    var runState: String?
    /// Accent from `useSportTheme()`, e.g. "#F0783D". Never hardcode in the
    /// widget: the token is the source of truth and varies per sport.
    var accentColorHex: String?
    /// Distance hero, split so the unit can be de-emphasised: "8.34" + "km".
    var distanceValue: String?
    var distanceUnit: String?
    /// Secondary context row: event/route name, or a free-run stand-in.
    var contextLabel: String?
    /// Progress needs a denominator. Both are nil for a free run, and the
    /// widget then renders no bar at all rather than an empty one.
    var progressLabel: String?
    var progressFraction: Double?
    /// Metrics row — TIME / PACE (finished: AVG PACE).
    var primaryMetricLabel: String?
    var primaryMetricValue: String?
    var secondaryMetricLabel: String?
    var secondaryMetricValue: String?
  }

  var surfaceId: String
  var surfaceType: String
  var matchId: String?
  var inviteId: String?
  var requesterId: String?
  var route: String
}
