export const partyQueryKeys = {
  all: ['parties'] as const,
  discovery: () => ['parties', 'discovery'] as const,
  mine: () => ['parties', 'mine'] as const,
  detail: (partyId: string | undefined) => ['parties', 'detail', partyId] as const,
}
