import * as Linking from 'expo-linking'

/**
 * Opens this app's entry inside the OS Settings app.
 *
 * This is the only way to recover a permission the user has permanently denied:
 * iOS never re-shows the system permission dialog after the first prompt, and
 * Android stops prompting once the user picks "Don't ask again". Re-calling the
 * `request*PermissionsAsync` APIs in those states resolves silently with the
 * existing status, so the UI must route the user here instead.
 *
 * Reusable across every permission surface (location, notifications, camera,
 * media, health) — keep it permission-agnostic.
 */
export async function openAppSettings(): Promise<void> {
  await Linking.openSettings()
}
