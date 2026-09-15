import type { FunctionInvokeOptions } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { EdgeFunctionError } from './edgeError'

function createUnauthorizedError(cause?: unknown) {
  return new EdgeFunctionError('กรุณาเข้าสู่ระบบใหม่ก่อนทำรายการนี้', {
    code: 'unauthorized',
    status: 401,
    cause,
  })
}

export async function requireAuthenticatedAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw createUnauthorizedError()
  }

  return accessToken
}

export async function invokeAuthenticatedFunction<T = unknown>(
  functionName: string,
  options: FunctionInvokeOptions = {},
) {
  const accessToken = await requireAuthenticatedAccessToken()

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  })
}
