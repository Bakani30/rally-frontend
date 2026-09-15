import { z } from 'zod'

export * from './analytics.js'
export * from './arena-map.js'
export * from './campaigns.js'

export type ApiSuccess<T> = T

export const apiFailureSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
})

export type ApiFailure = z.infer<typeof apiFailureSchema>
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export const commonApiErrorCodes = [
  'invalid_input',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal_error',
] as const

export type CommonApiErrorCode = (typeof commonApiErrorCodes)[number]

export type ApiAuthMode = 'user_jwt' | 'admin_jwt' | 'server_secret' | 'webhook_secret'
export type ApiSurface = 'mobile' | 'admin' | 'backend' | 'public'

export type EndpointContract<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  name: string
  auth: ApiAuthMode
  surface: ApiSurface
  input: TInput
  output: TOutput
  errors: readonly string[]
  sideEffects: readonly string[]
  callers: readonly string[]
  verification: readonly string[]
}

export function defineEndpointContract<
  const TInput extends z.ZodTypeAny,
  const TOutput extends z.ZodTypeAny,
>(
  contract: EndpointContract<TInput, TOutput>,
): EndpointContract<TInput, TOutput> {
  return contract
}

export const emptyInputSchema = z.object({}).strict()
export const okSchema = z.object({ ok: z.literal(true) })
