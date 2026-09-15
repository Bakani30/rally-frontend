import ExpoModulesCore

public final class RallyAppleMapModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RallyAppleMap")

    View(RallyAppleReplayMapView.self) {
      Events("onMapUnavailable", "onMapReady", "onWarmupProgress", "onMarkerPress")

      Prop("fullCoordinatesJson") { (view: RallyAppleReplayMapView, value: String) in
        view.fullCoordinatesJson = value
      }

      Prop("companionsJson") { (view: RallyAppleReplayMapView, value: String) in
        view.companionsJson = value
      }

      Prop("revealedProgress") { (view: RallyAppleReplayMapView, value: Double) in
        view.revealedProgress = value
      }

      Prop("markerJson") { (view: RallyAppleReplayMapView, value: String) in
        view.markerJson = value
      }

      Prop("markerAvatarUrl") { (view: RallyAppleReplayMapView, value: String) in
        view.markerAvatarUrl = value
      }

      Prop("markerEmoji") { (view: RallyAppleReplayMapView, value: String) in
        view.markerEmoji = value
      }

      Prop("markerInitials") { (view: RallyAppleReplayMapView, value: String) in
        view.markerInitials = value
      }

      Prop("cameraJson") { (view: RallyAppleReplayMapView, value: String) in
        view.cameraJson = value
      }

      Prop("followBearing") { (view: RallyAppleReplayMapView, value: Bool) in
        view.followBearing = value
      }
    }
  }
}
