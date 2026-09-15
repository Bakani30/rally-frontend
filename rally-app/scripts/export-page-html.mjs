#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'

export const DEFAULT_ROUTES = [
  '/',
  '/leaderboard',
  '/redeem',
  '/profile',
  '/matches',
  '/match/new',
  '/wallet',
  '/notifications',
  '/settings',
  '/challenges',
]

const DEFAULT_BASE_URL = 'http://localhost:8081'
const DEFAULT_VIEWPORT = { width: 393, height: 852 }
const AUTH_STATE_PATH = path.join('dist', 'page-html', '.auth', 'storage-state.json')
const DEFAULT_OUT_DIR = path.join('dist', 'page-html', 'latest')
const DEFAULT_STATIC_EXPORT_DIR = path.join('dist', 'page-html', '.static-export')
const STATIC_INDEX_ROUTE_PATHS = new Map([
  ['/challenges', path.join('challenges', 'index.html')],
  ['/gifts', path.join('gifts', 'index.html')],
])

export function parseArgs(argv) {
  const options = {
    freshAuth: false,
    offline: false,
    baseUrl: null,
    outDir: path.resolve(process.cwd(), DEFAULT_OUT_DIR),
    staticExportDir: path.resolve(process.cwd(), DEFAULT_STATIC_EXPORT_DIR),
    routes: [...DEFAULT_ROUTES],
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--fresh-auth') {
      options.freshAuth = true
    } else if (arg === '--offline') {
      options.offline = true
    } else if (arg === '--base-url') {
      options.baseUrl = requireValue(argv, i, arg)
      i += 1
    } else if (arg === '--out') {
      options.outDir = path.resolve(process.cwd(), requireValue(argv, i, arg))
      i += 1
    } else if (arg === '--routes') {
      options.routes = parseRoutes(requireValue(argv, i, arg))
      i += 1
    } else if (arg === '--static-export-dir') {
      options.staticExportDir = path.resolve(process.cwd(), requireValue(argv, i, arg))
      i += 1
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  if (options.offline && options.baseUrl) {
    throw new Error('--offline cannot be combined with --base-url')
  }
  if (options.offline && options.freshAuth) {
    throw new Error('--offline cannot be combined with --fresh-auth')
  }

  return options
}

function requireValue(argv, index, flag) {
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

function parseRoutes(value) {
  const routes = value
    .split(',')
    .map((route) => normalizeRoute(route))
    .filter(Boolean)
  if (routes.length === 0) throw new Error('--routes must include at least one route')
  return routes
}

function normalizeRoute(route) {
  const trimmed = route.trim()
  if (!trimmed) return ''
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withSlash === '//' ? '/' : withSlash
}

export function routeToSlug(route) {
  const pathname = normalizeRoute(route).split(/[?#]/)[0]
  const clean = pathname.replace(/^\/+|\/+$/g, '')
  if (!clean) return 'home'
  return clean
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

export function staticRouteHtmlPath(exportDir, route) {
  const normalized = normalizeRoute(route).split(/[?#]/)[0]
  if (normalized === '/') return path.join(exportDir, 'index.html')
  const mapped = STATIC_INDEX_ROUTE_PATHS.get(normalized)
  if (mapped) return path.join(exportDir, mapped)
  return path.join(exportDir, `${normalized.replace(/^\/+/, '')}.html`)
}

export function sanitizeHtmlSnapshot(html, { capturedAt, route, sourceUrl }) {
  const withoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  const comment = [
    '<!--',
    'Rally static page snapshot.',
    `Route: ${route}`,
    `Captured at ${capturedAt}`,
    `Captured from ${sourceUrl}`,
    'Scripts are stripped intentionally; use screenshot.png as the visual reference.',
    '-->',
  ].join('\n')

  if (/<!doctype html>/i.test(withoutScripts)) {
    return withoutScripts.replace(/<!doctype html>/i, `<!DOCTYPE html>\n${comment}`)
  }
  return `${comment}\n${withoutScripts}`
}

export function assertNoObviousSecrets(html, route) {
  const checks = [
    { label: 'access_token', pattern: /access_token/i },
    { label: 'refresh_token', pattern: /refresh_token/i },
    { label: 'Supabase auth storage key', pattern: /sb-[a-z0-9-]+-auth-token/i },
    { label: 'JWT-like token', pattern: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  ]

  for (const check of checks) {
    if (check.pattern.test(html)) {
      throw new Error(`Refusing to write ${route}: snapshot contains ${check.label}`)
    }
  }
}

export function buildGalleryHtml({ capturedAt, viewport, routes }) {
  const cards = routes.map((entry) => `
    <article class="card">
      <a href="${escapeAttr(entry.standaloneFile ?? entry.htmlFile)}">
        <img src="${escapeAttr(entry.screenshotFile)}" alt="${escapeAttr(entry.route)} screenshot" loading="lazy">
      </a>
      <div class="meta">
        <h2>${escapeHtml(entry.title || entry.route)}</h2>
        <p><code>${escapeHtml(entry.route)}</code></p>
        <p>
          ${entry.standaloneFile ? `<a href="${escapeAttr(entry.standaloneFile)}">Share HTML</a> · ` : ''}
          <a href="${escapeAttr(entry.htmlFile)}">Open DOM</a> · <a href="${escapeAttr(entry.screenshotFile)}">Open PNG</a>
        </p>
      </div>
    </article>
  `).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rally Page HTML Export</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #101010; color: #f7f7f7; }
    header { padding: 32px clamp(20px, 4vw, 56px) 20px; }
    h1 { margin: 0; font-size: 32px; letter-spacing: 0; }
    header p { margin: 8px 0 0; color: rgba(255,255,255,0.68); }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; padding: 20px clamp(20px, 4vw, 56px) 56px; }
    .card { overflow: hidden; border: 1px solid rgba(255,255,255,0.16); border-radius: 8px; background: #181818; }
    .card img { display: block; width: 100%; aspect-ratio: ${viewport.width} / ${viewport.height}; object-fit: cover; object-position: top center; background: #000; }
    .meta { padding: 14px; }
    h2 { margin: 0; font-size: 16px; }
    p { margin: 6px 0 0; }
    code { color: #eac31a; }
    a { color: #eb773c; }
  </style>
</head>
<body>
  <header>
    <h1>Rally Page HTML Export</h1>
    <p>Captured at ${escapeHtml(capturedAt)} · viewport ${viewport.width}x${viewport.height}</p>
  </header>
  <main>
${cards}
  </main>
</body>
</html>
`
}

export function buildStandalonePageHtml({
  route,
  title,
  capturedAt,
  viewport,
  imageDataUri,
}) {
  const safeTitle = title || route
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rally Share Page - ${escapeHtml(safeTitle)}</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #101010; color: #f7f7f7; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
    .frame { width: min(100%, ${viewport.width}px); }
    img { display: block; width: 100%; height: auto; border-radius: 8px; background: #000; box-shadow: 0 18px 60px rgba(0,0,0,0.38); }
    header { margin-bottom: 14px; }
    h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
    p { margin: 5px 0 0; color: rgba(255,255,255,0.68); font-size: 12px; }
    code { color: #eac31a; }
  </style>
</head>
<body>
  <main>
    <section class="frame">
      <header>
        <h1>Rally Share Page</h1>
        <p><code>${escapeHtml(route)}</code> · captured ${escapeHtml(capturedAt)} · ${viewport.width}x${viewport.height}</p>
      </header>
      <img src="${escapeAttr(imageDataUri)}" alt="${escapeAttr(route)}">
    </section>
  </main>
</body>
</html>
`
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

async function runCli(argv) {
  const options = parseArgs(argv)
  if (options.help) {
    printHelp()
    return
  }

  const { chromium } = await loadPlaywright()

  if (options.offline) {
    await prepareStaticExport(options.staticExportDir)
    await exportPages({
      chromium,
      outDir: options.outDir,
      routes: options.routes,
      freshAuth: false,
      viewport: DEFAULT_VIEWPORT,
      authStatePath: null,
      source: {
        mode: 'offline',
        staticExportDir: options.staticExportDir,
      },
    })
    return
  }

  const server = await resolveServer(options.baseUrl)

  try {
    await exportPages({
      chromium,
      baseUrl: server.baseUrl,
      outDir: options.outDir,
      routes: options.routes,
      freshAuth: options.freshAuth,
      viewport: DEFAULT_VIEWPORT,
      authStatePath: path.resolve(process.cwd(), AUTH_STATE_PATH),
      source: {
        mode: 'server',
        baseUrl: server.baseUrl,
      },
    })
  } finally {
    await server.stop()
  }
}

async function prepareStaticExport(staticExportDir) {
  console.log(`Creating static Expo web export at ${staticExportDir}`)
  await fs.rm(staticExportDir, { recursive: true, force: true })
  await fs.mkdir(path.dirname(staticExportDir), { recursive: true })
  await runCommand(npxCommand(), [
    'expo',
    'export',
    '--platform',
    'web',
    '--output-dir',
    staticExportDir,
  ])
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: '1',
      },
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed (code=${code}, signal=${signal})`))
    })
  })
}

async function loadPlaywright() {
  try {
    return await import('@playwright/test')
  } catch (error) {
    throw new Error(
      `@playwright/test is required. Install dependencies with npm install.\n${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function resolveServer(baseUrlOption) {
  if (baseUrlOption) {
    return { baseUrl: normalizeBaseUrl(baseUrlOption), stop: async () => undefined }
  }

  const baseUrl = DEFAULT_BASE_URL
  if (await isUrlReady(baseUrl, 1000)) {
    console.log(`Using existing Expo web server at ${baseUrl}`)
    return { baseUrl, stop: async () => undefined }
  }

  console.log(`Starting Expo web server at ${baseUrl}`)
  const child = spawn(npxCommand(), ['expo', 'start', '--web', '--localhost'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BROWSER: 'none',
      EXPO_NO_TELEMETRY: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr.on('data', (chunk) => process.stderr.write(chunk))

  try {
    await waitForUrl(baseUrl, 120_000, child)
  } catch (error) {
    stopProcess(child)
    throw error
  }

  return {
    baseUrl,
    stop: async () => stopProcess(child),
  }
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '')
}

async function isUrlReady(url, timeoutMs) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    return response.status < 500
  } catch {
    return false
  }
}

async function waitForUrl(url, timeoutMs, child) {
  const startedAt = Date.now()
  let childExit = null
  child.once('exit', (code, signal) => {
    childExit = { code, signal }
  })

  while (Date.now() - startedAt < timeoutMs) {
    if (childExit) {
      throw new Error(`Expo web server exited before becoming ready (code=${childExit.code}, signal=${childExit.signal})`)
    }
    if (await isUrlReady(url, 1500)) return
    await sleep(1000)
  }

  throw new Error(`Timed out waiting for Expo web server at ${url}`)
}

function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }, 3000).unref()
}

async function exportPages({
  chromium,
  outDir,
  routes,
  freshAuth,
  viewport,
  authStatePath,
  source,
}) {
  if (authStatePath) {
    await fs.mkdir(path.dirname(authStatePath), { recursive: true })
  }

  if (authStatePath && (freshAuth || !existsSync(authStatePath))) {
    await captureManualAuth({
      chromium,
      baseUrl: source.baseUrl,
      authStatePath,
      viewport,
    })
  }

  await fs.rm(outDir, { recursive: true, force: true })
  await fs.mkdir(outDir, { recursive: true })

  const capturedAt = new Date().toISOString()
  const browser = await launchChromium(chromium, { headless: true })
  const contextOptions = {
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  }
  if (authStatePath) contextOptions.storageState = authStatePath
  const context = await browser.newContext(contextOptions)

  const page = await context.newPage()
  const manifestRoutes = []

  try {
    for (const route of routes) {
      const entry = await captureRoute({ page, source, outDir, route, capturedAt, viewport })
      manifestRoutes.push(entry)
      console.log(`Captured ${route} -> ${entry.slug}`)
    }
  } finally {
    await context.close()
    await browser.close()
  }

  const manifest = {
    capturedAt,
    source: source.mode === 'offline'
      ? { mode: source.mode, staticExportDir: source.staticExportDir }
      : { mode: source.mode, baseUrl: source.baseUrl },
    viewport,
    routes: manifestRoutes,
  }
  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await fs.writeFile(path.join(outDir, 'index.html'), buildGalleryHtml({
    capturedAt,
    viewport,
    routes: manifestRoutes.map((entry) => ({
      route: entry.route,
      slug: entry.slug,
      url: entry.url,
      title: entry.title,
      htmlFile: `${entry.slug}/index.html`,
      screenshotFile: `${entry.slug}/screenshot.png`,
      standaloneFile: `share/${entry.slug}.html`,
    })),
  }))

  console.log(`Page export complete: ${outDir}`)
  console.log(`Shareable standalone HTML files: ${path.join(outDir, 'share')}`)
}

async function captureManualAuth({ chromium, baseUrl, authStatePath, viewport }) {
  if (!process.stdin.isTTY) {
    throw new Error(
      `Manual auth requires an interactive terminal. Re-run with --fresh-auth locally, or provide ${authStatePath}.`,
    )
  }

  console.log('Opening Chromium for manual Rally login.')
  const browser = await launchChromium(chromium, { headless: false })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    console.log('Sign in in the browser window. Return here after the app shows an authenticated Rally page.')

    const rl = createInterface({ input: process.stdin, output: process.stdout })
    try {
      await rl.question('Press Enter after login is complete...')
    } finally {
      rl.close()
    }
    if (isAuthPage(page.url())) {
      throw new Error('The browser is still on the sign-in page. Complete login before saving auth state.')
    }
    await context.storageState({ path: authStatePath })
  } finally {
    await context.close()
    await browser.close()
  }

  console.log(`Saved Playwright auth state to ${authStatePath}`)
}

async function captureRoute({ page, source, outDir, route, capturedAt, viewport }) {
  const slug = routeToSlug(route)
  const routeDir = path.join(outDir, slug)
  const url = source.mode === 'offline'
    ? pathToFileURL(await findStaticRouteHtmlPath(source.staticExportDir, route)).href
    : routeUrl(source.baseUrl, route)
  await fs.mkdir(routeDir, { recursive: true })

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await waitForPageReady(page)

  if (isAuthPage(page.url()) && !isAuthPage(url)) {
    throw new Error(`Route ${route} redirected to auth. Refresh auth state with --fresh-auth.`)
  }

  const title = await page.title()
  const rawHtml = await page.content()
  const html = sanitizeHtmlSnapshot(rawHtml, {
    capturedAt,
    route,
    sourceUrl: page.url(),
  })
  assertNoObviousSecrets(html, route)

  const htmlPath = path.join(routeDir, 'index.html')
  const screenshotPath = path.join(routeDir, 'screenshot.png')
  const standalonePath = path.join(outDir, 'share', `${slug}.html`)
  await fs.writeFile(htmlPath, html)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await fs.mkdir(path.dirname(standalonePath), { recursive: true })
  await fs.writeFile(standalonePath, buildStandalonePageHtml({
    route,
    title: title || route,
    capturedAt,
    viewport,
    imageDataUri: await pngDataUri(screenshotPath),
  }))

  const entry = {
    route,
    slug,
    url: page.url(),
    title: title || route,
    viewport,
    htmlFile: `${slug}/index.html`,
    screenshotFile: `${slug}/screenshot.png`,
    standaloneFile: `share/${slug}.html`,
    capturedAt,
  }
  await fs.writeFile(path.join(routeDir, 'manifest.json'), `${JSON.stringify(entry, null, 2)}\n`)
  return entry
}

async function pngDataUri(filePath) {
  const png = await fs.readFile(filePath)
  return `data:image/png;base64,${png.toString('base64')}`
}

function routeUrl(baseUrl, route) {
  const url = new URL(normalizeRoute(route), `${normalizeBaseUrl(baseUrl)}/`)
  return url.toString()
}

async function findStaticRouteHtmlPath(staticExportDir, route) {
  const normalized = normalizeRoute(route).split(/[?#]/)[0]
  const candidates = Array.from(new Set([
    staticRouteHtmlPath(staticExportDir, route),
    normalized === '/'
      ? path.join(staticExportDir, 'index.html')
      : path.join(staticExportDir, `${normalized.replace(/^\/+/, '')}.html`),
    normalized === '/'
      ? path.join(staticExportDir, 'index.html')
      : path.join(staticExportDir, normalized.replace(/^\/+/, ''), 'index.html'),
  ]))

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error(
    `Static export HTML not found for ${route}. Checked: ${candidates.join(', ')}`,
  )
}

async function waitForPageReady(page) {
  await page.waitForFunction(
    () => document.body && document.body.innerText.trim().length > 0,
    null,
    { timeout: 30_000 },
  ).catch(() => undefined)
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)
  await page.waitForTimeout(1000)
}

function isAuthPage(url) {
  try {
    return new URL(url).pathname.includes('sign-in')
  } catch {
    return false
  }
}

async function launchChromium(chromium, options) {
  try {
    return await chromium.launch(options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Executable doesn') || message.includes('browserType.launch')) {
      throw new Error(`Playwright Chromium is not installed. Run: npx playwright install chromium\n${message}`)
    }
    throw error
  }
}

function printHelp() {
  console.log(`Usage: npm run export:page-html -- [options]

Options:
  --offline             Capture from Expo static export files. Does not start Expo dev server or use auth.
  --fresh-auth          Open headed Chromium for manual login and refresh saved auth state.
  --base-url <url>      Use an existing Expo web server instead of starting http://localhost:8081.
  --out <dir>           Output directory. Default: ${DEFAULT_OUT_DIR}
  --routes <routes>     Comma-separated routes. Default: ${DEFAULT_ROUTES.join(',')}
  --static-export-dir <dir>
                        Offline mode static export directory. Default: ${DEFAULT_STATIC_EXPORT_DIR}
  -h, --help            Show this help.
`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
