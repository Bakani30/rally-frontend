/**
 * Dev-simulator stub for expo-video (see react-native-vision-camera.js in
 * this folder — same reason: the installed dev client predates the native
 * module). Video playback renders nothing with the stub.
 */
function VideoView() {
  return null
}

module.exports = {
  VideoView,
  useVideoPlayer: () => ({
    play: () => {},
    pause: () => {},
    replace: () => {},
    release: () => {},
    loop: false,
    muted: false,
  }),
}
