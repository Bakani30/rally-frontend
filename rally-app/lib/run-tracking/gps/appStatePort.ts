import { AppState, type AppStateStatus } from 'react-native'
import type { AppLifecycleState } from './gpsAccuracyMode'

/**
 * AppState wrapper that maps RN's status strings to our internal
 * `AppLifecycleState`. Detached from React so the service can subscribe
 * directly without going through a hook.
 */

export type AppLifecycleListener = (state: AppLifecycleState) => void

export interface AppStatePort {
  current(): AppLifecycleState
  subscribe(listener: AppLifecycleListener): () => void
}

function fromRn(status: AppStateStatus): AppLifecycleState {
  if (status === 'active') return 'active'
  if (status === 'background') return 'background'
  if (status === 'inactive') return 'inactive'
  return 'unknown'
}

class RnAppStateAdapter implements AppStatePort {
  current(): AppLifecycleState {
    return fromRn(AppState.currentState)
  }

  subscribe(listener: AppLifecycleListener): () => void {
    const sub = AppState.addEventListener('change', (status) => {
      listener(fromRn(status))
    })
    return () => sub.remove()
  }
}

export const appStatePort: AppStatePort = new RnAppStateAdapter()
