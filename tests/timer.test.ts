import { describe, expect, it } from 'vitest'
import {
  brushingSeconds,
  clockLabel,
  SECTIONS,
  timelineSeconds,
  timerPosition,
} from '@/features/timer/sections'
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
    expect(timelineSeconds(120)).toBe(129)
    const p = timerPosition(500_000)
    expect(p.done).toBe(true)
    expect(p.sectionIndex).toBe(4)
    expect(p.totalRemaining).toBe(0)
    expect(p.brushed).toBe(120)
  })

  it('takes three minutes with a manual brush, 45 seconds per corner', () => {
    expect(brushingSeconds('manual')).toBe(180)
    expect(brushingSeconds('electric')).toBe(120)
    expect(brushingSeconds(undefined)).toBe(120)
    expect(timerPosition(44_000, 180).sectionIndex).toBe(0)
    const pause = timerPosition(46_000, 180)
    expect(pause.switching).toBe(true)
    expect(pause.totalRemaining).toBe(135)
    expect(timerPosition(48_000, 180).sectionIndex).toBe(1)
    expect(timerPosition(189_000, 180).done).toBe(true)
    expect(timerPosition(188_000, 180).done).toBe(false)
  })

  it('has four corners in a continuous order', () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      'Oben rechts',
      'Oben links',
      'Unten links',
      'Unten rechts',
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
  it('picks morning before 15:00 and evening after', () => {
    expect(slotForTime(new Date(2026, 10, 5, 7, 0))).toBe('morning')
    expect(slotForTime(new Date(2026, 10, 5, 14, 59))).toBe('morning')
    expect(slotForTime(new Date(2026, 10, 5, 15, 0))).toBe('evening')
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
