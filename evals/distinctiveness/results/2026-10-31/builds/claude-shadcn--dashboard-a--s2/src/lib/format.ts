const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat("en-US")

export const formatCurrency = (value: number) => currency.format(value)
export const formatCompactCurrency = (value: number) => compactCurrency.format(value)
export const formatNumber = (value: number) => integer.format(value)
export const formatPercent = (value: number, digits = 1) => `${value.toFixed(digits)}%`

export const formatSignedNumber = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${integer.format(Math.abs(value))}`

export const formatSignedPercent = (value: number, digits = 1) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`

export const percentChange = (current: number, previous: number) =>
  previous === 0 ? 0 : ((current - previous) / previous) * 100
