export function formatAssetCode(value: string | null | undefined, fallbackPrefix = "AST") {
  const raw = value?.trim().toUpperCase() || ""
  const match = raw.match(/^(?:EFU-)?([A-Z0-9]+)-(\d+)$/)
  const prefix = (match?.[1] || fallbackPrefix).replace(/[^A-Z0-9]/g, "") || "AST"
  const sequence = match ? Number(match[2]) : 0
  if (!sequence) return raw.startsWith("EFU-") ? raw : `EFU-${raw || `${prefix}-0001`}`
  return `EFU-${prefix}-${String(sequence).padStart(4, "0")}`
}
