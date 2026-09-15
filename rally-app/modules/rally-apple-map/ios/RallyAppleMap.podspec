Pod::Spec.new do |s|
  s.name            = 'RallyAppleMap'
  s.version         = '1.0.0'
  s.summary         = 'Native Apple MapKit views for Rally.'
  s.description     = 'iOS-only MapKit views used by Rally Run Replay and Arena Map.'
  s.author          = 'Rally'
  s.homepage        = 'https://github.com/Bakani30/rally'
  s.platforms       = { :ios => '15.6' }
  s.source          = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MapKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
