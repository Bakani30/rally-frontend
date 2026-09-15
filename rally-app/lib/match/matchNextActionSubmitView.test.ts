import { describe, expect, it } from 'vitest'

import { getSubmitResultActionView } from './matchNextActionSubmitView'

describe('getSubmitResultActionView', () => {
  it('renders a visible submit-score CTA for active matches', () => {
    expect(getSubmitResultActionView({ kind: 'submit_result' })).toMatchObject({
      title: 'Match is live',
      cta: { label: 'Submit score' },
    })
  })

  it('does not render for non-submit actions', () => {
    expect(getSubmitResultActionView({ kind: 'waiting_start' })).toBeNull()
  })
})
