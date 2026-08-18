import { useEffect, useMemo, useState } from "react"
import { Download, FilePlus2, RefreshCw, Search } from "lucide-react"
import { api, PageMeta } from "../../../lib/api"
import { hasPermission } from "../../../auth/permissions"
import { PO_STATUSES } from "../types"
import "./PurchaseOrders.css"

interface Row {
  id: string
  poNumber: string
  poDate: string
  poYear: number
  vendor: string
  poFor: string
  branchUnit?: string
  grandTotal: number
  currencyCode: string
  status: string
  isLocked: boolean
  createdBy: string
}
const go = (path: string) => {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]),
    [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("")
  const [filters, setFilters] = useState(
    () =>
      Object.fromEntries(
        new URLSearchParams(location.search),
      ) as Record<string, string>,
  )
  const query = useMemo(() => {
    const q = new URLSearchParams({
      ...filters,
      page: String(meta.page),
      limit: "20",
    })
    return q.toString()
  }, [filters, meta.page])
  const load = () => {
    setLoading(true)
    setError("")
    api
      .getPage<Row>(`/purchase-orders?${query}`)
      .then((x) => {
        setRows(x.data)
        setMeta(x.meta)
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load purchase orders.",
        ),
      )
      .finally(() => setLoading(false))
  }
  useEffect(load, [query])
  useEffect(
    () =>
      history.replaceState(
        {},
        "",
        `${location.pathname}?${new URLSearchParams(filters)}`,
      ),
    [filters],
  )
  const field = (key: string, value: string) => {
    setMeta((m) => ({ ...m, page: 1 }))
    setFilters((f) => ({ ...f, [key]: value }))
  }
  return (
    <div className="po-page">
      <header className="po-title">
        <div>
          <h1>Purchase Orders</h1>
          <p>
            Manage procurement, approvals, receiving, and inventory creation.
          </p>
        </div>
        <div className="po-actions">
          {hasPermission("purchase_orders.export") && (
            <button onClick={() => window.print()}>
              <Download size={16} />
              Export
            </button>
          )}
          <button onClick={load}>
            <RefreshCw size={16} />
            Refresh
          </button>
          {hasPermission("purchase_orders.create") && (
            <button
              className="primary"
              onClick={() => go("/purchase-orders/new")}
            >
              <FilePlus2 size={16} />
              Create PO
            </button>
          )}
        </div>
      </header>
      <section className="po-card po-filters">
        <label>
          <span>Search</span>
          <div className="po-search">
            <Search size={16} />
            <input
              value={filters.search || ""}
              onChange={(e) => field("search", e.target.value)}
              placeholder="PO number, vendor, reference"
            />
          </div>
        </label>
        <label>
          <span>Status</span>
          <select
            value={filters.status || ""}
            onChange={(e) => field("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {PO_STATUSES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Year</span>
          <input
            type="number"
            value={filters.year || ""}
            onChange={(e) => field("year", e.target.value)}
          />
        </label>
        <label>
          <span>From</span>
          <input
            type="date"
            value={filters.from || ""}
            onChange={(e) => field("from", e.target.value)}
          />
        </label>
        <label>
          <span>To</span>
          <input
            type="date"
            value={filters.to || ""}
            onChange={(e) => field("to", e.target.value)}
          />
        </label>
        <button onClick={() => setFilters({})}>Clear filters</button>
      </section>
      {error && (
        <div className="po-alert" role="alert">
          {error}
          <button onClick={load}>Try again</button>
        </div>
      )}
      <section className="po-card po-table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Year</th>
              <th>PO For</th>
              <th>Branch / Unit</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr className="skeleton" key={i}>
                    <td colSpan={10}>&nbsp;</td>
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <button
                        className="link"
                        onClick={() => go(`/purchase-orders/${r.id}`)}
                      >
                        {r.poNumber}
                      </button>
                      {r.isLocked && <small> Locked</small>}
                    </td>
                    <td>{new Date(r.poDate).toLocaleDateString()}</td>
                    <td>{r.vendor}</td>
                    <td>{r.poYear}</td>
                    <td>{r.poFor}</td>
                    <td>{r.branchUnit || "—"}</td>
                    <td>
                      {new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: r.currencyCode,
                      }).format(r.grandTotal)}
                    </td>
                    <td>
                      <span className={`po-status s-${r.status.toLowerCase()}`}>
                        {r.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{r.createdBy}</td>
                    <td>
                      <button
                        className="link"
                        onClick={() => go(`/purchase-orders/${r.id}`)}
                      >
                        View
                      </button>
                      {hasPermission("purchase_orders.receive") &&
                        ["APPROVED", "PARTIALLY_RECEIVED"].includes(
                          r.status,
                        ) && (
                          <button
                            className="link"
                            onClick={() =>
                              go(`/purchase-orders/${r.id}/receive`)
                            }
                          >
                            Receive
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !rows.length && (
          <div className="po-empty">
            <strong>No purchase orders found</strong>
            <span>Adjust the filters or create the first purchase order.</span>
          </div>
        )}
        <footer className="po-pagination">
          <span>{meta.total} records</span>
          <button
            disabled={meta.page <= 1}
            onClick={() => setMeta((m) => ({ ...m, page: m.page - 1 }))}
          >
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages || 1}
          </span>
          <button
            disabled={meta.page >= (meta.totalPages || 1)}
            onClick={() => setMeta((m) => ({ ...m, page: m.page + 1 }))}
          >
            Next
          </button>
        </footer>
      </section>
    </div>
  )
}
