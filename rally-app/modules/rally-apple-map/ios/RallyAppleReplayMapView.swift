import ExpoModulesCore
import Foundation
import MapKit
import UIKit

private final class RallyReplayMarkerAnnotationView: MKAnnotationView {
  private let avatarView = UIImageView()
  private let contentLabel = UILabel()
  private var avatarTask: URLSessionDataTask?
  private var representedAvatarUrl: String?
  private var representedEmoji: String?
  private var representedInitials: String?

  override init(annotation: MKAnnotation?, reuseIdentifier: String?) {
    super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)

    frame = CGRect(x: 0, y: 0, width: 52, height: 52)
    centerOffset = CGPoint(x: 0, y: -26)
    canShowCallout = false
    displayPriority = .required
    collisionMode = .circle

    avatarView.backgroundColor = .systemBlue
    avatarView.contentMode = .scaleAspectFill
    avatarView.clipsToBounds = true
    avatarView.layer.cornerRadius = 23
    avatarView.layer.borderColor = UIColor.white.cgColor
    avatarView.layer.borderWidth = 3
    avatarView.isUserInteractionEnabled = false

    contentLabel.textAlignment = .center
    contentLabel.textColor = .white
    contentLabel.isUserInteractionEnabled = false

    addSubview(avatarView)
    addSubview(contentLabel)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let contentFrame = bounds.insetBy(dx: 3, dy: 3)
    avatarView.frame = contentFrame
    avatarView.layer.cornerRadius = contentFrame.width / 2
    contentLabel.frame = contentFrame
  }

  func configure(avatarUrl: String?, emoji: String?, initials: String) {
    let normalizedEmoji = emoji?.trimmingCharacters(in: .whitespacesAndNewlines)
    let normalizedInitials = initials.trimmingCharacters(in: .whitespacesAndNewlines)
    if representedAvatarUrl == avatarUrl,
      representedEmoji == normalizedEmoji,
      representedInitials == normalizedInitials {
      return
    }

    avatarTask?.cancel()
    avatarTask = nil
    representedAvatarUrl = avatarUrl
    representedEmoji = normalizedEmoji
    representedInitials = normalizedInitials
    avatarView.image = nil
    let content = (normalizedEmoji?.isEmpty == false ? normalizedEmoji : nil) ?? normalizedInitials
    contentLabel.text = content.trimmingCharacters(in: .whitespacesAndNewlines)
    if normalizedEmoji?.isEmpty == false {
      contentLabel.font = UIFont(name: "AppleColorEmoji", size: 28)
        ?? .systemFont(ofSize: 28)
    } else {
      contentLabel.font = .systemFont(ofSize: 14, weight: .bold)
    }
    contentLabel.isHidden = false
    setNeedsLayout()

    guard let avatarUrl, !avatarUrl.isEmpty else { return }
    if let localImage = Self.loadLocalImage(from: avatarUrl) {
      setAvatarImage(localImage, for: avatarUrl)
      return
    }
    guard let url = URL(string: avatarUrl), url.scheme == "https" || url.scheme == "http" else { return }

    let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        self?.setAvatarImage(image, for: avatarUrl)
      }
    }
    avatarTask = task
    task.resume()
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    avatarTask?.cancel()
    avatarTask = nil
    representedAvatarUrl = nil
    representedEmoji = nil
    representedInitials = nil
    avatarView.image = nil
    contentLabel.isHidden = false
  }

  private func setAvatarImage(_ image: UIImage, for avatarUrl: String) {
    guard representedAvatarUrl == avatarUrl else { return }
    avatarView.image = image
    contentLabel.isHidden = true
  }

  private static func loadLocalImage(from value: String) -> UIImage? {
    guard value.hasPrefix("file://") else { return nil }
    return UIImage(contentsOfFile: String(value.dropFirst("file://".count)))
  }
}

public final class RallyAppleReplayMapView: ExpoView, MKMapViewDelegate {
  private struct ReplayCompanionTrack {
    let id: String
    let fullCoordinates: [CLLocationCoordinate2D]
    let progress: Double
    let marker: CLLocationCoordinate2D?
    let color: UIColor
    let avatarUrl: String?
    let emoji: String?
    let initials: String
  }

  private final class CompanionRouteLayers {
    let full = CAShapeLayer()
    let casing = CAShapeLayer()
    let line = CAShapeLayer()
  }

  public let onMapUnavailable = EventDispatcher()
  public let onMapReady = EventDispatcher()
  public let onWarmupProgress = EventDispatcher()
  public let onMarkerPress = EventDispatcher()

  private let mapView = MKMapView(frame: .zero)
  private let routeLayerView = UIView(frame: .zero)
  private let mapLoadingView = UIView(frame: .zero)
  private let mapLoadingIndicator = UIActivityIndicatorView(style: .medium)
  private let fullRouteLayer = CAShapeLayer()
  private let revealedRouteCasingLayer = CAShapeLayer()
  private let revealedRouteLineLayer = CAShapeLayer()
  private var fullRouteCoordinates: [CLLocationCoordinate2D] = []
  private var companionTracks: [ReplayCompanionTrack] = []
  private var companionRouteLayers: [String: CompanionRouteLayers] = [:]
  private var companionMarkerAnnotations: [String: MKPointAnnotation] = [:]
  private var pendingCompanionRevealAnimations = Set<String>()
  private var markerAnnotation: MKPointAnnotation?

  var revealedProgress = 0.0 {
    didSet {
      guard oldValue != revealedProgress else { return }
      updateRevealedProgress()
    }
  }

  var markerAvatarUrl = "" {
    didSet {
      guard oldValue != markerAvatarUrl else { return }
      updateMarkerView()
    }
  }

  var markerEmoji = "" {
    didSet {
      guard oldValue != markerEmoji else { return }
      updateMarkerView()
    }
  }

  var markerInitials = "R" {
    didSet {
      guard oldValue != markerInitials else { return }
      updateMarkerView()
    }
  }

  private var routeRedrawWorkItem: DispatchWorkItem?
  private var lastRouteRedrawTime: CFTimeInterval = 0
  private let routeRedrawInterval: CFTimeInterval = 1.0 / 60.0
  private var mapLoadTimeoutWorkItem: DispatchWorkItem?
  private let mapLoadTimeout: TimeInterval = 10
  private var didInitialMapBecomeAvailable = false

  private struct WarmupCheckpoint {
    let coordinate: CLLocationCoordinate2D
    let heading: Double
  }

  private let maxWarmupCheckpointCount = 6
  // Match the close street-level framing used by the replay reference video.
  // This is intentionally separate from the overview camera sent by JS.
  private let warmupZoom = 17.5
  private let warmupPitch = 60.0
  private let warmupCheckpointTimeout: TimeInterval = 1.25
  private let warmupTotalTimeout: TimeInterval = 8
  private var warmupCheckpoints: [WarmupCheckpoint] = []
  private var warmupCheckpointIndex = 0
  private var warmupCompletedCount = 0
  private var warmupStartedAt: CFTimeInterval?
  private var warmupDidDegrade = false
  private var warmupRestoreCameraState: ReplayCameraState?
  private var warmupRestoreFollowBearing = true
  private var warmupCheckpointTimeoutWorkItem: DispatchWorkItem?
  private var warmupTotalTimeoutWorkItem: DispatchWorkItem?
  private var warmupGeneration = 0
  private var isWarmupInProgress = false
  private var didReportReady = false

  private struct CameraTransition {
    let from: ReplayCameraState
    let to: ReplayCameraState
    let startedAt: CFTimeInterval
    let duration: CFTimeInterval
  }

  private struct MarkerTransition {
    let from: CLLocationCoordinate2D
    let to: CLLocationCoordinate2D
    let startedAt: CFTimeInterval
    let duration: CFTimeInterval
  }

  private var cameraDisplayLink: CADisplayLink?
  private var cameraTransition: CameraTransition?
  private var renderedCameraState: ReplayCameraState?
  private var markerDisplayLink: CADisplayLink?
  private var markerTransition: MarkerTransition?
  private var renderedMarkerCoordinate: CLLocationCoordinate2D?

  private var cameraState: ReplayCameraState?
  private var didReportUnavailable = false

  var fullCoordinatesJson = "" {
    didSet {
      guard oldValue != fullCoordinatesJson else { return }
      updateFullRoute()
    }
  }

  var companionsJson = "[]" {
    didSet {
      guard oldValue != companionsJson else { return }
      updateCompanions()
    }
  }

  var markerJson = "null" {
    didSet { updateMarker() }
  }

  var cameraJson = "" {
    didSet {
      guard oldValue != cameraJson else { return }
      cameraState = Self.parseCamera(cameraJson)
      if !isWarmupInProgress {
        updateCamera()
        maybeStartWarmup()
      }
    }
  }

  var followBearing = true {
    didSet {
      guard oldValue != followBearing else { return }
      if isWarmupInProgress {
        restartWarmup()
      } else {
        updateCamera()
        maybeStartWarmup()
      }
    }
  }

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    mapView.delegate = self
    mapView.mapType = .standard
    mapView.showsBuildings = true
    mapView.showsCompass = false
    mapView.showsScale = false
    mapView.isRotateEnabled = false
    mapView.isScrollEnabled = false
    mapView.isZoomEnabled = false
    mapView.isPitchEnabled = true
    mapView.backgroundColor = UIColor(red: 238 / 255, green: 244 / 255, blue: 249 / 255, alpha: 1)
    mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

    if #available(iOS 16.0, *) {
      let configuration = MKStandardMapConfiguration(elevationStyle: .realistic)
      if #available(iOS 13.0, *) {
        let pointOfInterestFilter = MKPointOfInterestFilter(excluding: [.stadium])
        mapView.pointOfInterestFilter = pointOfInterestFilter
        configuration.pointOfInterestFilter = pointOfInterestFilter
      }
      configuration.showsTraffic = false
      mapView.preferredConfiguration = configuration
    } else if #available(iOS 13.0, *) {
      mapView.pointOfInterestFilter = MKPointOfInterestFilter(excluding: [.stadium])
    }

    routeLayerView.isUserInteractionEnabled = false
    routeLayerView.backgroundColor = .clear
    routeLayerView.clipsToBounds = true
    routeLayerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    routeLayerView.layer.addSublayer(fullRouteLayer)
    routeLayerView.layer.addSublayer(revealedRouteCasingLayer)
    routeLayerView.layer.addSublayer(revealedRouteLineLayer)
    configureRouteLayer(fullRouteLayer, color: UIColor(red: 31 / 255, green: 122 / 255, blue: 224 / 255, alpha: 0.28), lineWidth: 4)
    configureRouteLayer(revealedRouteCasingLayer, color: UIColor.white.withAlphaComponent(0.88), lineWidth: 9)
    configureRouteLayer(revealedRouteLineLayer, color: .systemBlue, lineWidth: 5)
    revealedRouteCasingLayer.strokeEnd = 0
    revealedRouteLineLayer.strokeEnd = 0

    mapLoadingView.backgroundColor = UIColor(red: 238 / 255, green: 244 / 255, blue: 249 / 255, alpha: 0.38)
    mapLoadingView.isUserInteractionEnabled = false
    mapLoadingIndicator.color = .systemBlue
    mapLoadingIndicator.startAnimating()
    mapLoadingView.addSubview(mapLoadingIndicator)

    addSubview(mapView)
    mapView.addSubview(routeLayerView)
    addSubview(mapLoadingView)
  }

  deinit {
    routeRedrawWorkItem?.cancel()
    mapLoadTimeoutWorkItem?.cancel()
    stopCameraAnimation()
    stopMarkerAnimation()
    cancelWarmup()
    mapView.delegate = nil
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    mapView.frame = bounds
    routeLayerView.frame = mapView.bounds
    mapLoadingView.frame = bounds
    mapLoadingIndicator.center = CGPoint(x: mapLoadingView.bounds.midX, y: mapLoadingView.bounds.midY)
    fullRouteLayer.frame = routeLayerView.bounds
    revealedRouteCasingLayer.frame = routeLayerView.bounds
    revealedRouteLineLayer.frame = routeLayerView.bounds
    updateCamera()
    redrawRouteLayers()
    maybeStartWarmup()
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil else {
      stopMarkerAnimation()
      cancelWarmup()
      return
    }
    guard !didReportUnavailable else { return }
    if !didInitialMapBecomeAvailable {
      scheduleMapLoadTimeout()
    }
    maybeStartWarmup()
  }

  // MARK: - Map overlays

  private func updateFullRoute() {
    fullRouteCoordinates = Self.parseCoordinates(fullCoordinatesJson)
    redrawRouteLayers()

    if isWarmupInProgress {
      if fullRouteCoordinates.count >= 2 {
        restartWarmup()
      } else {
        cancelWarmup()
      }
    } else if fullRouteCoordinates.count >= 2, didReportReady {
      restartWarmup()
    } else {
      maybeStartWarmup()
    }
  }

  private func updateCompanions() {
    let previousProgress = companionTracks.reduce(into: [String: Double]()) { result, track in
      result[track.id] = track.progress
    }
    let nextTracks = Self.parseCompanions(companionsJson)
    let nextIds = Set(nextTracks.map(\.id))
    pendingCompanionRevealAnimations = pendingCompanionRevealAnimations.filter { nextIds.contains($0) }
    for track in nextTracks {
      if previousProgress[track.id] == nil || abs((previousProgress[track.id] ?? 0) - track.progress) > 0.0001 {
        pendingCompanionRevealAnimations.insert(track.id)
      }
    }
    companionTracks = nextTracks
    syncCompanionRouteLayers()
    syncCompanionMarkers()
    redrawRouteLayers()
  }

  private func syncCompanionRouteLayers() {
    let activeIds = Set(companionTracks.map(\.id))
    let staleIds = companionRouteLayers.keys.filter { !activeIds.contains($0) }
    for id in staleIds {
      guard let layers = companionRouteLayers[id] else { continue }
      layers.full.removeFromSuperlayer()
      layers.casing.removeFromSuperlayer()
      layers.line.removeFromSuperlayer()
      companionRouteLayers.removeValue(forKey: id)
    }

    for track in companionTracks {
      let layers: CompanionRouteLayers
      if let existing = companionRouteLayers[track.id] {
        layers = existing
      } else {
        let created = CompanionRouteLayers()
        companionRouteLayers[track.id] = created
        routeLayerView.layer.addSublayer(created.full)
        routeLayerView.layer.addSublayer(created.casing)
        routeLayerView.layer.addSublayer(created.line)
        created.casing.strokeEnd = 0
        created.line.strokeEnd = 0
        layers = created
      }

      configureRouteLayer(layers.full, color: track.color.withAlphaComponent(0.24), lineWidth: 4)
      configureRouteLayer(layers.casing, color: UIColor.white.withAlphaComponent(0.82), lineWidth: 8)
      configureRouteLayer(layers.line, color: track.color, lineWidth: 4)
    }
  }

  private func syncCompanionMarkers() {
    let activeIds = Set(companionTracks.compactMap { $0.marker == nil ? nil : $0.id })
    let staleIds = companionMarkerAnnotations.keys.filter { !activeIds.contains($0) }
    for id in staleIds {
      guard let annotation = companionMarkerAnnotations[id] else { continue }
      mapView.removeAnnotation(annotation)
      companionMarkerAnnotations.removeValue(forKey: id)
    }

    for track in companionTracks {
      guard let coordinate = track.marker else { continue }
      if let annotation = companionMarkerAnnotations[track.id] {
        annotation.coordinate = coordinate
        updateCompanionMarkerView(for: track)
      } else {
        let annotation = MKPointAnnotation()
        annotation.coordinate = coordinate
        companionMarkerAnnotations[track.id] = annotation
        mapView.addAnnotation(annotation)
      }
    }
  }

  private func updateCompanionMarkerView(for track: ReplayCompanionTrack) {
    guard let annotation = companionMarkerAnnotations[track.id],
      let view = mapView.view(for: annotation) as? RallyReplayMarkerAnnotationView else { return }
    view.configure(
      avatarUrl: track.avatarUrl,
      emoji: track.emoji,
      initials: track.initials
    )
  }

  private func configureRouteLayer(_ layer: CAShapeLayer, color: UIColor, lineWidth: CGFloat) {
    layer.fillColor = UIColor.clear.cgColor
    layer.strokeColor = color.cgColor
    layer.lineWidth = lineWidth
    layer.lineJoin = .round
    layer.lineCap = .round
  }

  private func scheduleMapLoadTimeout() {
    mapLoadTimeoutWorkItem?.cancel()
    let workItem = DispatchWorkItem { [weak self] in
      guard let self,
        self.window != nil,
        !self.didInitialMapBecomeAvailable,
        !self.isWarmupInProgress else { return }
      self.mapLoadingIndicator.stopAnimating()
      self.mapLoadingView.isHidden = true
      self.reportUnavailable(reason: "Apple Map did not become available within 10 seconds")
    }
    mapLoadTimeoutWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + mapLoadTimeout, execute: workItem)
  }

  private func maybeStartWarmup() {
    guard window != nil,
      bounds.width > 0,
      bounds.height > 0,
      fullRouteCoordinates.count >= 2,
      cameraState != nil,
      !isWarmupInProgress,
      !didReportReady,
      !didReportUnavailable else { return }

    startWarmup()
  }

  private func startWarmup() {
    guard let cameraState else { return }

    stopCameraAnimation()
    cancelWarmup()
    mapLoadTimeoutWorkItem?.cancel()
    mapLoadTimeoutWorkItem = nil
    didReportReady = false
    isWarmupInProgress = true
    warmupCheckpoints = makeWarmupCheckpoints()
    warmupCheckpointIndex = 0
    warmupCompletedCount = 0
    warmupStartedAt = CACurrentMediaTime()
    warmupDidDegrade = false
    warmupRestoreCameraState = cameraState
    warmupRestoreFollowBearing = followBearing
    mapLoadingView.isHidden = false
    mapLoadingIndicator.startAnimating()

    let total = warmupCheckpoints.count
    onWarmupProgress(["completed": 0, "total": total])

    guard total > 0 else {
      finishWarmup(degraded: false)
      return
    }

    let generation = warmupGeneration
    let totalTimeoutWorkItem = DispatchWorkItem { [weak self] in
      guard let self,
        self.isWarmupInProgress,
        self.warmupGeneration == generation else { return }
      self.finishWarmup(degraded: true, completeRemaining: true)
    }
    warmupTotalTimeoutWorkItem = totalTimeoutWorkItem
    DispatchQueue.main.asyncAfter(deadline: .now() + warmupTotalTimeout, execute: totalTimeoutWorkItem)
    beginWarmupCheckpoint(generation: generation)
  }

  private func beginWarmupCheckpoint(generation: Int) {
    guard isWarmupInProgress,
      warmupGeneration == generation,
      warmupCheckpointIndex < warmupCheckpoints.count,
      warmupRestoreCameraState != nil else { return }

    let checkpoint = warmupCheckpoints[warmupCheckpointIndex]
    let warmupState = ReplayCameraState(
      center: checkpoint.coordinate,
      zoom: warmupZoom,
      pitch: warmupPitch,
      bearing: checkpoint.heading,
      durationMs: 0
    )
    let camera = Self.makeMapCamera(
      state: warmupState,
      bounds: mapView.bounds,
      followBearing: warmupRestoreFollowBearing,
      center: checkpoint.coordinate,
      heading: checkpoint.heading
    )
    UIView.performWithoutAnimation {
      mapView.setCamera(camera, animated: false)
    }
    redrawRouteLayers()

    warmupCheckpointTimeoutWorkItem?.cancel()
    let checkpointIndex = warmupCheckpointIndex
    let timeoutWorkItem = DispatchWorkItem { [weak self] in
      guard let self,
        self.isWarmupInProgress,
        self.warmupGeneration == generation,
        self.warmupCheckpointIndex == checkpointIndex else { return }
      self.advanceWarmupCheckpoint(degraded: true, generation: generation)
    }
    warmupCheckpointTimeoutWorkItem = timeoutWorkItem
    DispatchQueue.main.asyncAfter(deadline: .now() + warmupCheckpointTimeout, execute: timeoutWorkItem)
  }

  private func advanceWarmupCheckpoint(degraded: Bool, generation: Int) {
    guard isWarmupInProgress,
      warmupGeneration == generation,
      warmupCheckpointIndex < warmupCheckpoints.count else { return }

    warmupCheckpointTimeoutWorkItem?.cancel()
    warmupCheckpointTimeoutWorkItem = nil
    warmupDidDegrade = warmupDidDegrade || degraded
    warmupCheckpointIndex += 1
    warmupCompletedCount = warmupCheckpointIndex
    onWarmupProgress([
      "completed": warmupCompletedCount,
      "total": warmupCheckpoints.count,
    ])

    if warmupCheckpointIndex >= warmupCheckpoints.count {
      finishWarmup(degraded: warmupDidDegrade)
    } else {
      beginWarmupCheckpoint(generation: generation)
    }
  }

  private func finishWarmup(degraded: Bool, completeRemaining: Bool = false) {
    guard isWarmupInProgress else { return }

    let checkpointCount = warmupCheckpoints.count
    let durationMs = ((CACurrentMediaTime() - (warmupStartedAt ?? CACurrentMediaTime())) * 1000)
    let finalDegraded = degraded || warmupDidDegrade

    if completeRemaining {
      warmupCheckpointIndex = checkpointCount
      warmupCompletedCount = checkpointCount
      onWarmupProgress(["completed": checkpointCount, "total": checkpointCount])
    }

    warmupGeneration += 1
    isWarmupInProgress = false
    warmupCheckpointTimeoutWorkItem?.cancel()
    warmupCheckpointTimeoutWorkItem = nil
    warmupTotalTimeoutWorkItem?.cancel()
    warmupTotalTimeoutWorkItem = nil

    if let restoreState = warmupRestoreCameraState {
      let camera = Self.makeMapCamera(
        state: restoreState,
        bounds: mapView.bounds,
        followBearing: warmupRestoreFollowBearing
      )
      UIView.performWithoutAnimation {
        mapView.setCamera(camera, animated: false)
      }
      renderedCameraState = Self.cameraState(
        from: restoreState,
        followBearing: warmupRestoreFollowBearing
      )
      redrawRouteLayers()
    }

    warmupStartedAt = nil
    warmupRestoreCameraState = nil
    mapLoadingIndicator.stopAnimating()
    mapLoadingView.isHidden = true
    didReportReady = true
    onMapReady([
      "degraded": finalDegraded,
      "checkpointCount": checkpointCount,
      "durationMs": durationMs,
    ])
  }

  private func restartWarmup() {
    guard !didReportUnavailable else { return }
    cancelWarmup()
    didReportReady = false
    mapLoadingView.isHidden = false
    mapLoadingIndicator.startAnimating()
    maybeStartWarmup()
  }

  private func cancelWarmup() {
    stopCameraAnimation()
    warmupGeneration += 1
    isWarmupInProgress = false
    warmupCheckpointTimeoutWorkItem?.cancel()
    warmupCheckpointTimeoutWorkItem = nil
    warmupTotalTimeoutWorkItem?.cancel()
    warmupTotalTimeoutWorkItem = nil
    warmupCheckpoints = []
    warmupCheckpointIndex = 0
    warmupCompletedCount = 0
    warmupStartedAt = nil
    warmupDidDegrade = false
    warmupRestoreCameraState = nil
  }

  private func redrawRouteLayers() {
    let now = CACurrentMediaTime()
    let elapsed = now - lastRouteRedrawTime
    if elapsed < routeRedrawInterval {
      guard routeRedrawWorkItem == nil else { return }
      let delay = max(routeRedrawInterval - elapsed, 0)
      let workItem = DispatchWorkItem { [weak self] in
        guard let self else { return }
        self.routeRedrawWorkItem = nil
        self.redrawRouteLayersNow()
      }
      routeRedrawWorkItem = workItem
      DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
      return
    }

    routeRedrawWorkItem?.cancel()
    routeRedrawWorkItem = nil
    redrawRouteLayersNow()
  }

  private func redrawRouteLayersNow() {
    lastRouteRedrawTime = CACurrentMediaTime()
    let screenPoints = makeScreenPoints(for: fullRouteCoordinates)
    let fullPath = makeScreenPath(for: screenPoints)
    fullRouteLayer.path = fullPath
    revealedRouteCasingLayer.path = fullPath
    revealedRouteLineLayer.path = fullPath
    let strokeEnd = strokeEndForProgress(
      revealedProgress,
      coordinates: fullRouteCoordinates,
      screenPoints: screenPoints
    )
    revealedRouteCasingLayer.strokeEnd = strokeEnd
    revealedRouteLineLayer.strokeEnd = strokeEnd

    for track in companionTracks {
      guard let layers = companionRouteLayers[track.id] else { continue }
      let companionScreenPoints = makeScreenPoints(for: track.fullCoordinates)
      layers.full.path = makeScreenPath(for: companionScreenPoints)
      layers.casing.path = layers.full.path
      layers.line.path = layers.full.path
      let companionStrokeEnd = strokeEndForProgress(
        track.progress,
        coordinates: track.fullCoordinates,
        screenPoints: companionScreenPoints
      )
      layers.casing.strokeEnd = companionStrokeEnd
      layers.line.strokeEnd = companionStrokeEnd
      if routeLayerView.bounds.width > 0,
        routeLayerView.bounds.height > 0,
        pendingCompanionRevealAnimations.remove(track.id) != nil {
        let current = (layers.line.presentation() as? CAShapeLayer)?.strokeEnd ?? layers.line.strokeEnd
        animateStrokeEnd([layers.casing, layers.line], from: current, to: companionStrokeEnd)
      }
    }
  }

  private func makeScreenPoints(for coordinates: [CLLocationCoordinate2D]) -> [CGPoint] {
    coordinates.compactMap { coordinate in
      let point = mapView.convert(coordinate, toPointTo: routeLayerView)
      return point.x.isFinite && point.y.isFinite ? point : nil
    }
  }

  private func strokeEndForProgress(
    _ progress: Double,
    coordinates: [CLLocationCoordinate2D],
    screenPoints: [CGPoint]
  ) -> CGFloat {
    let clamped = min(max(progress, 0), 1)
    guard coordinates.count >= 2,
      screenPoints.count == coordinates.count else {
      return CGFloat(clamped)
    }

    var geographicCumulative = [Double](repeating: 0, count: coordinates.count)
    var screenCumulative = [CGFloat](repeating: 0, count: screenPoints.count)
    for index in 1..<coordinates.count {
      geographicCumulative[index] = geographicCumulative[index - 1]
        + Self.coordinateDistanceMeters(coordinates[index - 1], coordinates[index])
      screenCumulative[index] = screenCumulative[index - 1]
        + hypot(
          screenPoints[index].x - screenPoints[index - 1].x,
          screenPoints[index].y - screenPoints[index - 1].y
        )
    }

    let geographicTotal = geographicCumulative.last ?? 0
    let screenTotal = screenCumulative.last ?? 0
    guard geographicTotal > 0, screenTotal > 0 else { return 0 }

    let targetDistance = geographicTotal * clamped
    var segment = 0
    while segment + 1 < geographicCumulative.count,
      geographicCumulative[segment + 1] <= targetDistance {
      segment += 1
    }
    if segment >= coordinates.count - 1 { return 1 }

    let geographicSpan = geographicCumulative[segment + 1] - geographicCumulative[segment]
    let segmentProgress = geographicSpan > 0
      ? (targetDistance - geographicCumulative[segment]) / geographicSpan
      : 0
    let screenSpan = screenCumulative[segment + 1] - screenCumulative[segment]
    let targetScreenDistance = screenCumulative[segment] + screenSpan * CGFloat(segmentProgress)
    return min(max(targetScreenDistance / screenTotal, 0), 1)
  }

  private func updateRevealedProgress() {
    let target = strokeEndForProgress(
      revealedProgress,
      coordinates: fullRouteCoordinates,
      screenPoints: makeScreenPoints(for: fullRouteCoordinates)
    )
    let current = (revealedRouteLineLayer.presentation() as? CAShapeLayer)?.strokeEnd
      ?? revealedRouteLineLayer.strokeEnd

    revealedRouteCasingLayer.strokeEnd = target
    revealedRouteLineLayer.strokeEnd = target

    animateStrokeEnd(
      [revealedRouteCasingLayer, revealedRouteLineLayer],
      from: current,
      to: target
    )
  }

  private func animateStrokeEnd(
    _ layers: [CAShapeLayer],
    from current: CGFloat,
    to target: CGFloat
  ) {
    guard abs(current - target) > 0.001 else { return }
    let duration = min(max(abs(target - current) * 0.18, 0.06), 0.18)
    for layer in layers {
      let animation = CABasicAnimation(keyPath: "strokeEnd")
      animation.fromValue = current
      animation.toValue = target
      animation.duration = duration
      animation.timingFunction = CAMediaTimingFunction(name: .easeOut)
      layer.add(animation, forKey: "replay-route-reveal")
    }
  }

  private func makeScreenPath(for points: [CGPoint]) -> CGPath? {
    guard points.count >= 2 else { return nil }

    let path = CGMutablePath()
    path.move(to: points[0])
    for point in points.dropFirst() {
      path.addLine(to: point)
    }
    return path
  }

  // MARK: - Marker

  private func updateMarker() {
    guard let coordinate = Self.parseMarker(markerJson) else {
      stopMarkerAnimation()
      renderedMarkerCoordinate = nil
      if let markerAnnotation {
        mapView.removeAnnotation(markerAnnotation)
        self.markerAnnotation = nil
      }
      return
    }

    if let markerAnnotation {
      let from = renderedMarkerCoordinate ?? markerAnnotation.coordinate
      markerTransition = MarkerTransition(
        from: from,
        to: coordinate,
        startedAt: CACurrentMediaTime(),
        duration: 0.11
      )
      if markerDisplayLink == nil {
        let displayLink = CADisplayLink(target: self, selector: #selector(handleMarkerDisplayLink(_:)))
        displayLink.add(to: .main, forMode: .common)
        markerDisplayLink = displayLink
      }
      renderMarkerTransition(at: CACurrentMediaTime())
      updateMarkerView()
    } else {
      let annotation = MKPointAnnotation()
      annotation.coordinate = coordinate
      renderedMarkerCoordinate = coordinate
      markerAnnotation = annotation
      mapView.addAnnotation(annotation)
    }
  }

  private func updateMarkerView() {
    guard let markerAnnotation,
      let view = mapView.view(for: markerAnnotation) as? RallyReplayMarkerAnnotationView else { return }
    view.configure(
      avatarUrl: markerAvatarUrl.isEmpty ? nil : markerAvatarUrl,
      emoji: markerEmoji.isEmpty ? nil : markerEmoji,
      initials: markerInitials
    )
  }

  private func stopMarkerDisplayLink() {
    markerDisplayLink?.invalidate()
    markerDisplayLink = nil
  }

  private func stopMarkerAnimation() {
    markerTransition = nil
    stopMarkerDisplayLink()
  }

  @objc private func handleMarkerDisplayLink(_ displayLink: CADisplayLink) {
    renderMarkerTransition(at: CACurrentMediaTime())
  }

  private func renderMarkerTransition(at time: CFTimeInterval) {
    guard let transition = markerTransition,
      let markerAnnotation else {
      stopMarkerDisplayLink()
      return
    }

    let progress = min(max((time - transition.startedAt) / transition.duration, 0), 1)
    let coordinate = CLLocationCoordinate2D(
      latitude: transition.from.latitude + (transition.to.latitude - transition.from.latitude) * progress,
      longitude: transition.from.longitude + (transition.to.longitude - transition.from.longitude) * progress
    )
    UIView.performWithoutAnimation {
      markerAnnotation.coordinate = coordinate
    }
    renderedMarkerCoordinate = coordinate

    if progress >= 1 {
      markerTransition = nil
      stopMarkerDisplayLink()
    }
  }

  // MARK: - Camera

  private func updateCamera() {
    guard !isWarmupInProgress, let cameraState else { return }
    scheduleCameraTransition(to: cameraState)
  }

  private func scheduleCameraTransition(to requestedState: ReplayCameraState) {
    let targetState = Self.cameraState(from: requestedState, followBearing: followBearing)
    let duration = max(requestedState.durationMs / 1000, 0)

    guard duration > 0 else {
      stopCameraAnimation()
      applyCameraState(targetState)
      renderedCameraState = targetState
      return
    }

    let fromState = renderedCameraState ?? targetState
    cameraTransition = CameraTransition(
      from: fromState,
      to: targetState,
      startedAt: CACurrentMediaTime(),
      // Keep chase updates interruptible. Long overview/dive/finale values
      // still get their full cinematic duration.
      duration: min(max(duration, 0.06), 1.6)
    )
    if cameraDisplayLink == nil {
      let displayLink = CADisplayLink(target: self, selector: #selector(handleCameraDisplayLink(_:)))
      displayLink.add(to: .main, forMode: .common)
      cameraDisplayLink = displayLink
    }
    renderCameraTransition(at: CACurrentMediaTime())
  }

  private func applyCameraState(_ state: ReplayCameraState) {
    let camera = Self.makeMapCamera(
      state: state,
      bounds: mapView.bounds,
      followBearing: false,
      heading: state.bearing
    )
    UIView.performWithoutAnimation {
      mapView.setCamera(camera, animated: false)
    }
    redrawRouteLayers()
  }

  private func stopCameraDisplayLink() {
    cameraDisplayLink?.invalidate()
    cameraDisplayLink = nil
  }

  private func stopCameraAnimation() {
    cameraTransition = nil
    stopCameraDisplayLink()
  }

  @objc private func handleCameraDisplayLink(_ displayLink: CADisplayLink) {
    renderCameraTransition(at: CACurrentMediaTime())
  }

  private func renderCameraTransition(at time: CFTimeInterval) {
    guard let transition = cameraTransition else {
      stopCameraDisplayLink()
      return
    }

    let linearProgress = min(max((time - transition.startedAt) / transition.duration, 0), 1)
    let progress = transition.duration >= 0.25
      ? 1 - pow(1 - linearProgress, 3)
      : linearProgress
    let from = transition.from
    let to = transition.to
    let state = ReplayCameraState(
      center: CLLocationCoordinate2D(
        latitude: from.center.latitude + (to.center.latitude - from.center.latitude) * progress,
        longitude: from.center.longitude + (to.center.longitude - from.center.longitude) * progress
      ),
      zoom: from.zoom + (to.zoom - from.zoom) * progress,
      pitch: from.pitch + (to.pitch - from.pitch) * progress,
      bearing: Self.lerpBearing(from.bearing, to.bearing, progress),
      durationMs: 0
    )
    applyCameraState(state)
    renderedCameraState = state

    if linearProgress >= 1 {
      cameraTransition = nil
      stopCameraDisplayLink()
    }
  }

  private static func cameraState(
    from state: ReplayCameraState,
    followBearing: Bool
  ) -> ReplayCameraState {
    ReplayCameraState(
      center: state.center,
      zoom: state.zoom,
      pitch: state.pitch,
      bearing: followBearing ? normalizedBearing(state.bearing) : 0,
      durationMs: state.durationMs
    )
  }

  private static func lerpBearing(_ from: Double, _ to: Double, _ progress: Double) -> Double {
    let delta = ((to - from + 540).truncatingRemainder(dividingBy: 360)) - 180
    return normalizedBearing(from + delta * progress)
  }

  private static func makeMapCamera(
    state: ReplayCameraState,
    bounds: CGRect,
    followBearing: Bool,
    center: CLLocationCoordinate2D? = nil,
    heading: Double? = nil
  ) -> MKMapCamera {
    let latitudeCosine = max(cos(state.center.latitude * .pi / 180), 0.1)
    let metersPerPixel = 156543.03392 * latitudeCosine / pow(2, state.zoom)
    let viewportPixels = max(max(bounds.width, bounds.height), 320)
    // MapKit's fromDistance is not a MapLibre zoom value. A 1:1 conversion
    // makes a pitched replay several blocks too wide. Keep overview/finale
    // framing generous, but pull the street-level chase camera in close.
    let distanceScale = state.pitch >= 45 ? 0.72 : 1.6
    let distance = min(max(metersPerPixel * viewportPixels * distanceScale, 40), 20_000_000)

    return MKMapCamera(
      lookingAtCenter: center ?? state.center,
      fromDistance: distance,
      pitch: min(max(state.pitch, 0), 80),
      heading: heading ?? (followBearing ? state.bearing : 0)
    )
  }

  private func makeWarmupCheckpoints() -> [WarmupCheckpoint] {
    guard !fullRouteCoordinates.isEmpty else { return [] }

    let targetCount = min(maxWarmupCheckpointCount, fullRouteCoordinates.count)
    var checkpoints: [WarmupCheckpoint] = []
    checkpoints.reserveCapacity(targetCount)

    for index in makeWarmupCheckpointIndexes(targetCount: targetCount) {
      let coordinate = fullRouteCoordinates[index]
      guard !checkpoints.contains(where: {
        Self.coordinatesAreNear($0.coordinate, coordinate, withinMeters: 2)
      }) else { continue }

      let heading = followBearing
        ? Self.routeBearing(fullRouteCoordinates, at: index, fallback: cameraState?.bearing ?? 0)
        : 0
      checkpoints.append(WarmupCheckpoint(coordinate: coordinate, heading: heading))
    }

    return checkpoints
  }

  private func makeWarmupCheckpointIndexes(targetCount: Int) -> [Int] {
    guard targetCount > 0, fullRouteCoordinates.count > 0 else { return [] }
    guard targetCount > 1 else { return [0] }

    var cumulativeDistances = Array(repeating: 0.0, count: fullRouteCoordinates.count)
    if fullRouteCoordinates.count > 1 {
      for index in 1..<fullRouteCoordinates.count {
        cumulativeDistances[index] = cumulativeDistances[index - 1]
          + Self.coordinateDistanceMeters(fullRouteCoordinates[index - 1], fullRouteCoordinates[index])
      }
    }

    let totalDistance = cumulativeDistances.last ?? 0
    return (0..<targetCount).map { slot in
      let fraction = Double(slot) / Double(targetCount - 1)
      guard totalDistance > 0 else {
        return Int((Double(fullRouteCoordinates.count - 1) * fraction).rounded())
      }

      let targetDistance = totalDistance * fraction
      var index = 0
      while index + 1 < cumulativeDistances.count,
        cumulativeDistances[index + 1] <= targetDistance {
        index += 1
      }
      return index
    }
  }

  private static func coordinatesAreNear(
    _ first: CLLocationCoordinate2D,
    _ second: CLLocationCoordinate2D,
    withinMeters: Double
  ) -> Bool {
    let metersPerDegree = 111_320.0
    let meanLatitude = (first.latitude + second.latitude) * .pi / 360
    let latitudeMeters = (first.latitude - second.latitude) * metersPerDegree
    let longitudeMeters = (first.longitude - second.longitude) * metersPerDegree * cos(meanLatitude)
    return hypot(latitudeMeters, longitudeMeters) <= withinMeters
  }

  private static func coordinateDistanceMeters(
    _ first: CLLocationCoordinate2D,
    _ second: CLLocationCoordinate2D
  ) -> Double {
    let earthRadius = 6_371_000.0
    let latitude1 = first.latitude * .pi / 180
    let latitude2 = second.latitude * .pi / 180
    let latitudeDelta = (second.latitude - first.latitude) * .pi / 180
    let longitudeDelta = (second.longitude - first.longitude) * .pi / 180
    let sineLatitude = sin(latitudeDelta / 2)
    let sineLongitude = sin(longitudeDelta / 2)
    let haversine = sineLatitude * sineLatitude
      + cos(latitude1) * cos(latitude2) * sineLongitude * sineLongitude
    return 2 * earthRadius * atan2(sqrt(haversine), sqrt(max(1 - haversine, 0)))
  }

  private static func routeBearing(
    _ coordinates: [CLLocationCoordinate2D],
    at index: Int,
    fallback: Double
  ) -> Double {
    guard coordinates.indices.contains(index) else { return normalizedBearing(fallback) }
    let current = coordinates[index]

    var previousIndex = index - 1
    while previousIndex >= 0,
      coordinatesAreNear(coordinates[previousIndex], current, withinMeters: 0.5) {
      previousIndex -= 1
    }

    var nextIndex = index + 1
    while nextIndex < coordinates.count,
      coordinatesAreNear(coordinates[nextIndex], current, withinMeters: 0.5) {
      nextIndex += 1
    }

    if previousIndex >= 0, nextIndex < coordinates.count {
      return bearing(from: coordinates[previousIndex], to: coordinates[nextIndex])
    }
    if nextIndex < coordinates.count {
      return bearing(from: current, to: coordinates[nextIndex])
    }
    if previousIndex >= 0 {
      return bearing(from: coordinates[previousIndex], to: current)
    }
    return normalizedBearing(fallback)
  }

  private static func bearing(from first: CLLocationCoordinate2D, to second: CLLocationCoordinate2D) -> Double {
    let latitude1 = first.latitude * .pi / 180
    let latitude2 = second.latitude * .pi / 180
    let longitudeDelta = (second.longitude - first.longitude) * .pi / 180
    let y = sin(longitudeDelta) * cos(latitude2)
    let x = cos(latitude1) * sin(latitude2)
      - sin(latitude1) * cos(latitude2) * cos(longitudeDelta)
    return normalizedBearing(atan2(y, x) * 180 / .pi)
  }

  private static func normalizedBearing(_ bearing: Double) -> Double {
    let normalized = bearing.truncatingRemainder(dividingBy: 360)
    return normalized >= 0 ? normalized : normalized + 360
  }

  // MARK: - MKMapViewDelegate

  public func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
    MKOverlayRenderer(overlay: overlay)
  }

  public func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
    redrawRouteLayers()
  }

  public func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    let companionTrack = companionMarkerAnnotations.first {
      ($0.value as AnyObject) === (annotation as AnyObject)
    }.flatMap { entry in companionTracks.first { $0.id == entry.key } }
    let isPrimaryMarker = markerAnnotation.map {
      ($0 as AnyObject) === (annotation as AnyObject)
    } ?? false
    guard isPrimaryMarker || companionTrack != nil else { return nil }

    let reuseIdentifier = "rally-replay-marker"
    let view = (mapView.dequeueReusableAnnotationView(withIdentifier: reuseIdentifier)
      as? RallyReplayMarkerAnnotationView) ?? RallyReplayMarkerAnnotationView(
        annotation: annotation,
        reuseIdentifier: reuseIdentifier
      )
    view.annotation = annotation
    view.configure(
      avatarUrl: companionTrack?.avatarUrl ?? (markerAvatarUrl.isEmpty ? nil : markerAvatarUrl),
      emoji: companionTrack?.emoji ?? (markerEmoji.isEmpty ? nil : markerEmoji),
      initials: companionTrack?.initials ?? markerInitials
    )
    return view
  }

  public func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
    guard let selectedAnnotation = view.annotation else { return }
    if let markerAnnotation,
      (selectedAnnotation as AnyObject) === markerAnnotation {
      onMarkerPress(["playerId": "self"])
      mapView.deselectAnnotation(markerAnnotation, animated: false)
      return
    }

    guard let companionId = companionMarkerAnnotations.first(where: {
      ($0.value as AnyObject) === (selectedAnnotation as AnyObject)
    })?.key,
      let annotation = companionMarkerAnnotations[companionId] else { return }
    onMarkerPress(["playerId": companionId])
    mapView.deselectAnnotation(annotation, animated: false)
  }

  public func mapViewDidFailLoadingMap(_ mapView: MKMapView, withError error: Error) {
    // MapKit can report transient tile failures while another request is still
    // pending. Keep the native surface mounted and let the startup watchdog
    // decide whether the initial map load is genuinely stuck.
  }

  public func mapViewDidFinishLoadingMap(_ mapView: MKMapView) {
    markInitialMapAvailable()
  }

  public func mapViewDidFinishRenderingMap(_ mapView: MKMapView, fullyRendered: Bool) {
    guard fullyRendered else { return }
    if !didInitialMapBecomeAvailable {
      markInitialMapAvailable()
      return
    }
    guard isWarmupInProgress else {
      maybeStartWarmup()
      return
    }
    advanceWarmupCheckpoint(degraded: false, generation: warmupGeneration)
  }

  private func markInitialMapAvailable() {
    didInitialMapBecomeAvailable = true
    mapLoadTimeoutWorkItem?.cancel()
    mapLoadTimeoutWorkItem = nil
    maybeStartWarmup()
  }

  private func reportUnavailable(reason: String) {
    guard !didReportUnavailable else { return }
    didReportUnavailable = true
    cancelWarmup()
    mapLoadingIndicator.stopAnimating()
    mapLoadingView.isHidden = true
    onMapUnavailable(["reason": reason])
  }

  // MARK: - JSON parsing

  private struct ReplayCameraState {
    let center: CLLocationCoordinate2D
    let zoom: Double
    let pitch: Double
    let bearing: Double
    let durationMs: Double
  }

  private static func parseCoordinates(_ json: String) -> [CLLocationCoordinate2D] {
    guard let data = json.data(using: .utf8),
      let rawCoordinates = try? JSONSerialization.jsonObject(with: data) as? [Any] else {
      return []
    }

    return parseCoordinatePairs(rawCoordinates)
  }

  private static func parseCompanions(_ json: String) -> [ReplayCompanionTrack] {
    guard let data = json.data(using: .utf8),
      let rawCompanions = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
      return []
    }

    return rawCompanions.compactMap { rawCompanion in
      guard let id = rawCompanion["id"] as? String,
        !id.isEmpty,
        let rawCoordinates = rawCompanion["fullCoordinates"] as? [Any] else { return nil }
      let coordinates = parseCoordinatePairs(rawCoordinates)
      guard coordinates.count >= 2 else { return nil }

      var marker: CLLocationCoordinate2D?
      if let rawMarker = rawCompanion["marker"] as? [String: Any],
        let longitude = (rawMarker["lng"] as? NSNumber)?.doubleValue,
        let latitude = (rawMarker["lat"] as? NSNumber)?.doubleValue,
        longitude.isFinite,
        latitude.isFinite,
        (-180...180).contains(longitude),
        (-90...90).contains(latitude) {
        marker = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      }

      let progress = min(max((rawCompanion["revealedProgress"] as? NSNumber)?.doubleValue ?? 0, 0), 1)
      return ReplayCompanionTrack(
        id: id,
        fullCoordinates: coordinates,
        progress: progress,
        marker: marker,
        color: parseColor(rawCompanion["color"] as? String),
        avatarUrl: rawCompanion["markerAvatarUrl"] as? String,
        emoji: rawCompanion["markerEmoji"] as? String,
        initials: (rawCompanion["markerInitials"] as? String) ?? "?"
      )
    }
  }

  private static func parseCoordinatePairs(_ rawCoordinates: [Any]) -> [CLLocationCoordinate2D] {

    return rawCoordinates.compactMap { rawCoordinate in
      guard let pair = rawCoordinate as? [Any], pair.count >= 2,
      let longitude = (pair[0] as? NSNumber)?.doubleValue,
      let latitude = (pair[1] as? NSNumber)?.doubleValue,
      longitude.isFinite, latitude.isFinite,
      (-180...180).contains(longitude), (-90...90).contains(latitude) else { return nil }
      return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
  }

  private static func parseColor(_ value: String?) -> UIColor {
    guard let value else { return .systemOrange }
    let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let hex = normalized.replacingOccurrences(of: "#", with: "")
    if hex.count == 6, let rgb = UInt64(hex, radix: 16) {
      return UIColor(
        red: CGFloat((rgb >> 16) & 0xff) / 255,
        green: CGFloat((rgb >> 8) & 0xff) / 255,
        blue: CGFloat(rgb & 0xff) / 255,
        alpha: 1
      )
    }

    let lowercased = normalized.lowercased()
    let isRgb = lowercased.hasPrefix("rgb(") && lowercased.hasSuffix(")")
    let isRgba = lowercased.hasPrefix("rgba(") && lowercased.hasSuffix(")")
    guard isRgb || isRgba else {
      return .systemOrange
    }
    let values = lowercased
      .drop(while: { $0 != "(" })
      .dropFirst()
      .dropLast()
      .split(separator: ",")
      .compactMap { Double($0.trimmingCharacters(in: .whitespacesAndNewlines)) }
    guard values.count == 3 || values.count == 4,
      values.prefix(3).allSatisfy({ (0...255).contains($0) }) else {
      return .systemOrange
    }
    let alpha = values.count == 4 ? min(max(values[3], 0), 1) : 1
    return UIColor(
      red: CGFloat(values[0] / 255),
      green: CGFloat(values[1] / 255),
      blue: CGFloat(values[2] / 255),
      alpha: CGFloat(alpha)
    )
  }

  private static func parseMarker(_ json: String) -> CLLocationCoordinate2D? {
    guard let data = json.data(using: .utf8),
      let marker = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let longitude = (marker["lng"] as? NSNumber)?.doubleValue,
      let latitude = (marker["lat"] as? NSNumber)?.doubleValue,
      longitude.isFinite, latitude.isFinite,
      (-180...180).contains(longitude), (-90...90).contains(latitude) else { return nil }
    return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
  }

  private static func parseCamera(_ json: String) -> ReplayCameraState? {
    guard let data = json.data(using: .utf8),
      let camera = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let center = camera["center"] as? [Any], center.count >= 2,
      let longitude = (center[0] as? NSNumber)?.doubleValue,
      let latitude = (center[1] as? NSNumber)?.doubleValue,
      let zoom = (camera["zoom"] as? NSNumber)?.doubleValue,
      let pitch = (camera["pitch"] as? NSNumber)?.doubleValue,
      let bearing = (camera["bearing"] as? NSNumber)?.doubleValue,
      longitude.isFinite, latitude.isFinite, zoom.isFinite, pitch.isFinite, bearing.isFinite,
      (-180...180).contains(longitude), (-90...90).contains(latitude) else { return nil }

    let durationMs = (camera["durationMs"] as? NSNumber)?.doubleValue ?? 0
    return ReplayCameraState(
      center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
      zoom: min(max(zoom, 1), 22),
      pitch: pitch,
      bearing: bearing,
      durationMs: durationMs
    )
  }

  private static func makePolyline(_ coordinates: [CLLocationCoordinate2D]) -> MKPolyline? {
    guard coordinates.count >= 2 else { return nil }
    return coordinates.withUnsafeBufferPointer { buffer -> MKPolyline? in
      guard let baseAddress = buffer.baseAddress else { return nil }
      return MKPolyline(coordinates: baseAddress, count: buffer.count)
    }
  }

}
