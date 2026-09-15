#!/usr/bin/env node

const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { readEnvFile } = require('./smoke-cleanup/env')
const { collectTargets, printSummary } = require('./smoke-cleanup/targets')
const { cleanupTargets } = require('./smoke-cleanup/cleanup')

const APP_ROOT = path.resolve(__dirname, '..')
const DEFAULT_PREFIX = 'rally-smoke-'
const DEFAULT_DOMAIN = 'example.com'

function parseArgs(argv) {
  const options = {
    apply: false,
    prefix: DEFAULT_PREFIX,
    domain: DEFAULT_DOMAIN,
    allowCustomPrefix: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--apply') options.apply = true
    else if (arg === '--allow-custom-prefix') options.allowCustomPrefix = true
    else if (arg === '--prefix') options.prefix = argv[++index]
    else if (arg.startsWith('--prefix=')) options.prefix = arg.slice('--prefix='.length)
    else if (arg === '--domain') options.domain = argv[++index]
    else if (arg.startsWith('--domain=')) options.domain = arg.slice('--domain='.length)
    else if (arg === '--help' || arg === '-h') options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function printHelp() {
  console.log(`
Usage:
  npm run admin:cleanup-smoke
  npm run admin:cleanup-smoke -- --apply

Options:
  --apply                 Delete rows. Without this flag the script is dry-run only.
  --prefix <value>        Email prefix to target. Default: ${DEFAULT_PREFIX}
  --domain <value>        Email domain to target. Default: ${DEFAULT_DOMAIN}
  --allow-custom-prefix   Allow a prefix that does not start with "${DEFAULT_PREFIX}".

Required env:
  EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`.trim())
}

function assertSafeOptions(options) {
  if (!options.allowCustomPrefix && !options.prefix.startsWith(DEFAULT_PREFIX)) {
    throw new Error(`Refusing custom prefix "${options.prefix}". Pass --allow-custom-prefix to override.`)
  }
  if (!options.prefix || !options.domain || options.prefix === '*' || options.domain === '*') {
    throw new Error('Refusing unsafe empty or wildcard prefix/domain.')
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  assertSafeOptions(options)

  const fileEnv = readEnvFile(path.join(APP_ROOT, '.env'))
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || fileEnv.EXPO_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL.')
  if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.')

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const pattern = `${options.prefix}%@${options.domain}`
  const targets = await collectTargets(client, pattern)

  printSummary(targets, options, pattern, supabaseUrl)
  if (!options.apply) {
    console.log('\nDry-run only. Re-run with --apply to delete these smoke records.')
    return
  }
  if (targets.userIds.length === 0) {
    console.log('\nNo smoke users found. Nothing to delete.')
    return
  }

  await cleanupTargets(client, targets)
  const remaining = await collectTargets(client, pattern)
  if (remaining.userIds.length > 0 || remaining.matchIds.length > 0) {
    throw new Error(
      `Cleanup incomplete: ${remaining.userIds.length} users and ${remaining.matchIds.length} matches still match.`,
    )
  }

  console.log('\nCleanup complete.')
}

main().catch((error) => {
  console.error(`cleanup-smoke-tests failed: ${error.message}`)
  process.exit(1)
})
