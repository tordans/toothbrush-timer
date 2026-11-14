import { describe, expect, it } from 'vitest'
import { clockLabel, SECTIONS, TIMELINE_SECONDS, timerPosition } from '@/features/timer/sections'
import { daysAround, slotForTime } from '@/lib/dates'

describe('timerPosition', () => {
  it('starts in the first corner with two minutes left', () => {
    const p = timerPosition(0)
    expect(p.sectionIndex).toBe(0)
    expect(p.switching).toBe(false)
    expect(p.totalRemaining).toBe(120)
  })

  it('takes a 3 second break after each corner, which does not count as brushing', () => {
    expect(timerPosition(29_999).sectionIndex).toBe(0)
    const pause = timerPosition(31_000)
    expect(pause.switching).toBe(true)
    expect(pause.sectionIndex).toBe(1)
    expect(pause.totalRemaining).toBe(90)
    const second = timerPosition(33_000)
    expect(second.switching).toBe(false)
    expect(second.sectionIndex).toBe(1)
    expect(second.sectionProgress).toBe(0)
    expect(timerPosition(66_000).sectionIndex).toBe(2)
    expect(timerPosition(99_000).sectionIndex).toBe(3)
    expect(timerPosition(128_000).done).toBe(false)
  })

  it('is done after four corners and three breaks and never goes beyond', () => {
    expect(TIMELINE_SECONDS).toBe(129)
    const p = timerPosition(500_000)
    expect(p.done).toBe(true)
    expect(p.sectionIndex).toBe(4)
    expect(p.totalRemaining).toBe(0)
    expect(p.brushed).toBe(120)
  })

  it('has four corners in a continuous order', () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      'Oben links',
      'Oben rechts',
      'Unten rechts',
      'Unten links',
    ])
  })
})

describe('clockLabel', () => {
  it('formats minutes and seconds', () => {
    expect(clockLabel(120)).toBe('2:00')
    expect(clockLabel(65)).toBe('1:05')
    expect(clockLabel(0)).toBe('0:00')
  })
})

describe('dates', () => {
  it('picks morning before 14:00 and evening after', () => {
    expect(slotForTime(new Date(2026, 10, 5, 7, 0))).toBe('morning')
    expect(slotForTime(new Date(2026, 10, 5, 13, 59))).toBe('morning')
    expect(slotForTime(new Date(2026, 10, 5, 14, 0))).toBe('evening')
  })

  it('puts today in the middle of seven days', () => {
    const days = daysAround(new Date(2026, 10, 14))
    expect(days).toHaveLength(7)
    expect(days[3]?.getDate()).toBe(14)
    expect(days[0]?.getDate()).toBe(11)
    expect(days[6]?.getDate()).toBe(17)
    expect(daysAround(new Date(2026, 10, 14), -1)[3]?.getDate()).toBe(7)
  })
})
