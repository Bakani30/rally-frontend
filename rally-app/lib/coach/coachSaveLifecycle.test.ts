import { describe, expect, it } from 'vitest'
import { createCoachSaveLifecycle } from './coachSaveLifecycle'

type Event =
  | { type: 'started'; input: TestInput }
  | { type: 'saved'; summary: string; input: TestInput }
  | { type: 'failed'; input: TestInput; error: unknown }

type TestInput = {
  role: 'handler'
  basketballStats: { assists: number }
}

const input: TestInput = {
  role: 'handler',
  basketballStats: { assists: 4 },
}

describe('createCoachSaveLifecycle', () => {
  it('treats save start as optimistic-only and does not complete the flow', () => {
    const events: Event[] = []
    const lifecycle = createCoachSaveLifecycle<TestInput>({
      onSaveStarted: (nextInput) => events.push({ type: 'started', input: nextInput }),
      onSaved: (summary, nextInput) => events.push({ type: 'saved', summary, input: nextInput }),
      onSaveFailed: (nextInput, error) => events.push({ type: 'failed', input: nextInput, error }),
    })

    lifecycle.start(input)

    expect(events).toEqual([{ type: 'started', input }])
  })

  it('completes only from the success path', () => {
    const events: Event[] = []
    const lifecycle = createCoachSaveLifecycle<TestInput>({
      onSaveStarted: (nextInput) => events.push({ type: 'started', input: nextInput }),
      onSaved: (summary, nextInput) => events.push({ type: 'saved', summary, input: nextInput }),
      onSaveFailed: (nextInput, error) => events.push({ type: 'failed', input: nextInput, error }),
    })

    lifecycle.start(input)
    lifecycle.succeed('Handler: AST 4', input)

    expect(events).toEqual([
      { type: 'started', input },
      { type: 'saved', summary: 'Handler: AST 4', input },
    ])
  })

  it('rolls back through failure without firing the success callback', () => {
    const error = new Error('network failed')
    const events: Event[] = []
    const lifecycle = createCoachSaveLifecycle<TestInput>({
      onSaveStarted: (nextInput) => events.push({ type: 'started', input: nextInput }),
      onSaved: (summary, nextInput) => events.push({ type: 'saved', summary, input: nextInput }),
      onSaveFailed: (nextInput, nextError) => {
        events.push({ type: 'failed', input: nextInput, error: nextError })
      },
    })

    lifecycle.start(input)
    lifecycle.fail(input, error)

    expect(events).toEqual([
      { type: 'started', input },
      { type: 'failed', input, error },
    ])
  })
})
