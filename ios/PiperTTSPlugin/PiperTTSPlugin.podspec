Pod::Spec.new do |s|
  s.name = 'PiperTTSPlugin'
  s.version = '1.0.0'
  s.summary = 'Piper TTS Plugin for Capacitor'
  s.license = 'MIT'
  s.homepage = 'https://github.com/roadlearn/piper-tts-plugin'
  s.author = 'RoadLearn'
  s.source = { :git => 'https://github.com/roadlearn/piper-tts-plugin.git', :tag => s.version.to_s }
  s.source_files = 'Sources/**/*.{swift,h,m}'
  s.ios.deployment_target  = '14.0'
  s.dependency 'Capacitor'
  # s.dependency 'onnxruntime-c', '~> 1.16.0'
  s.swift_version = '5.0'
end
