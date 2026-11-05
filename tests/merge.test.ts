import { describe, expect, it } from 'vitest'
import { mergeFamilyStates, sameFamilyState } from '@/features/family/merge'
import { emptyFamilyState, parseFamilyState, type FamilyState } from '@/features/family/schema'

const kid = (id: string, name: string, updatedAt: string, deleted?: boolean) => ({
  id,
  name,
  animal: 'fox' as const,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt,
  ...(deleted ? { deleted } : {}),
})

const brushing = (id: string, updatedAt: string, deleted?: boolean) => ({
  id,
  kidId: 'k1',
  date: '2026-11-05',
  slot: 'morning' as const,
  at: updatedAt,
  seconds: 120,
  source: 'timer' as const,
  updatedAt,
  ...(deleted ? { deleted } : {}),
})

function state(patch: Partial<FamilyState>): FamilyState {
  return { ...emptyFamilyState(), ...patch }
}

describe('mergeFamilyStates', () => {
  it('keeps brushings from both phones', () => {
    const a = state({ brushings: { b1: brushing('b1', '2026-11-05T07:00:00.000Z') } })
    const b = state({ brushings: { b2: brushing('b2', '2026-11-05T07:05:00.000Z') } })
    expect(Object.keys(mergeFamilyStates(a, b).brushings).sort()).toEqual(['b1', 'b2'])
  })

  it('takes the newer version of the same record, in either order', () => {
    const old = state({ kids: { k1: kid('k1', 'Hana', '2026-11-01T00:00:00.000Z') } })
    const renamed = state({ kids: { k1: kid('k1', 'Hanna', '2026-11-02T00:00:00.000Z') } })
    expect(mergeFamilyStates(old, renamed).kids.k1?.name).toBe('Hanna')
    expect(mergeFamilyStates(renamed, old).kids.k1?.name).toBe('Hanna')
  })

  it('keeps a newer delete (tombstone) over an older record', () => {
    const live = state({ brushings: { b1: brushing('b1', '2026-11-05T07:00:00.000Z') } })
    const removed = state({ brushings: { b1: brushing('b1', '2026-11-05T08:00:00.000Z', true) } })
    expect(mergeFamilyStates(live, removed).brushings.b1?.deleted).toBe(true)
  })

  it('takes the newer settings', () => {
    const a = state({
      settings: { music: false, gong: true, updatedAt: '2026-11-05T10:00:00.000Z' },
    })
    const b = state({
      settings: { music: true, gong: false, updatedAt: '2026-11-04T10:00:00.000Z' },
    })
    expect(mergeFamilyStates(a, b).settings.music).toBe(false)
    expect(mergeFamilyStates(b, a).settings.gong).toBe(true)
  })

  it('is idempotent', () => {
    const a = state({ kids: { k1: kid('k1', 'Hanna', '2026-11-01T00:00:00.000Z') } })
    expect(sameFamilyState(mergeFamilyStates(a, a), a)).toBe(true)
  })
})

describe('sameFamilyState', () => {
  it('ignores key order', () => {
    const a = state({
      kids: {
        k1: kid('k1', 'A', '2026-11-01T00:00:00.000Z'),
        k2: kid('k2', 'B', '2026-11-01T00:00:00.000Z'),
      },
    })
    const b = state({
      kids: {
        k2: kid('k2', 'B', '2026-11-01T00:00:00.000Z'),
        k1: kid('k1', 'A', '2026-11-01T00:00:00.000Z'),
      },
    })
    expect(sameFamilyState(a, b)).toBe(true)
  })
})

describe('parseFamilyState', () => {
  it('rejects foreign data', () => {
    expect(parseFamilyState({ hello: 'world' })).toBeNull()
    expect(parseFamilyState(null)).toBeNull()
  })

  it('accepts a valid state', () => {
    expect(parseFamilyState(emptyFamilyState())).not.toBeNull()
  })
})
