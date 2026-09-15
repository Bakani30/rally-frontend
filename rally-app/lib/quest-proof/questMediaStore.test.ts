import { beforeEach, describe, expect, it, vi } from 'vitest'

const files = new Map<string, { exists: boolean }>()

vi.mock('expo-file-system', () => {
  class MockFile {
    uri: string
    constructor(uriOrDirectory: string | { uri: string }, name?: string) {
      this.uri = typeof uriOrDirectory === 'string'
        ? uriOrDirectory
        : `${uriOrDirectory.uri}/${name}`
      files.set(this.uri, files.get(this.uri) ?? { exists: false })
    }
    get exists() { return files.get(this.uri)?.exists ?? false }
    delete() { files.set(this.uri, { exists: false }) }
    copy(target: MockFile) { files.set(target.uri, { exists: true }) }
  }
  class MockDirectory {
    uri: string
    constructor(parent: { uri: string }, name: string) { this.uri = `${parent.uri}/${name}` }
    create() {}
  }
  return { File: MockFile, Directory: MockDirectory, Paths: { document: { uri: 'file:///document' } } }
})

import { persistQuestMedia } from './questMediaStore'

describe('persistQuestMedia', () => {
  beforeEach(() => files.clear())

  it('copies a captured file into durable app storage using the session id', () => {
    files.set('file:///cache/raw.mp4', { exists: true })
    expect(persistQuestMedia('file:///cache/raw.mp4', 'session-1', 'mp4'))
      .toBe('file:///document/quest-proof-media/session-1.mp4')
    expect(files.get('file:///document/quest-proof-media/session-1.mp4')?.exists).toBe(true)
  })

  it('does not rewrite non-file URIs that the native file API cannot own', () => {
    expect(persistQuestMedia('content://capture/1', 'session-1', 'mp4')).toBe('content://capture/1')
  })
})
