import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveUserByHandle } from './userLookupService'

const mocks = vi.hoisted(() => ({ searchUsersByQuery: vi.fn() }))

vi.mock('./userSearchRepository', () => ({ searchUsersByQuery: mocks.searchUsersByQuery }))

describe('resolveUserByHandle', () => {
  beforeEach(() => {
    mocks.searchUsersByQuery.mockReset()
  })

  it('uses the authenticated search API and requires an exact normalized handle', async () => {
    mocks.searchUsersByQuery.mockResolvedValue([
      { id: 'other-user', handle: 'gunner_two', display_name: 'Gunner Two', frame_asset_ref: null },
      { id: 'target-user', handle: 'gunner', display_name: 'Gunner', frame_asset_ref: null },
    ])

    await expect(resolveUserByHandle('@GUNNER')).resolves.toEqual({
      id: 'target-user',
      handle: 'gunner',
      display_name: 'Gunner',
    })
    expect(mocks.searchUsersByQuery).toHaveBeenCalledWith('gunner', 20)
  })

  it('does not treat a prefix search result as the requested user', async () => {
    mocks.searchUsersByQuery.mockResolvedValue([
      { id: 'other-user', handle: 'gunner_two', display_name: 'Gunner Two', frame_asset_ref: null },
    ])

    await expect(resolveUserByHandle('gunner')).rejects.toThrow('No Rally user: @gunner')
  })
})
