import { describe, it, expect } from 'vitest'
import {
  formatCost,
  formatCostRange,
  formatCo2,
  formatCpu,
  formatRam,
  formatStorage,
  getOsIcon,
  formatOs,
  getDbIcon,
  formatEngine,
  RESOURCE_TYPES,
  formatEfficiency
} from '@/plugins/prov/provFormatters.js'

describe('formatCost', () => {
  it('returns "-" for null', () => {
    expect(formatCost(null)).toBe('-')
  })

  it('formats small values with 3 decimals', () => {
    expect(formatCost(0.005)).toBe('0.005 $/mo')
  })

  it('formats medium values with 2 decimals', () => {
    expect(formatCost(50)).toBe('50.00 $/mo')
  })

  it('formats large values as rounded integers', () => {
    expect(formatCost(150)).toBe('150 $/mo')
  })

  it('applies currency rate and unit', () => {
    expect(formatCost(100, { unit: '€', rate: 0.9 })).toBe('90.00 €/mo')
  })

  it('formats without monthly suffix when monthly=false', () => {
    expect(formatCost(50, { unit: '$', rate: 1 }, false)).toBe('50.00 $')
  })
})

describe('formatCostRange', () => {
  it('returns "-" for null', () => {
    expect(formatCostRange(null)).toBe('-')
  })

  it('returns single cost when min equals max', () => {
    expect(formatCostRange({ min: 50, max: 50 })).toBe('50.00 $/mo')
  })

  it('returns range when min does not equal max', () => {
    expect(formatCostRange({ min: 50, max: 100 })).toBe('50.00 $/mo — 100 $/mo')
  })
})

describe('formatCo2', () => {
  it('returns "-" for null', () => {
    expect(formatCo2(null)).toBe('-')
  })

  it('formats grams for values under 1000', () => {
    expect(formatCo2(500)).toBe('500 g')
  })

  it('formats kilograms for values 1000 and above', () => {
    expect(formatCo2(1500)).toBe('1.5 kg')
  })
})

describe('formatCpu', () => {
  it('returns "-" for null', () => {
    expect(formatCpu(null)).toBe('-')
  })

  it('formats whole numbers without decimal', () => {
    expect(formatCpu(4)).toBe('4 vCPU')
  })

  it('formats decimal numbers with one decimal place', () => {
    expect(formatCpu(2.5)).toBe('2.5 vCPU')
  })
})

describe('formatRam', () => {
  it('returns "-" for null', () => {
    expect(formatRam(null)).toBe('-')
  })

  it('formats megabytes for values under 1024', () => {
    expect(formatRam(512)).toBe('512 MB')
  })

  it('formats gigabytes for values 1024 and above', () => {
    expect(formatRam(2048)).toBe('2.0 GB')
  })
})

describe('formatStorage', () => {
  it('returns "-" for null', () => {
    expect(formatStorage(null)).toBe('-')
  })

  it('formats gigabytes for values under 1024', () => {
    expect(formatStorage(100)).toBe('100 GB')
  })

  it('formats terabytes for values 1024 and above', () => {
    expect(formatStorage(2048)).toBe('2.0 TB')
  })
})

describe('getOsIcon', () => {
  it('returns correct icon for LINUX', () => {
    expect(getOsIcon('LINUX')).toBe('mdi-linux')
  })

  it('returns correct icon for WINDOWS', () => {
    expect(getOsIcon('WINDOWS')).toBe('mdi-microsoft-windows')
  })

  it('returns default icon for unknown OS', () => {
    expect(getOsIcon('UNKNOWN')).toBe('mdi-server')
  })
})

describe('formatOs', () => {
  it('formats OS name with proper casing', () => {
    expect(formatOs('LINUX')).toBe('Linux')
  })

  it('returns "-" for null', () => {
    expect(formatOs(null)).toBe('-')
  })
})

describe('getDbIcon', () => {
  it('returns correct icon for MYSQL', () => {
    expect(getDbIcon('MYSQL')).toBe('mdi-database')
  })

  it('returns correct icon for POSTGRESQL', () => {
    expect(getDbIcon('POSTGRESQL')).toBe('mdi-elephant')
  })

  it('returns default icon for unknown engine', () => {
    expect(getDbIcon('UNKNOWN')).toBe('mdi-database')
  })
})

describe('formatEngine', () => {
  it('replaces underscores with spaces', () => {
    expect(formatEngine('SQL_SERVER')).toBe('SQL SERVER')
  })

  it('returns "-" for null', () => {
    expect(formatEngine(null)).toBe('-')
  })
})

describe('RESOURCE_TYPES', () => {
  it('has 6 entries', () => {
    expect(RESOURCE_TYPES).toHaveLength(6)
  })

  it('each entry has key, icon, and color', () => {
    RESOURCE_TYPES.forEach(type => {
      expect(type).toHaveProperty('key')
      expect(type).toHaveProperty('icon')
      expect(type).toHaveProperty('color')
    })
  })
})

describe('formatEfficiency', () => {
  it('returns 0 when max is 0', () => {
    expect(formatEfficiency(50, 0)).toBe(0)
  })

  it('returns 0 when value is 0', () => {
    expect(formatEfficiency(0, 100)).toBe(0)
  })

  it('calculates percentage correctly', () => {
    expect(formatEfficiency(50, 100)).toBe(50)
  })

  it('caps at 100 for values exceeding max', () => {
    expect(formatEfficiency(120, 100)).toBe(100)
  })
})
