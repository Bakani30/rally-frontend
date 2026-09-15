export type CoachSaveLifecycleCallbacks<TInput> = {
  onSaveStarted?: (input: TInput) => void
  onSaved?: (summary: string, input: TInput) => void
  onSaveFailed?: (input: TInput, error: unknown) => void
}

export function createCoachSaveLifecycle<TInput>(
  callbacks: CoachSaveLifecycleCallbacks<TInput>,
) {
  return {
    start(input: TInput) {
      callbacks.onSaveStarted?.(input)
    },
    succeed(summary: string, input: TInput) {
      callbacks.onSaved?.(summary, input)
    },
    fail(input: TInput, error: unknown) {
      callbacks.onSaveFailed?.(input, error)
    },
  }
}
