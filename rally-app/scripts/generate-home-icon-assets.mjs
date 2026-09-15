#!/usr/bin/env node

import { Buffer } from 'node:buffer'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { chromium } from 'playwright'

const appRoot = resolve(import.meta.dirname, '..')
const sourceDir = resolve(appRoot, 'assets', 'icons', 'home')
const generatedDir = resolve(sourceDir, 'generated')
const assetMapPath = resolve(appRoot, 'components', 'home', 'homeIconAssets.generated.ts')
const targetSizePx = 256

function toRequireKey(fileName) {
  return fileName.replace(/\.svg$/, '')
}

function renderAssetMap(iconNames) {
  const entries = iconNames
    .map((name) => `  '${name}': require('../../assets/icons/home/generated/${name}.png'),`)
    .join('\n')

  return `import type { ImageSourcePropType } from 'react-native'\n\nexport const HOME_ICON_ASSETS = {\n${entries}\n} as const satisfies Record<string, ImageSourcePropType>\n\nexport type GeneratedHomeIconName = keyof typeof HOME_ICON_ASSETS\n`
}

async function main() {
  const sourceFiles = (await readdir(sourceDir))
    .filter((name) => name.endsWith('.svg'))
    .sort()

  if (sourceFiles.length === 0) {
    throw new Error(`No SVG icons found in ${sourceDir}`)
  }

  await mkdir(generatedDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { width: targetSizePx, height: targetSizePx },
    })

    for (const fileName of sourceFiles) {
      const iconName = toRequireKey(fileName)
      const svg = await readFile(resolve(sourceDir, fileName), 'utf8')
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

      await page.setContent(`
        <!doctype html>
        <html>
          <head>
            <style>
              html, body {
                margin: 0;
                width: ${targetSizePx}px;
                height: ${targetSizePx}px;
                overflow: hidden;
                background: transparent;
              }
              img {
                width: ${targetSizePx}px;
                height: ${targetSizePx}px;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <img alt="${iconName}" src="${dataUri}" />
          </body>
        </html>
      `)
      await page.locator('img').waitFor({ state: 'visible' })
      await page.screenshot({
        omitBackground: true,
        path: resolve(generatedDir, `${iconName}.png`),
      })
    }
  } finally {
    await browser.close()
  }

  await writeFile(
    assetMapPath,
    renderAssetMap(sourceFiles.map(toRequireKey)),
    'utf8',
  )

  console.log(`Generated ${sourceFiles.length} home icon PNG assets.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
