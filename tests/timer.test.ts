import { describe, expect, it } from 'vitest'
import { clockLabel, SECTIONS, timerPosition } from '@/features/timer/sections'
import { slotForTime, weekDays } from '@/lib/dates'

describe('timerPosition', () => {
  it('starts in the first corner with two minutes left', () => {
    const p = timerPosition(0)
    expect(p.sectionIndex).toBe(0)
    expect(p.totalRemaining).toBe(120)
    expect(p.sectionRemaining).toBe(30)
    expect(p.done).toBe(false)
  })

  it('moves to the next corner every 30 seconds', () => {
    expect(timerPosition(29_999).sectionIndex).toBe(0)
    expect(timerPosition(30_000).sectionIndex).toBe(1)
    expect(timerPosition(60_000).sectionIndex).toBe(2)
    expect(timerPosition(119_000).sectionIndex).toBe(3)
  })

  it('is done after two minutes and never goes beyond', () => {
    const p = timerPosition(500_000)
    expect(p.done).toBe(true)
    expect(p.sectionIndex).toBe(4)
    expect(p.totalRemaining).toBe(0)
    expect(p.progress).toBe(1)
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

  it('builds a Monday-to-Sunday week', () => {
    const days = weekDays(new Date(2026, 10, 5))
    expect(days).toHaveLength(7)
    expect(days[0]?.getDay()).toBe(1)
    expect(days[6]?.getDay()).toBe(0)
    expect(weekDays(new Date(2026, 10, 5), -1)[0]?.getDate()).toBe(26)
  })
})
