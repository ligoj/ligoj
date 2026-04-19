// Cost formatting with currency
export function formatCost(value, currency = { unit: '$', rate: 1 }, monthly = true) {
  if (value == null) return '-'
  const converted = value * (currency.rate || 1)
  const formatted = converted < 1 ? converted.toFixed(3) : converted < 100 ? converted.toFixed(2) : Math.round(converted).toLocaleString()
  return `${formatted} ${currency.unit || '$'}${monthly ? '/mo' : ''}`
}

// Cost range (min-max)
export function formatCostRange(cost, currency) {
  if (!cost) return '-'
  if (cost.min === cost.max) return formatCost(cost.min, currency)
  return `${formatCost(cost.min, currency)} — ${formatCost(cost.max, currency)}`
}

// CO2 emissions
export function formatCo2(grams) {
  if (grams == null) return '-'
  if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`
  return `${Math.round(grams)} g`
}

// CPU count
export function formatCpu(value) {
  if (value == null) return '-'
  return value % 1 === 0 ? `${value} vCPU` : `${value.toFixed(1)} vCPU`
}

// RAM/Storage in human-readable
export function formatRam(mb) {
  if (mb == null) return '-'
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}

export function formatStorage(gb) {
  if (gb == null) return '-'
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`
  return `${Math.round(gb)} GB`
}

// OS icons
const OS_ICONS = { LINUX: 'mdi-linux', WINDOWS: 'mdi-microsoft-windows', SUSE: 'mdi-linux', RHEL: 'mdi-redhat', CENTOS: 'mdi-linux' }
export function getOsIcon(os) { return OS_ICONS[os] || 'mdi-server' }
export function formatOs(os) { return os ? os.charAt(0) + os.slice(1).toLowerCase() : '-' }

// Database engine icons
const DB_ICONS = { MYSQL: 'mdi-database', ORACLE: 'mdi-database', POSTGRESQL: 'mdi-elephant', MARIADB: 'mdi-database', SQL_SERVER: 'mdi-microsoft' }
export function getDbIcon(engine) { return DB_ICONS[engine] || 'mdi-database' }
export function formatEngine(engine) { return engine ? engine.replace(/_/g, ' ') : '-' }

// Resource type labels
export const RESOURCE_TYPES = [
  { key: 'instance', icon: 'mdi-server', color: 'blue' },
  { key: 'database', icon: 'mdi-database', color: 'green' },
  { key: 'container', icon: 'mdi-docker', color: 'cyan' },
  { key: 'function', icon: 'mdi-lambda', color: 'purple' },
  { key: 'storage', icon: 'mdi-harddisk', color: 'orange' },
  { key: 'support', icon: 'mdi-lifebuoy', color: 'red' },
]

// Efficiency percentage
export function formatEfficiency(value, max) {
  if (!max || !value) return 0
  return Math.min(100, Math.round((value / max) * 100))
}
