export type DevicePlatform = 'ios' | 'android' | 'web'

export type DeviceRegistrationError =
  | { kind: 'simulator' }
  | { kind: 'unsupported_platform' }
  | { kind: 'fingerprint_unavailable' }
  | { kind: 'register_failed'; message: string; code?: string }

export type DeviceRegistrationResult =
  | { ok: true; deviceId: string }
  | { ok: false; error: DeviceRegistrationError }
