const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat("en-US")

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export const formatCurrency = (n: number) => usd.format(n)
export const formatCompactCurrency = (n: number) => usdCompact.format(n)
export const formatInteger = (n: number) => integer.format(n)

/** Formats a YYYY-MM-DD string as a local calendar date (no timezone shift). */
export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return date.format(new Date(y, m - 1, d))
}

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("")
}
