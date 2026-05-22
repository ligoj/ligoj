import { describe, it, expect } from 'vitest'
import {
  formatCost,
  formatCostRange,
  formatCo2,
  formatCpu,
  formatRam,
  formatStorage,
  donutPath,
  donutFullPath,
  TAB_TYPES,
} from '../../../../../../../../ligoj-plugins/plugin-prov/ui/src/quoteFormatters.js'

describe('quoteFormatters', () => {
  describe('formatCost', () => {
    it('returns dash for null/undefined', () => {
      expect(formatCost(null)).toBe('-')
      expect(formatCost(undefined)).toBe('-')
    })

    it('formats sub-1 values with 3 decimals', () => {
      expect(formatCost(0.5)).toBe('0.500 $')
    })

    it('formats sub-100 values with 2 decimals', () => {
      expect(formatCost(12.345)).toBe('12.35 $') // toFixed rounds
    })

    it('rounds and locale-formats values ≥ 100', () => {
      // toLocaleString output varies by env, just assert the integer + unit shape
      const out = formatCost(1234.7)
      expect(out).toMatch(/[\d, ]+\s\$$/)
      expect(out.endsWith('$')).toBe(true)
    })

    it('applies currency rate and unit', () => {
      expect(formatCost(10, { unit: '€', rate: 0.9 })).toBe('9.00 €')
    })

    it('formats zero as 0.000', () => {
      // Zero falls in the < 1 branch — three decimals.
      expect(formatCost(0)).toBe('0.000 $')
    })
  })

  describe('formatCostRange', () => {
    it('returns dash for null/empty', () => {
      expect(formatCostRange(null)).toBe('-')
      expect(formatCostRange({})).toBe('-')
    })

    it('handles a plain number as a fixed point', () => {
      expect(formatCostRange(10)).toBe('10.00 $')
    })

    it('shows a single value when min === max', () => {
      expect(formatCostRange({ min: 12, max: 12 })).toBe('12.00 $')
    })

    it('shows min – max when they differ', () => {
      expect(formatCostRange({ min: 10, max: 20 })).toBe('10.00 $ – 20.00 $')
    })

    it('appends the unbound + marker', () => {
      expect(formatCostRange({ min: 10, max: 20, unbound: true })).toBe('10.00 $ – 20.00 $+')
    })
  })

  describe('formatCo2', () => {
    it('returns dash for null', () => {
      expect(formatCo2(null)).toBe('-')
    })
    it('keeps grams below 1 kg', () => {
      expect(formatCo2(750)).toBe('750 g')
    })
    it('switches to kg with one decimal at 1 kg+', () => {
      expect(formatCo2(1500)).toBe('1.5 kg')
    })
  })

  describe('formatRam', () => {
    it('returns "" for null', () => {
      expect(formatRam(null)).toBe('')
    })
    it('shows MB below 1 GB', () => {
      expect(formatRam(512)).toBe('512 MB')
    })
    it('shows GB at 1 GB and above', () => {
      expect(formatRam(2048)).toBe('2.0 GB')
      expect(formatRam(8192)).toBe('8.0 GB')
    })
  })

  describe('formatStorage', () => {
    it('returns "" for null', () => {
      expect(formatStorage(null)).toBe('')
    })
    it('shows GB below 1 TB', () => {
      expect(formatStorage(500)).toBe('500 GB')
    })
    it('shows TB at 1 TB and above', () => {
      expect(formatStorage(2048)).toBe('2.0 TB')
    })
  })

  describe('formatCpu', () => {
    it('returns "" for null', () => {
      expect(formatCpu(null)).toBe('')
    })
    it('drops trailing zeros for integers', () => {
      expect(formatCpu(4)).toBe('4')
    })
    it('keeps one decimal for fractional values', () => {
      expect(formatCpu(2.5)).toBe('2.5')
    })
  })

  describe('donutPath', () => {
    it('returns an SVG arc path string', () => {
      const d = donutPath(100, 100, 80, 50, 0, Math.PI / 2)
      expect(d).toMatch(/^M /)
      expect(d).toContain('A 80 80 0')
      expect(d).toContain('A 50 50 0')
      expect(d.endsWith(' Z')).toBe(true)
    })
    it('flags large-arc when slice > π', () => {
      const d = donutPath(0, 0, 10, 5, 0, Math.PI * 1.5)
      // The large-arc flag for the outer arc is the 4th token after the radii.
      expect(d).toMatch(/A 10 10 0 1 1/)
    })
    it('does not flag large-arc for a quarter slice', () => {
      const d = donutPath(0, 0, 10, 5, 0, Math.PI / 2)
      // The outer-arc large-arc flag must be 0 here.
      expect(d).toMatch(/A 10 10 0 0 1/)
      expect(d).toMatch(/A 5 5 0 0 0/)
    })
    it('places the endpoints at the correct trig positions', () => {
      // Quarter slice starting from the +x axis: end = (0, 10) at 90°.
      const d = donutPath(0, 0, 10, 5, 0, Math.PI / 2)
      expect(d).toMatch(/^M 10 0 /)               // start outer at (r, 0)
      expect(d).toMatch(/A 10 10 0 0 1 [\d.eE-]+ 10 /) // end outer near y=10
    })
  })

  describe('donutFullPath', () => {
    it('yields an even-odd annulus', () => {
      const d = donutFullPath(50, 50, 40, 20)
      expect(d).toContain('A 40 40')
      expect(d).toContain('A 20 20')
      // Two M segments — outer and inner.
      expect((d.match(/M /g) || []).length).toBe(2)
    })
  })

  describe('TAB_TYPES', () => {
    it('exposes the 6 quote resource types in legacy order', () => {
      expect(TAB_TYPES.map((t) => t.key)).toEqual([
        'instance', 'database', 'container', 'function', 'storage', 'support',
      ])
    })
    it('every entry carries icon/listField/color', () => {
      for (const t of TAB_TYPES) {
        expect(t.icon).toMatch(/^mdi-/)
        expect(t.listField).toMatch(/s$/)
        expect(t.color).toMatch(/^#[0-9A-F]{6}$/i)
      }
    })
  })
})
