import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_ROUTES,
  assertNoObviousSecrets,
  buildGalleryHtml,
  buildStandalonePageHtml,
  parseArgs,
  routeToSlug,
  staticRouteHtmlPath,
  sanitizeHtmlSnapshot,
} from './export-page-html.mjs'

test('routeToSlug creates stable readable folder names', () => {
  assert.equal(routeToSlug('/'), 'home')
  assert.equal(routeToSlug('/match/new'), 'match-new')
  assert.equal(routeToSlug('notifications'), 'notifications')
  assert.equal(routeToSlug('/challenges?tab=joined'), 'challenges')
})

test('parseArgs resolves defaults and explicit flags', () => {
  const defaults = parseArgs([])
  assert.equal(defaults.freshAuth, false)
  assert.equal(defaults.baseUrl, null)
  assert.deepEqual(defaults.routes, DEFAULT_ROUTES)

  const parsed = parseArgs([
    '--fresh-auth',
    '--base-url',
    'http://localhost:19006',
    '--out',
    '/tmp/rally-pages',
    '--routes',
    '/,/profile,match/new',
  ])

  assert.equal(parsed.freshAuth, true)
  assert.equal(parsed.baseUrl, 'http://localhost:19006')
  assert.equal(parsed.outDir, '/tmp/rally-pages')
  assert.deepEqual(parsed.routes, ['/', '/profile', '/match/new'])
})

test('parseArgs supports offline static export mode', () => {
  const parsed = parseArgs([
    '--offline',
    '--static-export-dir',
    '/tmp/rally-static-export',
  ])

  assert.equal(parsed.offline, true)
  assert.equal(parsed.baseUrl, null)
  assert.equal(parsed.staticExportDir, '/tmp/rally-static-export')
})

test('parseArgs rejects incompatible online and offline inputs', () => {
  assert.throws(
    () => parseArgs(['--offline', '--base-url', 'http://localhost:8081']),
    /--offline cannot be combined with --base-url/,
  )
  assert.throws(
    () => parseArgs(['--offline', '--fresh-auth']),
    /--offline cannot be combined with --fresh-auth/,
  )
})

test('staticRouteHtmlPath resolves Expo static route files', () => {
  assert.equal(staticRouteHtmlPath('/tmp/export', '/'), '/tmp/export/index.html')
  assert.equal(staticRouteHtmlPath('/tmp/export', '/profile'), '/tmp/export/profile.html')
  assert.equal(staticRouteHtmlPath('/tmp/export', '/match/new'), '/tmp/export/match/new.html')
  assert.equal(staticRouteHtmlPath('/tmp/export', '/challenges'), '/tmp/export/challenges/index.html')
})

test('sanitizeHtmlSnapshot removes executable scripts but keeps document markup', () => {
  const html = [
    '<!DOCTYPE html><html><head>',
    '<style>.root{color:#fff}</style>',
    '<script>window.localStorage.setItem("secret", "value")</script>',
    '<script src="/_expo/static/js/web/AppEntry.js"></script>',
    '</head><body><div id="root">Rally</div></body></html>',
  ].join('')

  const sanitized = sanitizeHtmlSnapshot(html, {
    capturedAt: '2026-05-18T10:00:00.000Z',
    route: '/profile',
    sourceUrl: 'http://localhost:8081/profile',
  })

  assert.match(sanitized, /Captured from http:\/\/localhost:8081\/profile/)
  assert.match(sanitized, /<style>\.root/)
  assert.match(sanitized, /<div id="root">Rally<\/div>/)
  assert.doesNotMatch(sanitized, /<script/i)
  assert.doesNotMatch(sanitized, /localStorage/)
})

test('assertNoObviousSecrets rejects auth tokens in snapshots', () => {
  assert.throws(
    () => assertNoObviousSecrets('<html>refresh_token</html>', '/profile'),
    /refresh_token/,
  )
  assert.throws(
    () => assertNoObviousSecrets('eyJabcde12345.eyJabcde12345.signature12345', '/profile'),
    /JWT-like token/,
  )
})

test('buildGalleryHtml links route artifacts and screenshots', () => {
  const html = buildGalleryHtml({
    capturedAt: '2026-05-18T10:00:00.000Z',
    viewport: { width: 393, height: 852 },
    routes: [
      {
        route: '/',
        slug: 'home',
        url: 'http://localhost:8081/',
        title: 'Rally',
        htmlFile: 'home/index.html',
        screenshotFile: 'home/screenshot.png',
        standaloneFile: 'share/home.html',
      },
      {
        route: '/match/new',
        slug: 'match-new',
        url: 'http://localhost:8081/match/new',
        title: 'Create match',
        htmlFile: 'match-new/index.html',
        screenshotFile: 'match-new/screenshot.png',
        standaloneFile: 'share/match-new.html',
      },
    ],
  })

  assert.match(html, /Rally Page HTML Export/)
  assert.match(html, /href="home\/index.html"/)
  assert.match(html, /src="match-new\/screenshot.png"/)
  assert.match(html, /href="share\/home.html"/)
  assert.match(html, /393x852/)
})

test('buildStandalonePageHtml embeds the screenshot for file-only sharing', () => {
  const html = buildStandalonePageHtml({
    route: '/profile',
    title: 'Profile',
    capturedAt: '2026-05-18T10:00:00.000Z',
    viewport: { width: 393, height: 852 },
    imageDataUri: 'data:image/png;base64,abc123',
  })

  assert.match(html, /Rally Share Page/)
  assert.match(html, /<img src="data:image\/png;base64,abc123"/)
  assert.match(html, /\/profile/)
  assert.doesNotMatch(html, /screenshot\.png/)
  assert.doesNotMatch(html, /file:\/\//)
})
