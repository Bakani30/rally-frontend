import { extractEdgeFunctionError } from '@/lib/supabase/edgeError'
import { invokeAuthenticatedFunction } from '@/lib/supabase/invokeFunction'

import type { DevicePlatform } from './deviceFingerprintTypes'

type RegisterDeviceParams = {
  fingerprint: string
  platform: DevicePlatform
  appVersion?: string
}

type RegisterDeviceResponse = {
  registered: true
  deviceId: string
}

export async function registerDevice(
  params: RegisterDeviceParams,
): Promise<string> {
  const { data, error } = await invokeAuthenticatedFunction<RegisterDeviceResponse>(
    'register-device',
    {
      body: {
        fingerprint: params.fingerprint,
        platform: params.platform,
        appVersion: params.appVersion,
      },
    },
  )

  if (error) {
    throw await extractEdgeFunctionError(error, 'Failed to register device')
  }
  if (!data?.deviceId) {
    throw new Error('register-device returned no deviceId')
  }
  return data.deviceId
}
