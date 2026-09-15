import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  analyticsBannedPropertyKeys,
  officialEventAnalyticsEventNames,
  parseOfficialEventAnalyticsEvent,
} from '../dist/index.js'

test('official event registry exposes only the five generic names', () => {
  assert.deepEqual(officialEventAnalyticsEventNames, [
    'screen_viewed',
    'interaction_performed',
    'flow_step_completed',
    'action_failed',
    'server_outcome_recorded',
  ])
})

test('official event registry rejects extra properties', () => {
  assert.throws(() => {
    parseOfficialEventAnalyticsEvent({
      name: 'screen_viewed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        screen: 'campaign_hub',
        has_campaign_skin: true,
        raw_route: 'nope',
      },
    })
  }, /Unrecognized key/)
})

test('banned property list covers cross-user identifier leaks', () => {
  assert(analyticsBannedPropertyKeys.includes('profile_user_id'))
  assert(analyticsBannedPropertyKeys.includes('invitee_id'))
})

test('official event registry rejects banned privacy fields', () => {
  assert(analyticsBannedPropertyKeys.includes('user_id'))
  assert.throws(() => {
    parseOfficialEventAnalyticsEvent({
      name: 'interaction_performed',
      properties: {
        event_schema_version: 2,
        source: 'client',
        surface: 'campaign_hub',
        interaction: 'partner_cta',
        target: 'partner-card',
        user_id: '7e81e7c0-0ef2-4283-9952-64041e30f1ac',
      },
    })
  }, /Unrecognized key|banned_analytics_property/)
})

test('generated Deno registry artifact is synced with contracts', async () => {
  const artifactUrl = new URL('../../../supabase/functions/_shared/analyticsRegistry.ts', import.meta.url)
  const artifact = await readFile(artifactUrl, 'utf8')

  for (const eventName of officialEventAnalyticsEventNames) {
    assert.match(artifact, new RegExp(`"${eventName}"|'${eventName}'`))
  }
  for (const bannedKey of analyticsBannedPropertyKeys) {
    assert.match(artifact, new RegExp(`"${bannedKey}"|'${bannedKey}'`))
  }
})
