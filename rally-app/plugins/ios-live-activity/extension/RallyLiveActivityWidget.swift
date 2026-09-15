import ActivityKit
import SwiftUI
import WidgetKit

struct RallyLiveActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RallyLiveActivityAttributes.self) { context in
      Group {
        if isRunSurface(context) {
          RallyRunCardView(context: context)
        } else {
          RallyExpandedLiveActivityView(context: context)
        }
      }
      // Rally content, so the card is opaque — iOS blur/vibrancy is chrome
      // only, and a Live Activity sits over an unknown wallpaper.
      .activityBackgroundTint(runCardBackground(context))
      .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          if isRunSurface(context) {
            RallyBrandLockup(context: context)
          } else {
            RallyAvatar(text: initials(context.state.actorName), color: rallyAccentColor(context))
          }
        }
        DynamicIslandExpandedRegion(.center) {
          if isRunSurface(context) {
            RallyRunIslandCenter(context: context)
          } else {
            VStack(alignment: .leading, spacing: 2) {
              Text(eyebrow(context))
                .font(.caption2.weight(.heavy))
                .foregroundStyle(rallyAccentColor(context))
              Text(context.state.expandedTitle ?? context.state.headline)
                .font(.headline.weight(.heavy))
                .lineLimit(1)
              Text(context.state.expandedSubtitle ?? context.state.subtitle)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if isRunSurface(context) {
            VStack(spacing: 10) {
              RallyRunProgressRow(context: context)
              RallyRunMetricsRow(context: context)
              RallyActionRow(context: context)
            }
          } else {
            RallyActionRow(context: context)
          }
        }
      } compactLeading: {
        // Two separate regions around the camera — leading is glyph + live
        // dot, never a continuous pill.
        if isRunSurface(context) {
          HStack(spacing: 3) {
            RallyColosseumGlyph()
              .fill(rallyAccentColor(context), style: FillStyle(eoFill: true))
              .frame(width: 18, height: 13.5)
            RallyLiveDot(context: context)
          }
        } else {
          RallyAvatar(text: initials(context.state.actorName), color: rallyAccentColor(context), size: 24)
        }
      } compactTrailing: {
        // One value per side: distance only.
        Text(compactDistance(context))
          .font(.caption.weight(.heavy))
          .foregroundStyle(isRunSurface(context) ? rallyAccentColor(context) : .primary)
          .lineLimit(1)
          .minimumScaleFactor(0.72)
      } minimal: {
        // The detailed brand mark collapses at this size — use the glyph.
        if isRunSurface(context) {
          RallyColosseumGlyph()
            .fill(rallyAccentColor(context), style: FillStyle(eoFill: true))
            .frame(width: 18, height: 13.5)
        } else {
          Text("R")
            .font(.caption2.weight(.black))
            .foregroundStyle(rallyAccentColor(context))
        }
      }
      .widgetURL(deepLink(for: context, action: "expand_in_app"))
      .keylineTint(rallyAccentColor(context))
    }
  }
}

// MARK: - Run surface (live_run)
//
// Implements docs/design/2026-07-21-run-live-activity-redesign.md: one card,
// three states, distance as the hero, and a progress bar only when a target
// distance gives it a denominator.

private func isRunSurface(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> Bool {
  context.attributes.surfaceType == "live_run" && context.state.distanceValue != nil
}

private enum RallyRunState {
  case active, paused, finished

  static func resolve(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> RallyRunState {
    switch (context.state.runState ?? "").lowercased() {
    case "paused": return .paused
    case "finished": return .finished
    default: return .active
    }
  }
}

/// Lock-screen card. Header (identity + status | brand mark), distance hero,
/// context row, then the divided metrics.
private struct RallyRunCardView: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(alignment: .top) {
        // App identity and status live together, so the brand mark on the
        // right reads as brand rather than a second status.
        HStack(spacing: 8) {
          RallyBrandLockup(context: context)
          RallyStatusPill(context: context)
        }
        Spacer(minLength: 8)
        RallyColosseumGlyph()
          .fill(rallyAccentColor(context).opacity(0.9), style: FillStyle(eoFill: true))
          .frame(width: 34, height: 25.5)
      }

      RallyDistanceHero(context: context)
      RallyRunProgressRow(context: context)
      RallyRunMetricsRow(context: context)

      if RallyRunState.resolve(context) == .finished {
        Link(destination: deepLink(for: context, action: "open")) {
          HStack(spacing: 4) {
            Text("View recap")
              .font(.footnote.weight(.heavy))
            Image(systemName: "chevron.right")
              .font(.footnote.weight(.heavy))
          }
          .foregroundStyle(rallyAccentColor(context))
        }
      } else {
        RallyActionRow(context: context)
      }
    }
    .padding(16)
  }
}

private struct RallyBrandLockup: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 5) {
      Text("R")
        .font(.system(size: 11, weight: .black, design: .rounded))
        .foregroundStyle(.black)
        .frame(width: 18, height: 18)
        .background(rallyAccentColor(context), in: RoundedRectangle(cornerRadius: 5, style: .continuous))
      Text("RALLY")
        .font(.system(size: 11, weight: .heavy))
        .tracking(1.1)
        .foregroundStyle(.secondary)
    }
  }
}

private struct RallyStatusPill: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    let state = RallyRunState.resolve(context)
    HStack(spacing: 4) {
      if state == .active {
        RallyLiveDot(context: context)
      } else if state == .finished {
        Image(systemName: "checkmark")
          .font(.system(size: 8, weight: .black))
      }
      Text(statusText)
        .font(.system(size: 10, weight: .heavy))
        .tracking(0.6)
    }
    .foregroundStyle(rallyAccentColor(context))
    .padding(.horizontal, 7)
    .padding(.vertical, 3)
    .background(rallyAccentColor(context).opacity(0.16), in: Capsule())
  }

  private var statusText: String {
    let label = (context.state.statusLabel ?? "").uppercased()
    switch RallyRunState.resolve(context) {
    case .active: return "LIVE"
    case .paused: return label.contains("AUTO") ? "AUTO PAUSE" : "PAUSED"
    case .finished: return "FINISHED"
    }
  }
}

/// The single permitted animation. Dropped under reduce-motion.
private struct RallyLiveDot: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var pulsing = false

  var body: some View {
    Circle()
      .fill(rallyAccentColor(context))
      .frame(width: 6, height: 6)
      .opacity(shouldPulse && pulsing ? 0.35 : 1)
      .animation(
        shouldPulse ? .easeInOut(duration: 0.9).repeatForever(autoreverses: true) : nil,
        value: pulsing
      )
      .onAppear { if shouldPulse { pulsing = true } }
  }

  private var shouldPulse: Bool {
    !reduceMotion && RallyRunState.resolve(context) == .active
  }
}

private struct RallyDistanceHero: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    HStack(alignment: .lastTextBaseline, spacing: 5) {
      Text(context.state.distanceValue ?? "0")
        .font(.system(size: 44, weight: .black, design: .default))
        .italic()
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      Text(context.state.distanceUnit ?? "km")
        .font(.system(size: 15, weight: .heavy))
        .foregroundStyle(.secondary)
    }
    // Paused dims the hero so the frozen value does not read as live.
    .opacity(RallyRunState.resolve(context) == .paused ? 0.55 : 1)
    .accessibilityLabel("Distance \(context.state.distanceValue ?? "0") \(context.state.distanceUnit ?? "km")")
  }
}

/// Progress only exists with a denominator. A free run reclaims the row for
/// its context label instead of rendering an empty bar.
private struct RallyRunProgressRow: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    if let fraction = context.state.progressFraction {
      VStack(alignment: .leading, spacing: 5) {
        HStack {
          if let label = context.state.contextLabel {
            Text(label)
              .font(.system(size: 12, weight: .bold))
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
          Spacer(minLength: 6)
          if let progressLabel = context.state.progressLabel {
            Text(progressLabel)
              .font(.system(size: 12, weight: .heavy))
              .foregroundStyle(rallyAccentColor(context))
              .lineLimit(1)
          }
        }
        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            Capsule()
              .fill(Color.white.opacity(0.16))
            Capsule()
              .fill(rallyAccentColor(context))
              // Overshooting the target caps the bar rather than overflowing.
              .frame(width: geometry.size.width * min(max(fraction, 0), 1))
          }
        }
        .frame(height: 5)
      }
    } else if let label = context.state.contextLabel {
      Text(label)
        .font(.system(size: 12, weight: .bold))
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
  }
}

private struct RallyRunMetricsRow: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 0) {
      metric(
        label: context.state.primaryMetricLabel ?? "TIME",
        value: context.state.primaryMetricValue ?? "--"
      )
      Rectangle()
        .fill(Color.white.opacity(0.14))
        .frame(width: 1, height: 26)
        .padding(.horizontal, 14)
      metric(
        label: context.state.secondaryMetricLabel ?? "PACE",
        value: context.state.secondaryMetricValue ?? "--"
      )
      Spacer(minLength: 0)
    }
  }

  private func metric(label: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(label)
        .font(.system(size: 9, weight: .heavy))
        .tracking(0.7)
        .foregroundStyle(.secondary)
      Text(value)
        .font(.system(size: 16, weight: .heavy))
        .italic()
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
  }
}

private struct RallyRunIslandCenter: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      if let label = context.state.contextLabel {
        Text(label)
          .font(.caption2.weight(.bold))
          .foregroundStyle(.secondary)
          .lineLimit(1)
      }
      HStack(alignment: .lastTextBaseline, spacing: 4) {
        Text(context.state.distanceValue ?? "0")
          .font(.system(size: 28, weight: .black))
          .italic()
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Text(context.state.distanceUnit ?? "km")
          .font(.caption.weight(.heavy))
          .foregroundStyle(.secondary)
      }
    }
  }
}

/// Simplified three-arch mark, traced from
/// `docs/design/assets/run-live-activity/rally-colosseum-glyph.svg`
/// (viewBox 0 0 32 24). Even-odd filled — the arch openings are holes.
private struct RallyColosseumGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    let scale = min(rect.width / 32, rect.height / 24)
    let originX = rect.minX + (rect.width - 32 * scale) / 2
    let originY = rect.minY + (rect.height - 24 * scale) / 2
    func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
      CGPoint(x: originX + x * scale, y: originY + y * scale)
    }

    var path = Path()

    // Star
    path.move(to: point(16, 1))
    for vertex in [
      (17.3, 4.9), (21.4, 5), (18.1, 7.4), (19.3, 11.3),
      (16, 8.9), (12.7, 11.3), (13.9, 7.4), (10.6, 5), (14.7, 4.9),
    ] as [(CGFloat, CGFloat)] {
      path.addLine(to: point(vertex.0, vertex.1))
    }
    path.closeSubpath()

    // Body
    path.move(to: point(4, 22))
    path.addLine(to: point(4, 14))
    path.addQuadCurve(to: point(7, 11), control: point(4, 11))
    path.addLine(to: point(26, 9))
    path.addQuadCurve(to: point(29, 12), control: point(29, 9))
    path.addLine(to: point(29, 22))
    path.closeSubpath()

    // Arches, cut out by the even-odd rule.
    for arch in [
      (left: 6.5, right: 11.5, mid: 9.0, shoulder: 16.5, top: 14.0),
      (left: 13.5, right: 18.5, mid: 16.0, shoulder: 15.5, top: 13.0),
      (left: 20.5, right: 25.5, mid: 23.0, shoulder: 14.5, top: 12.0),
    ] as [(left: CGFloat, right: CGFloat, mid: CGFloat, shoulder: CGFloat, top: CGFloat)] {
      path.move(to: point(arch.left, 22))
      path.addLine(to: point(arch.left, arch.shoulder))
      path.addQuadCurve(to: point(arch.mid, arch.top), control: point(arch.left, arch.top))
      path.addQuadCurve(to: point(arch.right, arch.shoulder), control: point(arch.right, arch.top))
      path.addLine(to: point(arch.right, 22))
      path.closeSubpath()
    }

    return path
  }
}

private func compactDistance(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> String {
  if isRunSurface(context) {
    let value = context.state.distanceValue ?? "0"
    let unit = context.state.distanceUnit ?? "km"
    return "\(value) \(unit)"
  }
  return context.state.compactTitle ?? context.state.actorName
}

/// Opaque, activity-tinted panel — deliberately not a blurred material.
private func runCardBackground(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> Color {
  Color(red: 0.09, green: 0.06, blue: 0.06)
}

private struct RallyExpandedLiveActivityView: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        RallyAvatar(text: initials(context.state.actorName), color: rallyAccentColor(context), size: 48)
        VStack(alignment: .leading, spacing: 3) {
          Text(eyebrow(context))
            .font(.caption2.weight(.heavy))
            .foregroundStyle(rallyAccentColor(context))
          Text(context.state.expandedTitle ?? context.state.headline)
            .font(.title3.weight(.heavy))
            .lineLimit(1)
          Text(context.state.expandedSubtitle ?? context.state.subtitle)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
      }
      RallyActionRow(context: context)
    }
    .padding(16)
  }
}

private struct RallyActionRow: View {
  let context: ActivityViewContext<RallyLiveActivityAttributes>

  var body: some View {
    HStack(spacing: 10) {
      if context.attributes.surfaceType == "match_invite" {
        actionButton(title: "Decline", systemImage: "xmark", action: "decline_invite", prominent: false)
        actionButton(title: "Accept", systemImage: "checkmark.circle", action: "accept_invite", prominent: true)
      } else if context.attributes.surfaceType == "friend_request" {
        Link(destination: deepLink(for: context, action: "dismiss_friend_request")) {
          Label("Dismiss", systemImage: "xmark")
        }
        .buttonStyle(.bordered)
        actionButton(title: "Accept", systemImage: "checkmark.circle", action: "accept_friend_request", prominent: true)
      } else if context.attributes.surfaceType == "live_run" {
        runControls
      } else {
        Link(destination: deepLink(for: context, action: "open")) {
          Label("Open", systemImage: "arrow.up.forward")
        }
        .buttonStyle(.borderedProminent)
      }
    }
    .labelStyle(.titleAndIcon)
  }

  // Deep-link controls: the app keeps running in the background during a
  // tracked run, so tapping foregrounds it and the overlay-action route
  // executes pause/resume/stop immediately. statusLabel drives which pair
  // renders; older JS bundles omit it and fall back to Pause + End.
  @ViewBuilder
  private var runControls: some View {
    let status = (context.state.statusLabel ?? "").uppercased()
    if status.contains("READY") {
      Link(destination: deepLink(for: context, action: "open")) {
        Label("Open", systemImage: "arrow.up.forward")
      }
      .buttonStyle(.borderedProminent)
      .tint(rallyAccentColor(context))
    } else {
      if status.contains("PAUSE") {
        Link(destination: deepLink(for: context, action: "resume_run")) {
          Label("Resume", systemImage: "play.fill")
        }
        .buttonStyle(.borderedProminent)
        .tint(rallyAccentColor(context))
      } else {
        Link(destination: deepLink(for: context, action: "pause_run")) {
          Label("Pause", systemImage: "pause.fill")
        }
        .buttonStyle(.borderedProminent)
        .tint(rallyAccentColor(context))
      }
      Link(destination: deepLink(for: context, action: "end_run")) {
        Label("End", systemImage: "stop.fill")
      }
      .buttonStyle(.bordered)
    }
  }

  @ViewBuilder
  private func actionButton(
    title: String,
    systemImage: String,
    action: String,
    prominent: Bool
  ) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      if prominent {
        Button(intent: RallyLiveActivityActionIntent(
          actionType: action,
          inviteId: context.attributes.inviteId,
          requesterId: context.attributes.requesterId
        )) {
          Label(title, systemImage: systemImage)
        }
        .buttonStyle(.borderedProminent)
        .tint(rallyAccentColor(context))
      } else {
        Button(intent: RallyLiveActivityActionIntent(
          actionType: action,
          inviteId: context.attributes.inviteId,
          requesterId: context.attributes.requesterId
        )) {
          Label(title, systemImage: systemImage)
        }
        .buttonStyle(.bordered)
      }
    } else {
      if prominent {
        Link(destination: deepLink(for: context, action: action)) {
          Label(title, systemImage: systemImage)
        }
        .buttonStyle(.borderedProminent)
        .tint(rallyAccentColor(context))
      } else {
        Link(destination: deepLink(for: context, action: action)) {
          Label(title, systemImage: systemImage)
        }
        .buttonStyle(.bordered)
      }
    }
  }
}

private struct RallyAvatar: View {
  let text: String
  let color: Color
  var size: CGFloat = 32

  var body: some View {
    Text(text)
      .font(.system(size: size * 0.34, weight: .black, design: .rounded))
      .foregroundStyle(.black)
      .frame(width: size, height: size)
      .background(color, in: Circle())
  }
}

private func deepLink(
  for context: ActivityViewContext<RallyLiveActivityAttributes>,
  action: String
) -> URL {
  var components = URLComponents()
  components.scheme = "rallyapp"
  components.host = ""
  components.path = "/overlay-action"
  components.queryItems = [
    URLQueryItem(name: "action", value: action),
    URLQueryItem(name: "surfaceType", value: context.attributes.surfaceType),
    URLQueryItem(name: "surfaceKey", value: context.attributes.surfaceId),
    URLQueryItem(name: "route", value: context.attributes.route),
    URLQueryItem(name: "headline", value: context.state.headline),
    URLQueryItem(name: "actorName", value: context.state.actorName),
    URLQueryItem(name: "subtitle", value: context.state.subtitle),
    URLQueryItem(name: "activityType", value: context.state.activityType),
    URLQueryItem(name: "matchId", value: context.attributes.matchId),
    URLQueryItem(name: "inviteId", value: context.attributes.inviteId),
    URLQueryItem(name: "requesterId", value: context.attributes.requesterId),
  ].filter { $0.value != nil }
  return components.url ?? URL(string: "rallyapp:///")!
}

private func eyebrow(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> String {
  switch context.attributes.surfaceType {
  case "friend_request":
    return "FRIEND REQUEST"
  case "live_run":
    return context.state.statusLabel ?? "LIVE RUN"
  default:
    return "MATCH INVITE"
  }
}

private func rallyAccentColor(_ context: ActivityViewContext<RallyLiveActivityAttributes>) -> Color {
  // The activity theme token is the source of truth — it varies per sport and
  // per run state. The hardcoded values below are only the fallback for
  // payloads that predate `accentColor`.
  if let token = color(fromHex: context.state.accentColorHex) { return token }

  switch context.attributes.surfaceType {
  case "friend_request":
    return Color(red: 0.15, green: 0.37, blue: 0.34)
  case "live_run":
    return Color(red: 0.92, green: 0.47, blue: 0.24)
  default:
    return Color(red: 0.92, green: 0.76, blue: 0.10)
  }
}

private func color(fromHex hex: String?) -> Color? {
  guard var value = hex?.trimmingCharacters(in: .whitespacesAndNewlines) else { return nil }
  if value.hasPrefix("#") { value.removeFirst() }
  guard value.count == 6, let rgb = UInt64(value, radix: 16) else { return nil }
  return Color(
    red: Double((rgb >> 16) & 0xff) / 255,
    green: Double((rgb >> 8) & 0xff) / 255,
    blue: Double(rgb & 0xff) / 255
  )
}

private func initials(_ value: String) -> String {
  let parts = value
    .split(separator: " ")
    .map(String.init)
    .filter { !$0.isEmpty }
  if parts.isEmpty { return "RY" }
  if parts.count == 1 { return String(parts[0].prefix(2)).uppercased() }
  return parts.prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
}
