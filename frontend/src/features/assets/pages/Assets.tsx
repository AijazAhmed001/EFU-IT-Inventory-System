import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Edit2,
  Eye,
  Info,
  Monitor,
  Search,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import "./Assets.css"
import { formatAssetCode } from "../../../utils/assetCode"
import { useCurrency } from "../../../utils/currency"
import { api, type PageMeta } from "../../../lib/api"
import { hasPermission } from "../../../auth/permissions"

interface Asset {
  id: string
  assetCode: string
  serialNumber: string
  model: string
  status: string
  purchaseDate: string
  purchaseCost: number
  assetTypeId: string
  assetMakeId?: string
  vendorId?: string
  locationId?: string
  condition?: string
  assetTag?: string
  motherboardId?: string
  memoryId?: string
  storageId?: string
  operatingSystemId?: string
  accessories?: string
  additionalNotes?: string
  purchaseOrderNumber?: string
  invoiceNumber?: string
  macAddress?: string
  ipAddress?: string
  hostname?: string
  domain?: string
  biosVersion?: string
  gpuModel?: string
  assetType?: { name: string }
  assetMake?: { name: string }
  vendor?: { name: string }
  location?: { name: string }
  employee?: {
    id?: string
    name?: string
    department?: string
  }
  assignedTo?: {
    id?: string
    name?: string
  }
  currentAllocation?: {
    employee?: {
      id?: string
      name?: string
      department?: string
    }
  }
}

const inputStyle: CSSProperties = {
  minHeight: 42,
  padding: "0 11px",
  border: "1px solid var(--border)",
  borderRadius: 9,
  background: "var(--surface)",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
}

const actionButtonBase: CSSProperties = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  padding: 0,
  borderRadius: 8,
  cursor: "pointer",
}

const getAssetPrefix = (asset: Asset) => {
  const typeName = asset.assetType?.name?.trim().toUpperCase()

  const typePrefixMap: Record<string, string> = {
    LAPTOP: "LAP",
    DESKTOP: "DES",
    MONITOR: "MON",
    MOUSE: "MOU",
    KEYBOARD: "KEY",
    PRINTER: "PRT",
    RACK: "RCK",
    SERVER: "SRV",
    STORAGE: "STO",
    ROUTER: "RTR",
    SWITCH: "SWT",
  }

  if (typeName && typePrefixMap[typeName]) {
    return typePrefixMap[typeName]
  }

  const codeMatch = asset.assetCode
    .trim()
    .toUpperCase()
    .match(/^(?:EFU-)?([A-Z]{2,4})-/)

  if (codeMatch) {
    return codeMatch[1]
  }

  return (typeName || "AST").replace(/[^A-Z]/g, "").slice(0, 3) || "AST"
}

const getOriginalAssetNumber = (assetCode: string) => {
  const match = assetCode
    .trim()
    .toUpperCase()
    .match(/(\d+)$/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

const detailLabels: Record<string, string> = {
  assetCode: "Asset ID",
  model: "Model",
  serialNumber: "Serial Number",
  status: "Status",
  purchaseDate: "Purchase Date",
  purchaseCost: "Purchase Cost",
  assetTag: "Asset Tag",
  condition: "Condition",
  accessories: "Accessories",
  additionalNotes: "Additional Notes",
  purchaseOrderNumber: "Purchase Order Number",
  invoiceNumber: "Invoice Number",
  macAddress: "MAC Address",
  ipAddress: "IP Address",
  hostname: "Hostname",
  domain: "Domain",
  biosVersion: "BIOS Version",
  gpuModel: "GPU Model",
}

const primaryDetailKeys = [
  "serialNumber",
  "model",
  "assetTag",
  "condition",
  "purchaseDate",
  "purchaseCost",
] as const

const technicalDetailKeys = [
  "purchaseOrderNumber",
  "invoiceNumber",
  "hostname",
  "macAddress",
  "ipAddress",
  "domain",
  "biosVersion",
  "gpuModel",
  "accessories",
  "additionalNotes",
] as const

export default function Assets() {
  const { format: formatCurrency } = useCurrency()
  const [assets, setAssets] = useState<Asset[]>([])
  const [meta, setMeta] = useState<PageMeta>({
    page: 1,
    limit: 20,
    total: 0,
  })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [selected, setSelected] = useState<Asset | null>(null)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)


  const load = async () => {
    try {
      setLoading(true)
      setError("")

      const query = new URLSearchParams({
        page: String(page),
        limit: "20",
        search,
        status,
      })

      const result = await api.getPage<Asset>(`/assets?${query}`)

      setAssets(result.data)
      setMeta(result.meta)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load assets.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [page, search, status])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null)
        setEditing(null)
      }
    }

    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const details = async (id: string) => {
    try {
      setError("")
      setSelected(await api.get<Asset>(`/assets/${id}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load asset.")
    }
  }

  const save = async () => {
    if (!editing) return

    try {
      setSaving(true)
      setError("")

      await api.put(`/assets/${editing.id}`, {
        assetTypeId: editing.assetTypeId,
        assetMakeId: editing.assetMakeId || null,
        model: editing.model,
        motherboardId: editing.motherboardId || null,
        memoryId: editing.memoryId || null,
        storageId: editing.storageId || null,
        operatingSystemId: editing.operatingSystemId || null,
        accessories: editing.accessories || null,
        serialNumber: editing.serialNumber,
        vendorId: editing.vendorId || null,
        purchaseDate: editing.purchaseDate,
        purchaseCost: Number(editing.purchaseCost),
        locationId: editing.locationId || null,
        assetTag: editing.assetTag || null,
        condition: editing.condition || null,
        additionalNotes: editing.additionalNotes || null,
        purchaseOrderNumber: editing.purchaseOrderNumber || null,
        invoiceNumber: editing.invoiceNumber || null,
        macAddress: editing.macAddress || null,
        ipAddress: editing.ipAddress || null,
        hostname: editing.hostname || null,
        domain: editing.domain || null,
        biosVersion: editing.biosVersion || null,
        gpuModel: editing.gpuModel || null,
      })

      setEditing(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update asset.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (asset: Asset) => {
    if (!window.confirm(`Delete ${asset.assetCode}?`)) return

    try {
      setDeletingId(asset.id)
      setError("")

      await api.delete(`/assets/${asset.id}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete asset.")
    } finally {
      setDeletingId(null)
    }
  }

  const totalPages = meta.totalPages || 1
  const showingFrom = meta.total === 0 ? 0 : (page - 1) * meta.limit + 1
  const showingTo = Math.min(page * meta.limit, meta.total)

  const visibleStats = useMemo(
    () => ({
      total: meta.total,
      inStock: assets.filter((asset) => asset.status === "IN_STOCK").length,
      allocated: assets.filter((asset) => asset.status === "ALLOCATED").length,
      retired: assets.filter((asset) => asset.status === "RETIRED").length,
    }),
    [assets, meta.total],
  )

  const displayAssets = useMemo(() => {
    const sortedAssets = [...assets].sort((left, right) => {
      const leftPrefix = getAssetPrefix(left)
      const rightPrefix = getAssetPrefix(right)

      const prefixComparison = leftPrefix.localeCompare(rightPrefix)

      if (prefixComparison !== 0) {
        return prefixComparison
      }

      const numberComparison =
        getOriginalAssetNumber(left.assetCode) -
        getOriginalAssetNumber(right.assetCode)

      if (numberComparison !== 0) {
        return numberComparison
      }

      return left.model.localeCompare(right.model)
    })

    return sortedAssets.map((asset) => {
      const prefix = getAssetPrefix(asset)
      return {
        asset,
        displayCode: formatAssetCode(asset.assetCode, prefix),
      }
    })
  }, [assets])

  const getAssignedEmployee = (asset: Asset) =>
    asset.employee?.name ||
    asset.assignedTo?.name ||
    asset.currentAllocation?.employee?.name ||
    (asset.status === "ALLOCATED" ? "Assigned employee" : "Unassigned")

  const closeModal = () => {
    setSelected(null)
    setEditing(null)
  }

  const getDetailValue = (key: string, value: unknown) => {
    if (key === "assetCode" && typeof value === "string") {
      return formatAssetCode(value)
    }

    if (key === "purchaseCost" && typeof value === "number") {
      return formatCurrency(value)
    }

    if (key === "status" && typeof value === "string") {
      return formatStatus(value)
    }

    if (key === "purchaseDate" && typeof value === "string") {
      return new Intl.DateTimeFormat("en-PK", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    }

    return String(value ?? "—")
  }

  return (
    <main
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 750,
              color: "var(--text-primary)",
            }}
          >
            All Assets
          </h1>

          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            Manage, search and maintain company hardware inventory.
          </p>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          <span>{error}</span>

          <button
            type="button"
            aria-label="Close error"
            onClick={() => setError("")}
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: 0,
              background: "transparent",
              color: "#B91C1C",
              cursor: "pointer",
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <section
        aria-label="Asset summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "Total Assets",
            value: visibleStats.total,
            description: "Registered inventory assets",
            color: "#005BAC",
          },
          {
            label: "In Stock",
            value: visibleStats.inStock,
            description: "Available on this page",
            color: "#15803D",
          },
          {
            label: "Allocated",
            value: visibleStats.allocated,
            description: "Assigned on this page",
            color: "#2563EB",
          },
          {
            label: "Retired",
            value: visibleStats.retired,
            description: "Retired on this page",
            color: "#64748B",
          },
        ].map((item) => (
          <article
            key={item.label}
            style={{
              padding: "16px 18px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 5px 16px rgba(15,23,42,.04)",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 750,
                color: item.color,
              }}
            >
              {item.value.toLocaleString()}
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                marginTop: 3,
                fontSize: 11,
                color: "var(--text-tertiary)",
              }}
            >
              {item.description}
            </div>
          </article>
        ))}
      </section>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: 14,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            maxWidth: 420,
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
            }}
          />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search by asset, ID, model or serial..."
            style={{
              ...inputStyle,
              width: "100%",
              paddingLeft: 38,
              background: "var(--surface-soft)",
            }}
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          style={{
            ...inputStyle,
            padding: "0 34px 0 12px",
            cursor: "pointer",
          }}
        >
          <option value="">All statuses</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="ALLOCATED">Allocated</option>
          <option value="UNDER_REPAIR">Under Repair</option>
          <option value="RETIRED">Retired</option>
        </select>

        {(search || status) && (
          <button
            type="button"
            onClick={() => {
              setSearch("")
              setStatus("")
              setPage(1)
            }}
            style={{
              minHeight: 42,
              padding: "0 14px",
              border: "1px solid var(--border)",
              borderRadius: 9,
              background: "var(--surface)",
              color: "var(--text-secondary)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear filters
          </button>
        )}
      </section>

      <section
        style={{
          width: "100%",
          height: "fit-content",
          alignSelf: "start",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 20px rgba(15,23,42,.04)",
        }}
      >
        {loading ? (
          <div
            style={{
              minHeight: 240,
              display: "grid",
              placeItems: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            Loading assets…
          </div>
        ) : assets.length > 0 ? (
          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 1060,
                borderCollapse: "collapse",
              }}
            >
              <caption
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0,0,0,0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                Company hardware assets
              </caption>

              <thead>
                <tr style={{ background: "var(--surface-soft)" }}>
                  {[
                    "ID",
                    "Asset",
                    "Category",
                    "Assigned To",
                    "Status",
                    "Cost",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      style={{
                        padding: "13px 16px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {displayAssets.map(({ asset, displayCode }) => {
                  return (
                    <tr
                      key={asset.id}
                      style={{
                        borderTop: "1px solid var(--border-soft)",
                        background: "transparent",
                        transition: "background .15s ease",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.background =
                          "var(--surface-soft)"
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.background = "transparent"
                      }}
                    >
                      <td
                        style={{
                          padding: "13px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#005BAC",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayCode}
                      </td>

                      <td
                        style={{
                          padding: "13px 16px",
                          minWidth: 190,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void details(asset.id)}
                          style={{
                            display: "block",
                            padding: 0,
                            border: 0,
                            background: "transparent",
                            color: "var(--text-primary)",
                            fontSize: 13,
                            fontWeight: 700,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          {asset.model || "Unnamed asset"}
                        </button>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {asset.serialNumber || "No serial number"}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "13px 16px",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {asset.assetType?.name || "—"}
                      </td>

                      <td
                        style={{
                          padding: "13px 16px",
                          minWidth: 150,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {getAssignedEmployee(asset)}
                      </td>

                      <td style={{ padding: "13px 16px" }}>
                        <span className={`status-badge status-badge--${asset.status.toLowerCase().replaceAll("_", "-")}`}>
                          {formatStatus(asset.status)}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "13px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatCurrency(asset.purchaseCost)}
                      </td>

                      <td
                        style={{
                          padding: "13px 16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => void details(asset.id)}
                            title="View asset"
                            aria-label={`View ${displayCode}`}
                            style={{
                              ...actionButtonBase,
                              border: "1px solid #BFDBFE",
                              background: "#EFF6FF",
                              color: "#005BAC",
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {hasPermission("assets.update") && (
                            <button
                              type="button"
                              onClick={() => setEditing(asset)}
                              title="Edit asset"
                              aria-label={`Edit ${displayCode}`}
                              style={{
                                ...actionButtonBase,
                                border: "1px solid #BBF7D0",
                                background: "#F0FDF4",
                                color: "#15803D",
                              }}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {hasPermission("assets.delete") && (
                            <button
                              type="button"
                              disabled={deletingId === asset.id}
                              onClick={() => void remove(asset)}
                              title="Delete asset"
                              aria-label={`Delete ${displayCode}`}
                              style={{
                                ...actionButtonBase,
                                border: "1px solid #FECACA",
                                background: "#FEF2F2",
                                color: "#DC2626",
                                cursor:
                                  deletingId === asset.id
                                    ? "not-allowed"
                                    : "pointer",
                                opacity: deletingId === asset.id ? 0.6 : 1,
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              minHeight: 260,
              display: "grid",
              placeItems: "center",
              padding: 30,
              textAlign: "center",
            }}
          >
            <div>
              <Search
                size={28}
                style={{
                  color: "var(--text-tertiary)",
                  marginBottom: 10,
                }}
              />

              <h2
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "var(--text-primary)",
                }}
              >
                No assets found
              </h2>

              <p
                style={{
                  margin: "7px 0 0",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                Try changing your search or status filter.
              </p>
            </div>
          </div>
        )}

        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            borderTop: "1px solid var(--border-soft)",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            Showing {showingFrom}–{showingTo} of {meta.total} assets
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              style={{
                minHeight: 36,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "0 11px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                color:
                  page <= 1 ? "var(--text-tertiary)" : "var(--text-primary)",
                fontSize: 12,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.55 : 1,
              }}
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span
              style={{
                padding: "0 6px",
                fontSize: 12,
                fontWeight: 650,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              style={{
                minHeight: 36,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "0 11px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--surface)",
                color:
                  page >= totalPages
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
                fontSize: 12,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.55 : 1,
              }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {(selected || editing) && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal()
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            padding: 20,
            background: "rgba(15,23,42,.55)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-modal-title"
            style={{
              width: "min(100%,620px)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--surface-raised)",
              padding: 24,
              borderRadius: 16,
              border: "1px solid var(--border)",
              boxShadow: "0 24px 60px rgba(15,23,42,.24)",
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              style={{
                float: "right",
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: "1px solid var(--border)",
                borderRadius: 9,
                background: "var(--surface)",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>

            <h2
              id="asset-modal-title"
              style={{
                margin: "0 0 20px",
                fontSize: 20,
                color: "var(--text-primary)",
              }}
            >
              {editing ? "Edit Asset" : "Asset Details"}
            </h2>

            {editing ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                  gap: 12,
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Model
                  <input
                    value={editing.model}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        model: event.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Serial number
                  <input
                    value={editing.serialNumber}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        serialNumber: event.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Purchase date
                  <input
                    type="date"
                    value={editing.purchaseDate.slice(0, 10)}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        purchaseDate: event.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Purchase cost
                  <input
                    type="number"
                    min="0"
                    value={editing.purchaseCost}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        purchaseCost: Number(event.target.value),
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Asset tag
                  <input
                    value={editing.assetTag || ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        assetTag: event.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 6,
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  Condition
                  <input
                    value={editing.condition || ""}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        condition: event.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </label>

                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      minHeight: 42,
                      padding: "0 16px",
                      background: "var(--surface)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 9,
                      fontWeight: 650,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save()}
                    style={{
                      minHeight: 42,
                      padding: "0 16px",
                      background: "#005BAC",
                      color: "#fff",
                      border: 0,
                      borderRadius: 9,
                      fontWeight: 650,
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              selected && (
                <div className="asset-detail-view">
                  <section className="asset-detail-hero">
                    <div className="asset-detail-hero__icon" aria-hidden="true"><Monitor size={25} /></div>
                    <div className="asset-detail-hero__identity">
                      <span>{selected.assetType?.name || "IT Asset"}</span>
                      <strong>{formatAssetCode(selected.assetCode)}</strong>
                      <small>{selected.model || "Model not specified"}</small>
                    </div>
                    <span className={`status-badge status-badge--${selected.status.toLowerCase().replaceAll("_", "-")}`}>
                      {formatStatus(selected.status)}
                    </span>
                  </section>

                  <section className="asset-detail-section">
                    <div className="asset-detail-section__heading"><Info size={16} /><div><h3>Asset information</h3><p>Identification and purchase details</p></div></div>
                    <div className="asset-detail-grid">
                      {primaryDetailKeys.map((key) => <div className="asset-detail-field" key={key}><span>{detailLabels[key]}</span><strong>{getDetailValue(key, selected[key])}</strong></div>)}
                    </div>
                  </section>

                  <section className="asset-detail-section">
                    <div className="asset-detail-section__heading"><Tag size={16} /><div><h3>Ownership &amp; assignment</h3><p>Classification, supplier and current custodian</p></div></div>
                    <div className="asset-detail-grid asset-detail-grid--ownership">
                      <div className="asset-detail-field"><span>Category</span><strong>{selected.assetType?.name || "—"}</strong></div>
                      <div className="asset-detail-field"><span>Vendor</span><strong>{selected.vendor?.name || "—"}</strong></div>
                      <div className="asset-detail-field asset-detail-field--wide"><span><UserRound size={13} /> Assigned to</span><strong>{getAssignedEmployee(selected)}</strong></div>
                    </div>
                  </section>

                  {technicalDetailKeys.some((key) => selected[key]) && (
                    <section className="asset-detail-section">
                      <div className="asset-detail-section__heading"><CircleDollarSign size={16} /><div><h3>Additional details</h3><p>Technical and supporting information</p></div></div>
                      <div className="asset-detail-grid">
                        {technicalDetailKeys.filter((key) => selected[key]).map((key) => <div className="asset-detail-field" key={key}><span>{detailLabels[key]}</span><strong>{getDetailValue(key, selected[key])}</strong></div>)}
                      </div>
                    </section>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </main>
  )
}
