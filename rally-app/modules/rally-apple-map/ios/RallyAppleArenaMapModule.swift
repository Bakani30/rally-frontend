import ExpoModulesCore

public final class RallyAppleArenaMapModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RallyAppleArenaMap")

    View(RallyAppleArenaMapView.self) {
      Events("onPinPress", "onClusterPress", "onRegionChange", "onMapUnavailable")

      Prop("pinsJson") { (view: RallyAppleArenaMapView, value: String) in
        view.pinsJson = value
      }

      Prop("cameraJson") { (view: RallyAppleArenaMapView, value: String) in
        view.cameraJson = value
      }

      Prop("reducedMotion") { (view: RallyAppleArenaMapView, value: Bool) in
        view.reducedMotion = value
      }
    }
  }
}
