import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { updateUserAvatarUrl, uploadAvatarBytes } from './avatarRepository'

const TARGET_SIZE = 256

export type PickedAvatar = { uri: string }

export async function pickAvatarFromLibrary(): Promise<PickedAvatar | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) throw new Error('ต้องอนุญาตเข้าถึงคลังรูปภาพก่อน')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  })
  if (result.canceled) return null
  return { uri: result.assets[0].uri }
}

async function compressToJpegBase64(uri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: TARGET_SIZE, height: TARGET_SIZE } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  )
  if (!out.base64) throw new Error('ไม่สามารถอ่านไฟล์รูปได้')
  return out.base64
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function uploadAvatar(userId: string, sourceUri: string): Promise<string> {
  const base64 = await compressToJpegBase64(sourceUri)
  const bytes = base64ToUint8Array(base64)
  const url = await uploadAvatarBytes({
    userId,
    bytes,
    contentType: 'image/jpeg',
    ext: 'jpg',
  })
  await updateUserAvatarUrl(userId, url)
  return url
}
