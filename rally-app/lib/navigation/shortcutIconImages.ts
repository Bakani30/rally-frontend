import type { ImageSourcePropType } from 'react-native'

import type { HomeShortcutKey } from '@/lib/navigation/homeMenu'

// Raster marks rendered as a tinted Image (transparent silhouette → recolored to the tile
// foreground). Lobby uses the Colosseum brand mark per Rally's logo direction.
//
// Kept separate from shortcutIcons.ts (SVG strings) because the static asset require()
// can't be evaluated by the node-based Vitest runner; this module is UI-only.
export const SHORTCUT_ICON_IMAGES: Partial<Record<HomeShortcutKey, ImageSourcePropType>> = {
  lobby: require('../../assets/images/home/lobby-colosseum.png'),
}
