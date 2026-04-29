export function formatPct01(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`
}

export function formatCompactMoney(n: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n)
  } catch {
    return n.toFixed(0)
  }
}

export function formatNumber(n: number, digits = 2) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}
