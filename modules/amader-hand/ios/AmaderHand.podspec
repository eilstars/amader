Pod::Spec.new do |s|
  s.name           = 'AmaderHand'
  s.version        = '1.0.0'
  s.summary        = 'Finds a hand in a photo with Apple Vision, on the phone.'
  s.description    = 'Finds a hand in a photo with Apple Vision, on the phone, so Amader can use it as a ruler.'
  s.author         = 'Amader'
  s.homepage       = 'https://github.com/eilstars/amader'
  s.license        = 'UNLICENSED'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
