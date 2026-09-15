/**
 * Battery state subscription wrapper. Service uses level + charging signal to
 * pick the tracker mode (power_save override). Detached from React so the
 * service can subscribe directly without going through a hook.
 *
 * expo-battery requires a native rebuild to be available. We lazy-load it via
 * require() so that the module never throws at import time — the app boots
 * normally and run tracking degrades gracefully (tracker defaults to the
 * non-low-battery mode) until the binary is rebuilt with EAS.
 */

export type BatterySnapshot = {
  /** [0,1]; null if the device hasn't reported yet. */
  level: number | null
  isCharging: boolean
}

export type BatteryListener = (snapshot: BatterySnapshot) => void

export interface BatteryPort {
  getSnapshot(): Promise<BatterySnapshot>
  subscribe(listener: BatteryListener): () => void
}

type BatteryModule = typeof import('expo-battery')

// Lazy-load: returns the module if the native binary has it, null otherwise.
function loadBatteryModule(): BatteryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-battery') as BatteryModule
  } catch {
    return null
  }
}

const batteryModule = loadBatteryModule()

/** Full adapter backed by expo-battery when the native module is available. */
class ExpoBatteryAdapter implements BatteryPort {
  constructor(private readonly mod: BatteryModule) {}

  async getSnapshot(): Promise<BatterySnapshot> {
    const [level, batteryState] = await Promise.all([
      this.mod.getBatteryLevelAsync().catch(() => -1),
      this.mod.getBatteryStateAsync().catch(() => this.mod.BatteryState.UNKNOWN),
    ])
    return {
      level: level >= 0 ? level : null,
      isCharging:
        batteryState === this.mod.BatteryState.CHARGING ||
        batteryState === this.mod.BatteryState.FULL,
    }
  }

  subscribe(listener: BatteryListener): () => void {
    let lastLevel: number | null = null
    let lastCharging: boolean | null = null

    const emit = (snapshot: BatterySnapshot) => {
      if (snapshot.level === lastLevel && snapshot.isCharging === lastCharging) return
      lastLevel = snapshot.level
      lastCharging = snapshot.isCharging
      listener(snapshot)
    }

    const levelSub = this.mod.addBatteryLevelListener(({ batteryLevel }) => {
      emit({ level: batteryLevel, isCharging: lastCharging ?? false })
    })
    const stateSub = this.mod.addBatteryStateListener(({ batteryState }) => {
      emit({
        level: lastLevel,
        isCharging:
          batteryState === this.mod.BatteryState.CHARGING ||
          batteryState === this.mod.BatteryState.FULL,
      })
    })

    void this.getSnapshot().then(emit)

    return () => {
      levelSub.remove()
      stateSub.remove()
    }
  }
}

/** No-op adapter used when expo-battery is not compiled into the binary. */
class NullBatteryAdapter implements BatteryPort {
  async getSnapshot(): Promise<BatterySnapshot> {
    return { level: null, isCharging: false }
  }
  subscribe(_listener: BatteryListener): () => void {
    return () => {}
  }
}

export const batteryPort: BatteryPort = batteryModule
  ? new ExpoBatteryAdapter(batteryModule)
  : new NullBatteryAdapter()
