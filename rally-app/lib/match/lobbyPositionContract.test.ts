import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Contract test guarding the lobby position keys against client↔server drift.
//
// The keys live in TWO runtimes that can't share a module: the client
// (basketballLobbyCourt.ts, Metro/React Native) and the edge function
// (supabase/functions/update-lobby-position/service.ts, Deno). They have
// drifted before — the server sat on `guard/wing/big` while the client sent
// `pg/sf/c`, so every 3v3 move was rejected. Both sides are scanned from source
// (importing the RN module here would pull native deps into Vitest) and pinned
// to one canonical map, so a change to either that isn't mirrored fails CI.
//
// To change a position key: update basketballLobbyCourt.ts, the edge function
// service.ts, AND this CANONICAL map together.
const CANONICAL: Record<'basketball' | 'badminton', Record<number, string[]>> = {
  basketball: {
    1: ['duel'],
    3: ['c', 'pg', 'sf'],
    5: ['c', 'pf', 'pg', 'sf', 'sg'],
  },
  badminton: {
    1: ['duel'],
    2: ['left', 'right'],
  },
}

const HERE = dirname(fileURLToPath(import.meta.url))
const readSource = (relativePath: string): string => readFileSync(resolve(HERE, relativePath), 'utf8')

// Client keys: each `const <NAME>: PositionDefinition[] = [ ... ]` array, read
// off the `key: '...'` field of every entry.
function clientKeys(constName: string): string[] {
  const source = readSource('./basketballLobbyCourt.ts')
  const block = source.match(new RegExp(`const ${constName}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`))
  if (!block) throw new Error(`Could not find ${constName} in basketballLobbyCourt.ts`)
  return [...block[1].matchAll(/key:\s*'([^']+)'/g)].map((match) => match[1]).sort()
}

// Server keys: each `const <NAME>_KEYS = new Set([ ... ])` literal.
function serverKeys(constName: string): string[] {
  const source = readSource('../../../supabase/functions/update-lobby-position/service.ts')
  const match = source.match(new RegExp(`${constName}\\s*=\\s*new Set\\(\\[([^\\]]*)\\]\\)`))
  if (!match) throw new Error(`Could not find ${constName} in update-lobby-position/service.ts`)
  return match[1]
    .split(',')
    .map((token) => token.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort()
}

describe('lobby position key contract (client basketballLobbyCourt ↔ edge update-lobby-position)', () => {
  it('client position arrays match the canonical key sets', () => {
    expect(clientKeys('ONE_V_ONE_POSITIONS')).toEqual([...CANONICAL.basketball[1]].sort())
    expect(clientKeys('THREE_V_THREE_POSITIONS')).toEqual([...CANONICAL.basketball[3]].sort())
    expect(clientKeys('FIVE_V_FIVE_POSITIONS')).toEqual([...CANONICAL.basketball[5]].sort())
    expect(clientKeys('BADMINTON_ONE_V_ONE_POSITIONS')).toEqual([...CANONICAL.badminton[1]].sort())
    expect(clientKeys('BADMINTON_TWO_V_TWO_POSITIONS')).toEqual([...CANONICAL.badminton[2]].sort())
  })

  it('edge function Set literals match the canonical key sets', () => {
    // ONE_V_ONE_KEYS backs basketball 1v1 and badminton 1v1 on the server.
    expect(serverKeys('ONE_V_ONE_KEYS')).toEqual([...CANONICAL.basketball[1]].sort())
    expect(serverKeys('THREE_V_THREE_KEYS')).toEqual([...CANONICAL.basketball[3]].sort())
    expect(serverKeys('FIVE_V_FIVE_KEYS')).toEqual([...CANONICAL.basketball[5]].sort())
    expect(serverKeys('BADMINTON_TWO_V_TWO_KEYS')).toEqual([...CANONICAL.badminton[2]].sort())
  })
})
