/**
 * Dev-simulator stub for react-native-vision-camera.
 *
 * The installed dev client predates the vision-camera native module; importing
 * the real package crashes the bundle at startup ("native Camera Module could
 * not be found"). Metro aliases the package to this stub ONLY when
 * RALLY_SIM_STUB_VISION_CAMERA=1 (see metro.config.js) so the rest of the app
 * can run on the simulator. Camera screens render nothing usable with the
 * stub — do not enable it for device/EAS builds.
 */
const React = require('react')

function CameraStub() {
  return null
}

module.exports = {
  Camera: CameraStub,
  useCameraDevice: () => null,
  useCameraDevices: () => ({}),
  useCameraPermission: () => ({ hasPermission: false, requestPermission: async () => false }),
  useCodeScanner: () => null,
  useFrameProcessor: () => null,
  VisionCameraProxy: {},
}
