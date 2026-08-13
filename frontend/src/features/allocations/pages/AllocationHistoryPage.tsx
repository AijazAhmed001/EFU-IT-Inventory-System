import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { api, type PageMeta } from "../../../lib/api"
import { formatAssetCode } from "../../../utils/assetCode"

interface AllocationRecord {
  id: string
  assetId: string
  assetCode: string
  serialNumber: string
  model: string
  employeeId: string
  employeeName: string
  department: string | null
  allocationDate: string
  returnedAt: string | null
  status: "ALLOCATED" | "RETURNED"
}

export default function AllocationHistory() {
  const [records, setRecords] = useState<AllocationRecord[]>([])
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0 })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [sort, setSort] = useState("allocationDate")
  const [order, setOrder] = useState("desc")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      search,
      status,
      sort,
      order,
    })
    setLoading(true)
    setError("")
    api
      .getPage<AllocationRecord>(`/allocations?${query}`)
      .then((result) => {
        setRecords(result.data)
        setMeta(result.meta)
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load allocations.",
        ),
      )
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [page, pageSize, search, status, sort, order])

  const changeSort = (field: string) => {
    if (sort === field)
      setOrder((current) => (current === "asc" ? "desc" : "asc"))
    else {
      setSort(field)
      setOrder("asc")
    }
    setPage(1)
  }
  const totalPages = Math.max(
    meta.totalPages || Math.ceil(meta.total / meta.limit),
    1,
  )

  return (
    <main className="allocation-history">
      <header>
        <div>
          <h1>Allocation History</h1>
          <p>Search and review all current and returned asset allocations.</p>
        </div>
      </header>
      <section className="allocation-toolbar">
        <label className="allocation-search">
          <Search size={17} />
          <input
            name="allocation-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search asset, serial number, employee or department"
          />
        </label>
      <select
        aria-label="Filter by allocation status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">All statuses</option>
          <option value="ALLOCATED">Allocated</option>
        <option value="RETURNED">Returned</option>
      </select>
      <select
        aria-label="Records per page"
        value={pageSize}
        onChange={(event) => {
          setPageSize(Number(event.target.value))
          setPage(1)
        }}
      >
        <option value={20}>20 rows</option>
        <option value={50}>50 rows</option>
        <option value={100}>100 rows</option>
        <option value={1000}>All records</option>
      </select>
      </section>
      {error && (
        <div className="allocation-error" role="alert">
          {error}
        </div>
      )}
      <section className="allocation-table-wrap" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => changeSort("asset")}>Asset</button>
              </th>
              <th>Serial Number</th>
              <th>
                <button onClick={() => changeSort("employee")}>Employee</button>
              </th>
              <th>Department</th>
              <th>
                <button onClick={() => changeSort("allocationDate")}>
                  Allocation Date
                </button>
              </th>
              <th>
                <button onClick={() => changeSort("returnDate")}>
                  Return Date
                </button>
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && records.length === 0
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr className="allocation-row-skeleton" key={i}>
                    <td colSpan={7} />
                  </tr>
                ))
              : records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{formatAssetCode(record.assetCode)}</strong>
                      <small>{record.model}</small>
                    </td>
                    <td>{record.serialNumber}</td>
                    <td>{record.employeeName}</td>
                    <td>{record.department || "—"}</td>
                    <td>
                      {new Date(record.allocationDate).toLocaleDateString(
                        "en-PK",
                      )}
                    </td>
                    <td>
                      {record.returnedAt
                        ? new Date(record.returnedAt).toLocaleDateString(
                            "en-PK",
                          )
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-badge status-badge--${record.status.toLowerCase()}`}>
                        {record.status === "RETURNED"
                          ? "Returned"
                          : "Allocated"}
                      </span>
                    </td>
                  </tr>
                ))}
            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={7} className="allocation-empty">
                  No allocation records match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <footer className="allocation-pagination">
        <span>{meta.total} records</span>
        <div>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </footer>
    </main>
  )
}
