Pod::Spec.new do |s|
  s.name           = 'RallyVideoWatermark'
  s.version        = '1.0.0'
  s.summary        = 'Bakes a static PNG watermark onto a video and trims it via AVFoundation.'
  s.description    = 'First-party AVFoundation video watermark + trim for Rally capture share. No ffmpeg.'
  s.author         = 'Rally'
  s.homepage       = 'https://github.com/Bakani30/rally'
  s.platforms      = { :ios => '15.6' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
