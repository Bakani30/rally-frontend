import { FunctionsHttpError } from '@supabase/supabase-js'

/**
 * Typed error thrown when an Edge Function returns the shared failure envelope:
 *   { error: { code, message, details? } }
 *
 * Repository layer should call `extractEdgeFunctionError` and throw the result;
 * UI/hook layer can use `isEdgeFunctionError(err)` to branch on `err.code`.
 */
export class EdgeFunctionError extends Error {
  readonly code?: string
  readonly details?: unknown
  readonly status?: number

  constructor(message: string, opts: { code?: string; details?: unknown; status?: number; cause?: unknown } = {}) {
    super(message)
    this.name = 'EdgeFunctionError'
    this.code = opts.code
    this.details = opts.details
    this.status = opts.status
    if (opts.cause !== undefined) {
      ;(this as { cause?: unknown }).cause = opts.cause
    }
  }
}

export function isEdgeFunctionError(err: unknown): err is EdgeFunctionError {
  return err instanceof EdgeFunctionError
}

type EdgeErrorEnvelope = {
  code?: string
  message?: string
  details?: unknown
}

type FunctionHttpErrorLike = {
  name?: string
  message?: string
  context?: {
    status?: number
    json?: () => Promise<unknown>
    text?: () => Promise<string>
    clone?: () => FunctionHttpErrorLike['context']
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isFunctionHttpErrorLike(error: unknown): error is FunctionHttpErrorLike {
  if (error instanceof FunctionsHttpError) return true
  if (!isRecord(error)) return false
  const context = error.context
  if (!isRecord(context)) return false
  const hasReadableContext = typeof context.json === 'function' || typeof context.text === 'function'
  return hasReadableContext && (
    error.name === 'FunctionsHttpError'
    || String(error.message ?? '').includes('Edge Function returned a non-2xx status code')
  )
}

function parseErrorEnvelope(body: unknown): EdgeErrorEnvelope | null {
  if (!isRecord(body)) return null
  const candidate = isRecord(body.error) ? body.error : body
  const code = typeof candidate.code === 'string' ? candidate.code : undefined
  const message = typeof candidate.message === 'string' ? candidate.message : undefined
  if (!code && !message) return null
  return { code, message, details: candidate.details }
}

function cloneContext(context: NonNullable<FunctionHttpErrorLike['context']>) {
  return typeof context.clone === 'function' ? context.clone() ?? context : context
}

export async function extractEdgeFunctionError(error: unknown, fallback: string): Promise<Error> {
  if (isFunctionHttpErrorLike(error)) {
    const status = error.context?.status
    try {
      const body = await cloneContext(error.context!).json?.()
      const envelope = parseErrorEnvelope(body)
      if (envelope) {
        return new EdgeFunctionError(envelope.message ?? fallback, {
          code: envelope.code,
          details: envelope.details,
          status,
          cause: error,
        })
      }
    } catch {
      try {
        const text = await cloneContext(error.context!).text?.()
        if (text) return new EdgeFunctionError(text, { status, cause: error })
      } catch {}
    }
    return new EdgeFunctionError(error.message || fallback, { status, cause: error })
  }
  if (error instanceof Error) return error
  return new Error(fallback)
}
