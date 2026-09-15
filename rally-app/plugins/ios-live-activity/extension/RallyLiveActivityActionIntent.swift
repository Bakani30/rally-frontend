import AppIntents
import Foundation

private enum RallyLiveActivityShared {
  static let appGroupId = "group.com.anonymous.rally-app"
  static let accessTokenKey = "rally.liveActivity.accessToken"
  static let supabaseUrlKey = "rally.liveActivity.supabaseUrl"
  static let functionRegionKey = "rally.liveActivity.functionRegion"
}

struct RallyLiveActivityActionIntent: AppIntent {
  static var title: LocalizedStringResource = "Rally action"
  static var description = IntentDescription("Responds to a Rally live activity action.")

  @Parameter(title: "Action")
  var actionType: String

  @Parameter(title: "Invite ID")
  var inviteId: String

  @Parameter(title: "Requester ID")
  var requesterId: String

  init() {
    actionType = "open"
    inviteId = ""
    requesterId = ""
  }

  init(actionType: String, inviteId: String? = nil, requesterId: String? = nil) {
    self.actionType = actionType
    self.inviteId = inviteId ?? ""
    self.requesterId = requesterId ?? ""
  }

  func perform() async throws -> some IntentResult {
    guard
      let defaults = UserDefaults(suiteName: RallyLiveActivityShared.appGroupId),
      let accessToken = defaults.string(forKey: RallyLiveActivityShared.accessTokenKey),
      let supabaseUrl = defaults.string(forKey: RallyLiveActivityShared.supabaseUrlKey)
    else {
      return .result()
    }

    switch actionType {
    case "accept_invite":
      guard !inviteId.isEmpty else { return .result() }
      try await invokeFunction(
        supabaseUrl: supabaseUrl,
        accessToken: accessToken,
        functionRegion: defaults.string(forKey: RallyLiveActivityShared.functionRegionKey),
        name: "respond-invite",
        body: ["inviteId": inviteId, "action": "accept"]
      )
    case "decline_invite":
      guard !inviteId.isEmpty else { return .result() }
      try await invokeFunction(
        supabaseUrl: supabaseUrl,
        accessToken: accessToken,
        functionRegion: defaults.string(forKey: RallyLiveActivityShared.functionRegionKey),
        name: "respond-invite",
        body: ["inviteId": inviteId, "action": "decline"]
      )
    case "accept_friend_request":
      guard !requesterId.isEmpty else { return .result() }
      try await invokeFunction(
        supabaseUrl: supabaseUrl,
        accessToken: accessToken,
        functionRegion: defaults.string(forKey: RallyLiveActivityShared.functionRegionKey),
        name: "respond-friend-request",
        body: ["requesterId": requesterId, "action": "accept"]
      )
    default:
      break
    }

    return .result()
  }

  private func invokeFunction(
    supabaseUrl: String,
    accessToken: String,
    functionRegion: String?,
    name: String,
    body: [String: String]
  ) async throws {
    guard let url = URL(string: "\(supabaseUrl)/functions/v1/\(name)") else { return }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    if let functionRegion, !functionRegion.isEmpty {
      request.setValue(functionRegion, forHTTPHeaderField: "x-region")
    }
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (_, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
      return
    }
  }
}
