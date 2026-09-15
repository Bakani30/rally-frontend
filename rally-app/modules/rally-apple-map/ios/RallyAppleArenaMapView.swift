import ExpoModulesCore
import Foundation
import MapKit
import UIKit

private enum RallyArenaPinType: String {
  case officialVenue = "official_venue"
  case communityVenue = "community_venue"
  case adHocArena = "ad_hoc_arena"

  var keylineColor: UIColor {
    switch self {
    case .officialVenue: return UIColor(red: 31 / 255, green: 31 / 255, blue: 31 / 255, alpha: 1)
    case .communityVenue: return UIColor(red: 235 / 255, green: 119 / 255, blue: 60 / 255, alpha: 1)
    case .adHocArena: return UIColor(red: 128 / 255, green: 139 / 255, blue: 195 / 255, alpha: 1)
    }
  }

  var badge: String {
    switch self {
    case .officialVenue: return "★"
    case .communityVenue: return "🏀"
    case .adHocArena: return "⚡"
    }
  }

  var thaiLabel: String {
    switch self {
    case .officialVenue: return "สนามทางการ"
    case .communityVenue: return "สนามชุมชน"
    case .adHocArena: return "สนามชั่วคราว"
    }
  }
}

private final class RallyArenaPinAnnotation: NSObject, MKAnnotation {
  let id: String
  let type: RallyArenaPinType
  let identityLabel: String
  let partyAvatarUrl: String?
  let hostAvatarUrl: String?
  let initials: String
  let selected: Bool
  dynamic var coordinate: CLLocationCoordinate2D

  init(
    id: String,
    type: RallyArenaPinType,
    coordinate: CLLocationCoordinate2D,
    identityLabel: String,
    partyAvatarUrl: String?,
    hostAvatarUrl: String?,
    initials: String,
    selected: Bool
  ) {
    self.id = id
    self.type = type
    self.coordinate = coordinate
    self.identityLabel = identityLabel
    self.partyAvatarUrl = partyAvatarUrl
    self.hostAvatarUrl = hostAvatarUrl
    self.initials = initials
    self.selected = selected
  }
}

private final class RallyArenaPinAnnotationView: MKAnnotationView {
  private static let imageCache = NSCache<NSString, UIImage>()
  private let haloView = UIView()
  private let identityView = UIView()
  private let avatarView = UIImageView()
  private let fallbackLabel = UILabel()
  private let badgeView = UIView()
  private let badgeLabel = UILabel()
  private let pointerLayer = CAShapeLayer()
  private var avatarTask: URLSessionDataTask?
  private var representedAvatarUrl: String?

  override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
    super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
    frame = CGRect(x: 0, y: 0, width: 60, height: 70)
    centerOffset = CGPoint(x: 0, y: -35)
    canShowCallout = false
    collisionMode = .circle
    isAccessibilityElement = true
    accessibilityTraits = [.button]

    haloView.backgroundColor = .clear
    haloView.layer.cornerRadius = 28

    identityView.backgroundColor = UIColor.systemBackground
    identityView.layer.cornerRadius = 24
    identityView.layer.borderWidth = 3
    identityView.layer.shadowOffset = CGSize(width: 0, height: 4)
    identityView.layer.shadowRadius = 8
    identityView.layer.shadowOpacity = 0.2

    avatarView.contentMode = .scaleAspectFill
    avatarView.clipsToBounds = true
    avatarView.layer.cornerRadius = 19

    fallbackLabel.textAlignment = .center
    fallbackLabel.adjustsFontSizeToFitWidth = true
    fallbackLabel.minimumScaleFactor = 0.65
    fallbackLabel.font = .systemFont(ofSize: 10, weight: .bold)

    badgeView.backgroundColor = UIColor.systemBackground
    badgeView.layer.cornerRadius = 10
    badgeView.layer.borderWidth = 2
    badgeLabel.textAlignment = .center
    badgeLabel.font = UIFont(name: "AppleColorEmoji", size: 10) ?? .systemFont(ofSize: 10, weight: .bold)

    layer.addSublayer(pointerLayer)
    addSubview(haloView)
    addSubview(identityView)
    identityView.addSubview(avatarView)
    identityView.addSubview(fallbackLabel)
    addSubview(badgeView)
    badgeView.addSubview(badgeLabel)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    haloView.frame = CGRect(x: 2, y: 0, width: 56, height: 56)
    identityView.frame = CGRect(x: 6, y: 4, width: 48, height: 48)
    avatarView.frame = CGRect(x: 5, y: 5, width: 38, height: 38)
    fallbackLabel.frame = avatarView.frame.insetBy(dx: 2, dy: 1)
    badgeView.frame = CGRect(x: 40, y: 38, width: 20, height: 20)
    badgeLabel.frame = badgeView.bounds

    let pointer = UIBezierPath()
    pointer.move(to: CGPoint(x: 22, y: 51))
    pointer.addLine(to: CGPoint(x: 38, y: 51))
    pointer.addLine(to: CGPoint(x: 30, y: 63))
    pointer.close()
    pointerLayer.path = pointer.cgPath
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    avatarTask?.cancel()
    avatarTask = nil
    representedAvatarUrl = nil
    avatarView.image = nil
    fallbackLabel.isHidden = false
    transform = .identity
  }

  func configure(with pin: RallyArenaPinAnnotation) {
    let keyline = pin.type.keylineColor
    identityView.layer.borderColor = keyline.cgColor
    pointerLayer.fillColor = keyline.cgColor
    badgeView.layer.borderColor = keyline.cgColor
    badgeLabel.text = pin.type.badge
    fallbackLabel.text = "\(pin.initials) 🏀"
    fallbackLabel.textColor = UIColor.label
    accessibilityLabel = "\(pin.type.thaiLabel) \(pin.identityLabel)\(pin.selected ? ", เลือกแล้ว" : "")"
    accessibilityTraits = pin.selected ? [.button, .selected] : [.button]
    displayPriority = pin.selected ? .required : .defaultHigh
    clusteringIdentifier = pin.selected ? nil : "rally-arena-pin"

    haloView.backgroundColor = pin.selected
      ? UIColor(red: 235 / 255, green: 119 / 255, blue: 60 / 255, alpha: 0.2)
      : .clear
    identityView.layer.shadowOpacity = pin.selected ? 0.38 : 0.2
    identityView.layer.shadowRadius = pin.selected ? 14 : 8
    transform = pin.selected ? CGAffineTransform(scaleX: 1.12, y: 1.12) : .identity

    if pin.type == .officialVenue {
      badgeView.backgroundColor = UIColor(red: 22 / 255, green: 22 / 255, blue: 22 / 255, alpha: 1)
      badgeLabel.textColor = UIColor(red: 234 / 255, green: 195 / 255, blue: 26 / 255, alpha: 1)
    } else {
      badgeView.backgroundColor = UIColor.systemBackground
      badgeLabel.textColor = keyline
    }

    loadAvatar(pin.partyAvatarUrl ?? pin.hostAvatarUrl)
  }

  private func loadAvatar(_ value: String?) {
    avatarTask?.cancel()
    avatarTask = nil
    representedAvatarUrl = value
    avatarView.image = nil
    fallbackLabel.isHidden = false
    guard let value, let url = URL(string: value), url.scheme == "https" else { return }
    if let cached = Self.imageCache.object(forKey: value as NSString) {
      avatarView.image = cached
      fallbackLabel.isHidden = true
      return
    }
    let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let data, let image = UIImage(data: data) else { return }
      Self.imageCache.setObject(image, forKey: value as NSString)
      DispatchQueue.main.async {
        guard self?.representedAvatarUrl == value else { return }
        self?.avatarView.image = image
        self?.fallbackLabel.isHidden = true
      }
    }
    avatarTask = task
    task.resume()
  }
}

private final class RallyArenaClusterAnnotationView: MKAnnotationView {
  private let countLabel = UILabel()
  private let mixStack = UIStackView()

  override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
    super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
    frame = CGRect(x: 0, y: 0, width: 56, height: 56)
    centerOffset = .zero
    canShowCallout = false
    collisionMode = .circle
    displayPriority = .required
    backgroundColor = UIColor(red: 22 / 255, green: 22 / 255, blue: 22 / 255, alpha: 1)
    layer.cornerRadius = 28
    layer.borderWidth = 2
    layer.borderColor = UIColor.white.cgColor
    layer.shadowColor = UIColor.black.cgColor
    layer.shadowOffset = CGSize(width: 0, height: 4)
    layer.shadowRadius = 8
    layer.shadowOpacity = 0.24
    isAccessibilityElement = true
    accessibilityTraits = [.button]

    countLabel.textAlignment = .center
    countLabel.textColor = .white
    countLabel.font = .systemFont(ofSize: 16, weight: .black)
    countLabel.adjustsFontSizeToFitWidth = true

    mixStack.axis = .horizontal
    mixStack.alignment = .center
    mixStack.distribution = .fillEqually
    mixStack.spacing = 2

    addSubview(countLabel)
    addSubview(mixStack)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    countLabel.frame = CGRect(x: 7, y: 9, width: 42, height: 22)
    mixStack.frame = CGRect(x: 12, y: 33, width: 32, height: 8)
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    mixStack.arrangedSubviews.forEach { view in
      mixStack.removeArrangedSubview(view)
      view.removeFromSuperview()
    }
  }

  func configure(with cluster: MKClusterAnnotation) {
    let pins = cluster.memberAnnotations.compactMap { $0 as? RallyArenaPinAnnotation }
    countLabel.text = "\(pins.count)"
    mixStack.arrangedSubviews.forEach { view in
      mixStack.removeArrangedSubview(view)
      view.removeFromSuperview()
    }
    let orderedTypes: [RallyArenaPinType] = [.officialVenue, .communityVenue, .adHocArena]
    var accessibilityParts: [String] = []
    for type in orderedTypes {
      let count = pins.filter { $0.type == type }.count
      guard count > 0 else { continue }
      let dot = UIView()
      dot.backgroundColor = type == .officialVenue
        ? UIColor(red: 234 / 255, green: 195 / 255, blue: 26 / 255, alpha: 1)
        : type.keylineColor
      dot.layer.cornerRadius = 3
      dot.widthAnchor.constraint(equalToConstant: 6).isActive = true
      dot.heightAnchor.constraint(equalToConstant: 6).isActive = true
      mixStack.addArrangedSubview(dot)
      accessibilityParts.append("\(type.thaiLabel) \(count)")
    }
    accessibilityLabel = "\(pins.count) สนาม: \(accessibilityParts.joined(separator: ", "))"
  }
}

public final class RallyAppleArenaMapView: ExpoView, MKMapViewDelegate {
  public let onPinPress = EventDispatcher()
  public let onClusterPress = EventDispatcher()
  public let onRegionChange = EventDispatcher()
  public let onMapUnavailable = EventDispatcher()

  private let mapView = MKMapView(frame: .zero)
  private var mapLoadTimeoutWorkItem: DispatchWorkItem?
  private var didInitialMapBecomeAvailable = false
  private var didReportUnavailable = false
  private var annotations: [RallyArenaPinAnnotation] = []
  private var cameraState: ArenaCameraState?

  var pinsJson = "[]" {
    didSet {
      guard oldValue != pinsJson else { return }
      updatePins()
    }
  }

  var cameraJson = "" {
    didSet {
      guard oldValue != cameraJson else { return }
      cameraState = Self.parseCamera(cameraJson)
      applyCamera()
    }
  }

  var reducedMotion = false

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    mapView.delegate = self
    mapView.mapType = .standard
    mapView.showsBuildings = true
    mapView.showsCompass = false
    mapView.showsScale = false
    mapView.isRotateEnabled = false
    mapView.isScrollEnabled = true
    mapView.isZoomEnabled = true
    mapView.isPitchEnabled = true
    mapView.backgroundColor = UIColor(red: 238 / 255, green: 242 / 255, blue: 236 / 255, alpha: 1)

    if #available(iOS 16.0, *) {
      let configuration = MKStandardMapConfiguration(elevationStyle: .realistic)
      let filter = MKPointOfInterestFilter(excluding: [.stadium])
      configuration.pointOfInterestFilter = filter
      configuration.showsTraffic = false
      mapView.preferredConfiguration = configuration
    } else if #available(iOS 13.0, *) {
      mapView.pointOfInterestFilter = MKPointOfInterestFilter(excluding: [.stadium])
    }

    addSubview(mapView)
  }

  deinit {
    mapLoadTimeoutWorkItem?.cancel()
    mapView.delegate = nil
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    mapView.frame = bounds
    applyCamera()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      mapLoadTimeoutWorkItem?.cancel()
      return
    }
    scheduleMapLoadTimeout()
  }

  private func updatePins() {
    let next = Self.parsePins(pinsJson)
    mapView.removeAnnotations(annotations)
    annotations = next
    mapView.addAnnotations(next)
  }

  private func applyCamera() {
    guard bounds.width > 0, bounds.height > 0, let state = cameraState else { return }
    let target = Self.makeMapCamera(state: state, bounds: bounds)
    let duration = reducedMotion ? 0 : max(0, state.durationMs / 1000)
    if duration == 0 {
      UIView.performWithoutAnimation { mapView.camera = target }
      return
    }
    UIView.animate(
      withDuration: min(duration, 1.6),
      delay: 0,
      options: [.curveEaseOut, .beginFromCurrentState, .allowUserInteraction]
    ) {
      self.mapView.camera = target
    }
  }

  private func scheduleMapLoadTimeout() {
    guard !didInitialMapBecomeAvailable, !didReportUnavailable else { return }
    mapLoadTimeoutWorkItem?.cancel()
    let workItem = DispatchWorkItem { [weak self] in
      guard let self, self.window != nil, !self.didInitialMapBecomeAvailable else { return }
      self.reportUnavailable(reason: "Apple Arena Map did not become available within 10 seconds")
    }
    mapLoadTimeoutWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 10, execute: workItem)
  }

  private func markInitialMapAvailable() {
    didInitialMapBecomeAvailable = true
    mapLoadTimeoutWorkItem?.cancel()
    mapLoadTimeoutWorkItem = nil
  }

  private func reportUnavailable(reason: String) {
    guard !didReportUnavailable else { return }
    didReportUnavailable = true
    mapLoadTimeoutWorkItem?.cancel()
    onMapUnavailable(["reason": reason])
  }

  public func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    if let cluster = annotation as? MKClusterAnnotation {
      let reuseIdentifier = "rally-arena-cluster"
      let view = (mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)
        as? RallyArenaClusterAnnotationView) ?? RallyArenaClusterAnnotationView(
          annotation: cluster,
          reuseIdentifier: reuseIdentifier
        )
      view.annotation = cluster
      view.configure(with: cluster)
      return view
    }
    guard let pin = annotation as? RallyArenaPinAnnotation else { return nil }
    let reuseIdentifier = "rally-arena-pin"
    let view = (mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)
      as? RallyArenaPinAnnotationView) ?? RallyArenaPinAnnotationView(
        annotation: pin,
        reuseIdentifier: reuseIdentifier
      )
    view.annotation = pin
    view.configure(with: pin)
    return view
  }

  public func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
    if let pin = view.annotation as? RallyArenaPinAnnotation {
      onPinPress(["pinId": pin.id])
      mapView.deselectAnnotation(pin, animated: false)
      return
    }
    guard let cluster = view.annotation as? MKClusterAnnotation else { return }
    onClusterPress([
      "latitude": cluster.coordinate.latitude,
      "longitude": cluster.coordinate.longitude,
      "zoom": Self.currentZoom(mapView),
    ])
    mapView.deselectAnnotation(cluster, animated: false)
  }

  public func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
    let region = mapView.region
    let west = region.center.longitude - region.span.longitudeDelta / 2
    let east = region.center.longitude + region.span.longitudeDelta / 2
    let south = region.center.latitude - region.span.latitudeDelta / 2
    let north = region.center.latitude + region.span.latitudeDelta / 2
    onRegionChange([
      "bounds": [west, south, east, north],
      "zoom": Self.currentZoom(mapView),
    ])
  }

  public func mapViewDidFinishLoadingMap(_ mapView: MKMapView) {
    markInitialMapAvailable()
  }

  public func mapViewDidFinishRenderingMap(_ mapView: MKMapView, fullyRendered: Bool) {
    if fullyRendered { markInitialMapAvailable() }
  }

  public func mapViewDidFailLoadingMap(_ mapView: MKMapView, withError error: Error) {
    // Tile failures may be transient. The startup watchdog owns fallback.
  }

  private struct ArenaCameraState {
    let center: CLLocationCoordinate2D
    let zoom: Double
    let pitch: Double
    let bearing: Double
    let paddingTop: Double
    let paddingBottom: Double
    let durationMs: Double
  }

  private static func parsePins(_ json: String) -> [RallyArenaPinAnnotation] {
    guard let data = json.data(using: .utf8),
      let values = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
    return values.compactMap { value in
      guard let id = value["id"] as? String,
        !id.isEmpty,
        let rawType = value["type"] as? String,
        let type = RallyArenaPinType(rawValue: rawType),
        let coordinate = value["coordinate"] as? [String: Any],
        let latitude = (coordinate["latitude"] as? NSNumber)?.doubleValue,
        let longitude = (coordinate["longitude"] as? NSNumber)?.doubleValue,
        latitude.isFinite,
        longitude.isFinite,
        (-90...90).contains(latitude),
        (-180...180).contains(longitude),
        let identity = value["publicIdentity"] as? [String: Any],
        let label = identity["label"] as? String,
        let initials = identity["initials"] as? String else { return nil }
      return RallyArenaPinAnnotation(
        id: id,
        type: type,
        coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
        identityLabel: label,
        partyAvatarUrl: identity["partyAvatarUrl"] as? String,
        hostAvatarUrl: identity["hostAvatarUrl"] as? String,
        initials: initials,
        selected: (value["selected"] as? Bool) ?? false
      )
    }
  }

  private static func parseCamera(_ json: String) -> ArenaCameraState? {
    guard let data = json.data(using: .utf8),
      let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let center = value["center"] as? [Any],
      center.count >= 2,
      let longitude = (center[0] as? NSNumber)?.doubleValue,
      let latitude = (center[1] as? NSNumber)?.doubleValue,
      let zoom = (value["zoom"] as? NSNumber)?.doubleValue,
      let pitch = (value["pitch"] as? NSNumber)?.doubleValue,
      let bearing = (value["bearing"] as? NSNumber)?.doubleValue,
      longitude.isFinite,
      latitude.isFinite,
      zoom.isFinite,
      pitch.isFinite,
      bearing.isFinite,
      (-180...180).contains(longitude),
      (-90...90).contains(latitude) else { return nil }
    let padding = value["padding"] as? [String: Any]
    return ArenaCameraState(
      center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
      zoom: min(max(zoom, 1), 22),
      pitch: min(max(pitch, 0), 80),
      bearing: bearing,
      paddingTop: (padding?["top"] as? NSNumber)?.doubleValue ?? 0,
      paddingBottom: (padding?["bottom"] as? NSNumber)?.doubleValue ?? 0,
      durationMs: (value["duration"] as? NSNumber)?.doubleValue ?? 0
    )
  }

  private static func makeMapCamera(state: ArenaCameraState, bounds: CGRect) -> MKMapCamera {
    let latitudeCosine = max(cos(state.center.latitude * .pi / 180), 0.1)
    let metersPerPixel = 156543.03392 * latitudeCosine / pow(2, state.zoom)
    let viewportPixels = max(max(bounds.width, bounds.height), 320)
    let distance = min(max(metersPerPixel * viewportPixels * 0.72, 40), 20_000_000)
    let verticalPadding = state.paddingBottom - state.paddingTop
    let latitudeOffsetMeters = verticalPadding * metersPerPixel * 0.5
    let latitudeOffsetDegrees = latitudeOffsetMeters / 111_320
    let adjustedCenter = CLLocationCoordinate2D(
      latitude: state.center.latitude - latitudeOffsetDegrees,
      longitude: state.center.longitude
    )
    return MKMapCamera(
      lookingAtCenter: adjustedCenter,
      fromDistance: distance,
      pitch: state.pitch,
      heading: state.bearing
    )
  }

  private static func currentZoom(_ mapView: MKMapView) -> Double {
    let longitudeDelta = max(mapView.region.span.longitudeDelta, 0.0000001)
    let width = max(Double(mapView.bounds.width), 1)
    return min(max(log2(360 * width / (longitudeDelta * 256)), 1), 22)
  }
}
