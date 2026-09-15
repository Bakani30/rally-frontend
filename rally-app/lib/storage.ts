import * as SecureStore from 'expo-secure-store'

// SecureStore has a 2048-byte limit per key on iOS.
// Values larger than that (e.g. Supabase session tokens) are split into chunks.
const CHUNK_SIZE = 2000

const storage = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}__n`)
    if (countStr === null) return null

    const n = parseInt(countStr, 10)
    const chunks: string[] = []
    for (let i = 0; i < n; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}__${i}`)
      if (chunk === null) return null
      chunks.push(chunk)
    }
    return chunks.join('')
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = []
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE))
    }
    await SecureStore.setItemAsync(`${key}__n`, String(chunks.length))
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}__${i}`, chunks[i])
    }
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}__n`)
    if (countStr !== null) {
      const n = parseInt(countStr, 10)
      for (let i = 0; i < n; i++) {
        await SecureStore.deleteItemAsync(`${key}__${i}`)
      }
      await SecureStore.deleteItemAsync(`${key}__n`)
    }
  },
}

export default storage
