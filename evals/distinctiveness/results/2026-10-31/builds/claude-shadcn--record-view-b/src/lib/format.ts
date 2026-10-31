const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function formatMoney(value: number) {
  return currency.format(value)
}

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso))
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function formatQuantity(quantity: number, unit: string) {
  // Show small metric amounts in g / ml so cooks don't read "0.015 kg".
  if (unit === "kg" && quantity < 1) return `${Math.round(quantity * 1000)} g`
  if (unit === "L" && quantity < 1) return `${Math.round(quantity * 1000)} ml`
  return `${quantity} ${unit}`
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
