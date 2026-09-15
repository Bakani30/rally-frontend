import { NativeEventEmitter, NativeModules, Platform, type NativeModule } from 'react-native'
import { WEAR_PROTOCOL_VERSION, type WearAckStatus, type WearRunState } from './wearProtocol'

type NativeWearCommandEvent = {
  raw?: string
  version?: number
  commandId?: string
  sessionId?: string | null
  type?: string
  sentAt?: number
  payload?: string
}

type RallyWearNativeModule = {
  publishState(state: WearRunState & { version: number; sentAt: number }): Promise<void>
  acknowledgeCommand(
    commandId: string,
    commandType: string,
    status: WearAckStatus,
    message?: string | null,
  ): Promise<void>
}

const nativeModule = NativeModules.RallyWear as RallyWearNativeModule | undefined
const emitter = nativeModule ? new NativeEventEmitter(nativeModule as unknown as NativeModule) : null
let bridgeDisabled = false
let unavailableWarningShown = false

export function isWearBridgeAvailable(): boolean {
  return Platform.OS === 'android' && Boolean(nativeModule) && !bridgeDisabled
}

export function subscribeWearCommands(
  listener: (event: NativeWearCommandEvent) => void,
): () => void {
  if (!emitter) return () => {}
  const subscription = emitter.addListener('RallyWearCommand', listener)
  return () => subscription.remove()
}

export async function publishWearRunState(state: WearRunState): Promise<void> {
  if (!isWearBridgeAvailable() || !nativeModule) return
  try {
    await nativeModule.publishState({
      ...state,
      version: WEAR_PROTOCOL_VERSION,
      sentAt: Date.now(),
    })
  } catch (err) {
    handleWearBridgeFailure(err)
  }
}

export async function acknowledgeWearCommand(
  commandId: string,
  commandType: string,
  status: WearAckStatus,
  message?: string | null,
): Promise<void> {
  if (!isWearBridgeAvailable() || !nativeModule) return
  try {
    await nativeModule.acknowledgeCommand(commandId, commandType, status, message ?? null)
  } catch (err) {
    handleWearBridgeFailure(err)
  }
}

function handleWearBridgeFailure(err: unknown): void {
  if (isWearApiUnavailable(err)) {
    bridgeDisabled = true
    if (!unavailableWarningShown) {
      unavailableWarningShown = true
      console.warn('[wear] Wear OS bridge is unavailable on this device; companion sync disabled.')
    }
    return
  }

  console.warn('[wear] Wear OS bridge call failed', err)
}

function isWearApiUnavailable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  return (
    message.includes('Wearable.API is not available') ||
    message.includes('API_UNAVAILABLE') ||
    message.includes('ApiException: 17')
  )
}
