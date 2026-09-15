export type ChangeUsernameInput = {
  username: string
}

export type ChangeUsernameResult = {
  username: string
  changesUsed: number
  charged: number
  wasInitial: boolean
}

export type UsernamePrice = 'free' | 500 | 1000 | 2000

export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/
