export type SocialAuthOptions = {
  apple: boolean
  google: boolean
  any: boolean
}

/**
 * Decides which social sign-in buttons the auth screen should render.
 * Apple uses native Sign in with Apple (iOS only); Google uses web OAuth gated
 * by an env flag.
 */
export function resolveSocialAuthOptions(input: {
  platform: string
  googleEnabled: boolean
}): SocialAuthOptions {
  const apple = input.platform === 'ios'
  const google = input.googleEnabled
  return { apple, google, any: apple || google }
}
