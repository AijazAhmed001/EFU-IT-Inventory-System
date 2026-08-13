import {
  Activity,
  AlertCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Check,
  Download,
  FileClock,
  History,
  Laptop,
  List,
  LoaderCircle,
  Package,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { formatAssetCode } from '../../../utils/assetCode'
import { CURRENCY_OPTIONS, setDisplayCurrency, useCurrency } from '../../../utils/currency'
import {
  downloadAssetHistoryPdf,
  downloadCompleteReportPdf,
  type CompleteReportExport,
} from '../../../utils/reportPdf'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../../../lib/api'
import './Reports.css'

interface AssetRelation {
  id?: string
  name: string
}

interface Asset {
  id: string
  assetCode: string
  serialNumber: string
  model: string
  status: string
  purchaseDate?: string
  createdAt?: string
  purchaseCost: number
  assetType?: AssetRelation
  assetMake?: AssetRelation
  vendor?: AssetRelation
}

interface StatusHistoryItem {
  id: string
  fromStatus?: string
  toStatus: string
  eventType: string
  effectiveAt: string
  remarks?: string
  performedBy?: string
  employeeName?: string
  employeeCode?: string
  department?: string
  location?: string
  returnedAt?: string
}

interface AllocationHistoryItem {
  id: string
  allocationDate: string
  returnedAt?: string | null
  remarks?: string
  employeeName?: unknown
  employeeCode?: unknown
  department?: unknown
  location?: unknown
  employee?: unknown
}

interface HistoryData {
  asset: Asset
  allocations: AllocationHistoryItem[]
  revocations: Record<string, unknown>[]
  retirements: Record<string, unknown>[]
  statusHistory: StatusHistoryItem[]
}

interface AuditItem {
  id: string
  action: string
  entity: string
  entityId?: string
  createdAt: string
  user?: {
    name: string
  }
}

type ReportTab = 'inventory' | 'history' | 'audit'
const PAGE_SIZE = 10

const formatStatus = (value?: string) => {
  if (!value) return 'Unknown'

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

const formatDateTime = (value?: string) => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const textValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value

  if (!value || typeof value !== 'object') {
    return undefined
  }

  const record = value as Record<string, unknown>

  return typeof record.name === 'string'
    ? record.name
    : undefined
}

const getStatusClass = (status?: string) => {
  const normalized = status
    ?.toUpperCase()
    .replaceAll(' ', '_')

  switch (normalized) {
    case 'IN_STOCK':
    case 'AVAILABLE':
    case 'ACTIVE':
      return 'reports-badge--success'

    case 'ALLOCATED':
    case 'ASSIGNED':
      return 'reports-badge--primary'

    case 'UNDER_REPAIR':
    case 'MAINTENANCE':
    case 'PENDING':
      return 'reports-badge--warning'

    case 'RETIRED':
    case 'DISPOSED':
    case 'INACTIVE':
      return 'reports-badge--danger'

    default:
      return 'reports-badge--neutral'
  }
}

const getActionClass = (action?: string) => {
  switch (action?.toUpperCase()) {
    case 'CREATE':
      return 'reports-badge--success'

    case 'UPDATE':
      return 'reports-badge--primary'

    case 'DELETE':
      return 'reports-badge--danger'

    default:
      return 'reports-badge--neutral'
  }
}

interface TabButtonProps {
  active: boolean
  icon: ReactNode
  label: string
  count?: number
  onClick: () => void
}

function TabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: TabButtonProps) {
  return (
    <button
      type="button"
      className={`reports-tab ${
        active ? 'reports-tab--active' : ''
      }`}
      onClick={onClick}
    >
      {icon}

      <span>{label}</span>

      {typeof count === 'number' && (
        <span className="reports-tab__count">
          {count}
        </span>
      )}
    </button>
  )
}

interface SearchFieldProps {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function SearchField({
  value,
  placeholder,
  onChange,
}: SearchFieldProps) {
  return (
    <div className="reports-search">
      <Search
        size={17}
        className="reports-search__icon"
      />

      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={event =>
          onChange(event.target.value)
        }
        aria-label={placeholder}
      />

      {value && (
        <button
          type="button"
          className="reports-search__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
}

function EmptyState({
  icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="reports-empty">
      <div className="reports-empty__icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  )
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) {
    return null
  }

  const start =
    (currentPage - 1) * pageSize + 1

  const end = Math.min(
    currentPage * pageSize,
    totalItems,
  )

  return (
    <div className="reports-pagination">
      <p>
        Showing <strong>{start}</strong>–
        <strong>{end}</strong> of{' '}
        <strong>{totalItems}</strong>
      </p>

      <div className="reports-pagination__actions">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() =>
            onPageChange(currentPage - 1)
          }
        >
          <ChevronLeft size={17} />
          Previous
        </button>

        <span>
          Page {currentPage} of{' '}
          {Math.max(totalPages, 1)}
        </span>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() =>
            onPageChange(currentPage + 1)
          }
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}

export default function Reports() {
  const { currency, rate, format: formatCurrency } = useCurrency()
  const exportMenuRef =
    useRef<HTMLDivElement>(null)

  const [tab, setTab] =
    useState<ReportTab>('inventory')

  const [assets, setAssets] =
    useState<Asset[]>([])

  const [audits, setAudits] =
    useState<AuditItem[]>([])

  const [history, setHistory] =
    useState<HistoryData | null>(null)

  const [
    selectedAssetId,
    setSelectedAssetId,
  ] = useState('')

  const [
    historyAssetSearch,
    setHistoryAssetSearch,
  ] = useState('')

  const [
    inventorySearch,
    setInventorySearch,
  ] = useState('')

  const [
    auditSearch,
    setAuditSearch,
  ] = useState('')

  const [
    inventoryPage,
    setInventoryPage,
  ] = useState(1)

  const [
    auditPage,
    setAuditPage,
  ] = useState(1)

  const [
    isInventoryLoading,
    setIsInventoryLoading,
  ] = useState(false)

  const [
    isAuditLoading,
    setIsAuditLoading,
  ] = useState(false)

  const [
    isHistoryLoading,
    setIsHistoryLoading,
  ] = useState(false)

  const [
    isPdfDownloading,
    setIsPdfDownloading,
  ] = useState(false)

  const [
    isExportChooserOpen,
    setIsExportChooserOpen,
  ] = useState(false)

  const [
    exportAssetId,
    setExportAssetId,
  ] = useState('')

  const [
    inventoryLoaded,
    setInventoryLoaded,
  ] = useState(false)

  const [
    auditLoaded,
    setAuditLoaded,
  ] = useState(false)

  const [error, setError] = useState('')

  const loadInventory =
    useCallback(async () => {
      try {
        setError('')
        setIsInventoryLoading(true)

        const response =
          await api.get<Asset[]>(
            '/reports/inventory',
          )

        setAssets(
          Array.isArray(response)
            ? response
            : [],
        )

        setInventoryLoaded(true)
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load inventory report.'

        setError(message)
      } finally {
        setIsInventoryLoading(false)
      }
    }, [])

  const loadAudits =
    useCallback(async () => {
      try {
        setError('')
        setIsAuditLoading(true)

        const response =
          await api.getPage<AuditItem>(
            '/reports/audit?page=1&limit=100',
          )

        setAudits(
          Array.isArray(response.data)
            ? response.data
            : [],
        )

        setAuditLoaded(true)
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load audit activity.'

        setError(message)
      } finally {
        setIsAuditLoading(false)
      }
    }, [])

  const loadAssetHistory =
    useCallback(
      async (assetId: string) => {
        if (!assetId) {
          setHistory(null)
          return
        }

        try {
          setError('')
          setHistory(null)
          setIsHistoryLoading(true)

          const response =
            await api.get<HistoryData>(
              `/reports/asset-history/${assetId}`,
            )

          setHistory(response)
        } catch (requestError) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'Unable to load asset history.'

          setError(message)
        } finally {
          setIsHistoryLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  useEffect(() => {
    if (
      tab === 'audit' &&
      !auditLoaded
    ) {
      void loadAudits()
    }
  }, [
    tab,
    auditLoaded,
    loadAudits,
  ])

  useEffect(() => {
    void loadAssetHistory(
      selectedAssetId,
    )
  }, [
    selectedAssetId,
    loadAssetHistory,
  ])

  useEffect(() => {
    setInventoryPage(1)
  }, [inventorySearch])

  useEffect(() => {
    setAuditPage(1)
  }, [auditSearch])

  /*
   * Close PDF export popup when the
   * user clicks anywhere outside it.
   *
   * Also closes when Escape is pressed.
   */
  useEffect(() => {
    if (!isExportChooserOpen) {
      return
    }

    const handleOutsideClick = (
      event: PointerEvent,
    ) => {
      const target =
        event.target as Node

      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(
          target,
        )
      ) {
        setIsExportChooserOpen(false)
      }
    }

    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setIsExportChooserOpen(false)
      }
    }

    document.addEventListener(
      'pointerdown',
      handleOutsideClick,
    )

    document.addEventListener(
      'keydown',
      handleEscape,
    )

    return () => {
      document.removeEventListener(
        'pointerdown',
        handleOutsideClick,
      )

      document.removeEventListener(
        'keydown',
        handleEscape,
      )
    }
  }, [isExportChooserOpen])

  const filteredAssets = useMemo(() => {
    const query =
      inventorySearch
        .trim()
        .toLowerCase()

    if (!query) {
      return assets
    }

    return assets.filter(asset => {
      const searchableValue = [
        formatAssetCode(
          asset.assetCode,
        ),
        asset.model,
        asset.serialNumber,
        asset.status,
        asset.assetType?.name,
        asset.assetMake?.name,
        asset.vendor?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableValue.includes(
        query,
      )
    })
  }, [assets, inventorySearch])

  const filteredAudits = useMemo(() => {
    const query =
      auditSearch
        .trim()
        .toLowerCase()

    if (!query) {
      return audits
    }

    return audits.filter(item => {
      const searchableValue = [
        item.user?.name,
        item.action,
        item.entity,
        item.entityId,
        item.createdAt,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableValue.includes(
        query,
      )
    })
  }, [audits, auditSearch])

  const auditSummary = useMemo(() => ({
    total: audits.length,
    created: audits.filter(item => item.action?.toUpperCase() === 'CREATE').length,
    updated: audits.filter(item => item.action?.toUpperCase() === 'UPDATE').length,
    deleted: audits.filter(item => item.action?.toUpperCase() === 'DELETE').length,
  }), [audits])

  const historyAssetOptions =
    useMemo(() => {
      const query =
        historyAssetSearch
          .trim()
          .toLowerCase()

      return assets.filter(
        asset =>
          !query ||
          [
            asset.model,
            asset.assetCode,
            asset.serialNumber,
            asset.assetType?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query),
      )
    }, [
      assets,
      historyAssetSearch,
    ])

  const inventoryTotalPages =
    Math.ceil(
      filteredAssets.length /
        PAGE_SIZE,
    )

  const auditTotalPages =
    Math.ceil(
      filteredAudits.length /
        PAGE_SIZE,
    )

  const paginatedAssets =
    useMemo(() => {
      const start =
        (inventoryPage - 1) *
        PAGE_SIZE

      return filteredAssets.slice(
        start,
        start + PAGE_SIZE,
      )
    }, [
      filteredAssets,
      inventoryPage,
    ])

  const paginatedAudits =
    useMemo(() => {
      const start =
        (auditPage - 1) *
        PAGE_SIZE

      return filteredAudits.slice(
        start,
        start + PAGE_SIZE,
      )
    }, [
      filteredAudits,
      auditPage,
    ])

  const inventorySummary =
    useMemo(() => {
      const totalValue =
        assets.reduce(
          (total, asset) =>
            total +
            (asset.purchaseCost ||
              0),
          0,
        )

      const inStock =
        assets.filter(asset =>
          [
            'IN_STOCK',
            'AVAILABLE',
          ].includes(
            asset.status?.toUpperCase(),
          ),
        ).length

      const allocated =
        assets.filter(
          asset =>
            asset.status?.toUpperCase() ===
            'ALLOCATED',
        ).length

      const retired =
        assets.filter(
          asset =>
            asset.status?.toUpperCase() ===
            'RETIRED',
        ).length

      return {
        totalValue,
        inStock,
        allocated,
        retired,
      }
    }, [assets])

  const convertedTotalValue = rate
    ? inventorySummary.totalValue * rate
    : null

  const sortedHistory =
    useMemo(() => {
      if (!history) {
        return []
      }

      const allocations =
        Array.isArray(
          history.allocations,
        )
          ? history.allocations
          : []

      const storedStatusHistory =
        Array.isArray(
          history.statusHistory,
        )
          ? history.statusHistory
          : []

      const hasCreatedEvent =
        storedStatusHistory.some(
          item =>
            item.eventType
              ?.toUpperCase() ===
            'CREATED',
        )

      const createdAt =
        history.asset.createdAt ||
        history.asset.purchaseDate

      const statusHistory:
        StatusHistoryItem[] =
        !hasCreatedEvent &&
        createdAt
          ? [
              ...storedStatusHistory,
              {
                id: `created-${history.asset.id}`,
                fromStatus: 'NEW',
                toStatus:
                  'IN_STOCK',
                eventType:
                  'CREATED',
                effectiveAt:
                  createdAt,
                remarks:
                  'Asset added to inventory',
              },
            ]
          : storedStatusHistory

      const allocationEvents:
        StatusHistoryItem[] =
        allocations.flatMap(
          allocation => {
            const legacyEmployee =
              allocation.employee &&
              typeof allocation.employee ===
                'object'
                ? (allocation.employee as Record<
                    string,
                    unknown
                  >)
                : undefined

            const employeeName =
              textValue(
                allocation.employeeName,
              ) ||
              textValue(
                legacyEmployee,
              )

            const employeeCode =
              textValue(
                allocation.employeeCode,
              ) ||
              (typeof legacyEmployee?.employeeId ===
              'string'
                ? legacyEmployee.employeeId
                : undefined)

            const department =
              textValue(
                allocation.department,
              ) ||
              textValue(
                legacyEmployee?.department,
              )

            const location =
              textValue(
                allocation.location,
              )

            const allocationStatus =
              statusHistory.find(
                item =>
                  item.eventType ===
                    'ALLOCATED' &&
                  Math.abs(
                    new Date(
                      item.effectiveAt,
                    ).getTime() -
                      new Date(
                        allocation.allocationDate,
                      ).getTime(),
                  ) < 60000,
              )

            const allocated:
              StatusHistoryItem = {
              id: `allocation-${allocation.id}`,
              fromStatus:
                'IN_STOCK',
              toStatus:
                'ALLOCATED',
              eventType:
                'ALLOCATED',
              effectiveAt:
                allocation.allocationDate,
              remarks:
                allocation.remarks,
              employeeName,
              employeeCode,
              department,
              location,
              returnedAt:
                allocation.returnedAt ||
                undefined,
              performedBy:
                allocationStatus?.performedBy,
            }

            if (
              !allocation.returnedAt
            ) {
              return [allocated]
            }

            const returnStatus =
              statusHistory.find(
                item =>
                  [
                    'RETURNED',
                    'REVOKED',
                  ].includes(
                    item.eventType,
                  ) &&
                  Math.abs(
                    new Date(
                      item.effectiveAt,
                    ).getTime() -
                      new Date(
                        allocation.returnedAt!,
                      ).getTime(),
                  ) < 60000,
              )

            return [
              allocated,
              {
                ...allocated,
                id: `return-${allocation.id}`,
                fromStatus:
                  'ALLOCATED',
                toStatus:
                  'IN_STOCK',
                eventType:
                  'RETURNED',
                effectiveAt:
                  allocation.returnedAt,
                performedBy:
                  returnStatus?.performedBy,
              },
            ]
          },
        )

      const detailedTypes =
        new Set(
          allocationEvents.map(
            item =>
              item.eventType,
          ),
        )

      const statusEvents =
        statusHistory.filter(
          item =>
            !detailedTypes.has(
              item.eventType,
            ),
        )

      return [
        ...statusEvents,
        ...allocationEvents,
      ].sort(
        (first, second) =>
          new Date(
            second.effectiveAt,
          ).getTime() -
          new Date(
            first.effectiveAt,
          ).getTime(),
      )
    }, [history])

  const handleRefresh = () => {
    if (tab === 'inventory') {
      void loadInventory()
      return
    }

    if (tab === 'audit') {
      void loadAudits()
      return
    }

    if (selectedAssetId) {
      void loadAssetHistory(
        selectedAssetId,
      )
    }
  }

  const handleDownloadPdf =
    async () => {
      try {
        setError('')
        setIsPdfDownloading(true)

        const report =
          await api.post<CompleteReportExport>(
            '/reports/complete-export',
            {
              assetId:
                exportAssetId ||
                null,
            },
          )

        await downloadCompleteReportPdf(
          report,
        )
      } catch (requestError) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to create the complete PDF report.',
        )
      } finally {
        setIsPdfDownloading(false)
      }
    }

  const handleDownloadAssetHistoryPdf =
    async () => {
      if (!history) return

      try {
        setError('')
        setIsPdfDownloading(true)

        await downloadAssetHistoryPdf({
          asset: {
            assetCode:
              formatAssetCode(
                history.asset
                  .assetCode,
              ),
            model:
              history.asset.model,
            serialNumber:
              history.asset
                .serialNumber,
            status:
              formatStatus(
                history.asset
                  .status,
              ),
            purchaseDate:
              history.asset
                .purchaseDate,
            purchaseCost:
              history.asset
                .purchaseCost,
            assetType:
              history.asset
                .assetType?.name,
            assetMake:
              history.asset
                .assetMake?.name,
            vendor:
              history.asset.vendor
                ?.name,
          },
          events: sortedHistory,
        })
      } catch (requestError) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to create the asset history PDF.',
        )
      } finally {
        setIsPdfDownloading(false)
      }
    }

  const currentLoading =
    tab === 'inventory'
      ? isInventoryLoading
      : tab === 'audit'
        ? isAuditLoading
        : isHistoryLoading

  return (
    <section className="reports-page">
      <header className="reports-header">
        <div>
          <p className="reports-header__eyebrow">
            Analytics and compliance
          </p>

          <h1>Reports</h1>

          <p className="reports-header__description">
            Review live inventory,
            asset lifecycle history and
            system audit activity.
          </p>
        </div>

        <div className="reports-header__actions">
          <div
            className="reports-export-menu"
            ref={exportMenuRef}
          >
            <button
              type="button"
              className="reports-download"
              onClick={() =>
                setIsExportChooserOpen(
                  open => !open,
                )
              }
              disabled={
                isPdfDownloading
              }
              aria-expanded={
                isExportChooserOpen
              }
              aria-controls="report-export-chooser"
            >
              <Download size={17} />
              Download PDF
            </button>

            {isExportChooserOpen && (
              <div
                id="report-export-chooser"
                className="reports-export-chooser"
                role="dialog"
                aria-label="PDF report options"
              >
                <div className="reports-export-chooser__header">
                  <div>
                    <span className="reports-export-chooser__eyebrow">
                      PDF export
                    </span>

                    <strong>
                      Choose report
                      content
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="reports-export-chooser__close"
                    onClick={() =>
                      setIsExportChooserOpen(
                        false,
                      )
                    }
                    aria-label="Close PDF report options"
                    title="Close"
                  >
                    <X
                      size={17}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <p>
                  Select one laptop
                  for its inventory,
                  history and audit
                  records, or leave it
                  on all assets.
                </p>

                <label htmlFor="report-export-asset">
                  Asset
                </label>

                <select
                  id="report-export-asset"
                  value={
                    exportAssetId
                  }
                  onChange={event =>
                    setExportAssetId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All assets —
                    complete report
                  </option>

                  {assets.map(
                    asset => (
                      <option
                        key={
                          asset.id
                        }
                        value={
                          asset.id
                        }
                      >
                        {formatAssetCode(
                          asset.assetCode,
                        )}{' '}
                        —{' '}
                        {asset.model ||
                          'Unnamed asset'}
                      </option>
                    ),
                  )}
                </select>

                <button
                  type="button"
                  className="reports-download reports-export-chooser__submit"
                  onClick={() =>
                    void handleDownloadPdf()
                  }
                  disabled={
                    isPdfDownloading
                  }
                >
                  {isPdfDownloading ? (
                    <LoaderCircle
                      size={16}
                      className="reports-spin"
                    />
                  ) : (
                    <Download
                      size={16}
                    />
                  )}

                  {isPdfDownloading
                    ? 'Preparing PDF...'
                    : exportAssetId
                      ? 'Download selected asset'
                      : 'Download complete report'}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="reports-refresh"
            onClick={handleRefresh}
            disabled={
              currentLoading
            }
          >
            <RefreshCw
              size={17}
              className={
                currentLoading
                  ? 'reports-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </header>

      <div
        className="reports-tabs"
        role="tablist"
      >
        <TabButton
          active={
            tab === 'inventory'
          }
          icon={
            <List size={17} />
          }
          label="Inventory"
          count={assets.length}
          onClick={() => {
            setError('')
            setTab('inventory')
          }}
        />

        <TabButton
          active={
            tab === 'history'
          }
          icon={
            <History size={17} />
          }
          label="Asset History"
          onClick={() => {
            setError('')
            setTab('history')
          }}
        />

        <TabButton
          active={
            tab === 'audit'
          }
          icon={
            <ShieldCheck
              size={17}
            />
          }
          label="Audit Log"
          count={
            audits.length ||
            undefined
          }
          onClick={() => {
            setError('')
            setTab('audit')
          }}
        />
      </div>

      {error && (
        <div
          className="reports-alert"
          role="alert"
        >
          <div className="reports-alert__content">
            <AlertCircle
              size={20}
            />

            <div>
              <strong>
                Something went
                wrong
              </strong>

              <p>{error}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
            aria-label="Dismiss error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="reports-inventory-view">
          <section className="reports-inventory-hero">
            <div className="reports-inventory-hero__copy">
              <div className="reports-inventory-hero__icon"><Package size={25} /></div>
              <div>
                <span>Inventory intelligence</span>
                <h2>Asset portfolio overview</h2>
                <p>Monitor availability, allocation and investment value from one place.</p>
              </div>
            </div>
            <div className="reports-inventory-hero__allocation">
              <div><span>Allocation rate</span><strong>{assets.length ? Math.round((inventorySummary.allocated / assets.length) * 100) : 0}%</strong></div>
              <div className="reports-inventory-hero__progress"><i style={{ width: `${assets.length ? Math.round((inventorySummary.allocated / assets.length) * 100) : 0}%` }} /></div>
              <small>{inventorySummary.allocated} of {assets.length} assets currently assigned</small>
            </div>
          </section>

          <div className="reports-summary">
            <article className="reports-summary-card reports-summary-card--total">
              <div className="reports-summary-card__icon">
                <Package
                  size={21}
                />
              </div>

              <div>
                <span>
                  Total assets
                </span>

                <strong>
                  {assets.length.toLocaleString()}
                </strong>
                <small>Registered devices</small>
              </div>
            </article>

            <article className="reports-summary-card reports-summary-card--stock">
              <div className="reports-summary-card__icon">
                <Laptop
                  size={21}
                />
              </div>

              <div>
                <span>
                  In stock
                </span>

                <strong>
                  {
                    inventorySummary.inStock
                  }
                </strong>
                <small>Ready to allocate</small>
              </div>
            </article>

            <article className="reports-summary-card reports-summary-card--allocated">
              <div className="reports-summary-card__icon">
                <UserRound
                  size={21}
                />
              </div>

              <div>
                <span>
                  Allocated
                </span>

                <strong>
                  {
                    inventorySummary.allocated
                  }
                </strong>
                <small>Currently assigned</small>
              </div>
            </article>

            <article className="reports-summary-card reports-summary-card--value">
              <div className="reports-summary-card__icon">
                <CircleDollarSign
                  size={21}
                />
              </div>

              <div className="reports-summary-card__currency-content">
                <div className="reports-summary-card__currency-heading">
                  <span>Total value</span>
                  <select
                    className="reports-currency-select"
                    aria-label="Display total value in currency"
                    value={currency}
                    onChange={event => setDisplayCurrency(event.target.value)}
                  >
                    {CURRENCY_OPTIONS.map(option => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <strong>
                  {convertedTotalValue === null
                    ? 'Rate unavailable'
                    : formatCurrency(inventorySummary.totalValue)}
                </strong>

                {currency !== 'PKR' && (
                  <small className="reports-currency-note">
                    {convertedTotalValue === null
                      ? 'Could not load the latest exchange rate.'
                      : 'Converted from PKR using the latest indicative rate'}
                  </small>
                )}
              </div>
            </article>
          </div>

          <div className="reports-panel reports-inventory-panel">
            <div className="reports-toolbar reports-inventory-toolbar">
              <SearchField
                value={
                  inventorySearch
                }
                placeholder="Search code, model, serial, type or vendor..."
                onChange={
                  setInventorySearch
                }
              />

              <div className="reports-result-count reports-inventory-result-count">
                <Package
                  size={16}
                />

                {
                  filteredAssets.length
                }{' '}
                result
                {filteredAssets.length !==
                1
                  ? 's'
                  : ''}
              </div>
            </div>

            {isInventoryLoading &&
            !inventoryLoaded ? (
              <div className="reports-loading">
                <LoaderCircle
                  size={30}
                  className="reports-spin"
                />

                <p>
                  Loading inventory
                  report...
                </p>
              </div>
            ) : paginatedAssets.length ===
              0 ? (
              <EmptyState
                icon={
                  <Package
                    size={27}
                  />
                }
                title={
                  inventorySearch
                    ? 'No matching assets'
                    : 'No inventory records'
                }
                description={
                  inventorySearch
                    ? 'Try searching with another asset code, model, serial number or vendor.'
                    : 'Inventory records will appear here when assets are available.'
                }
              />
            ) : (
              <>
                <div className="reports-table-wrapper">
                  <table className="reports-table reports-inventory-table">
                    <thead>
                      <tr>
                        <th>
                          Asset
                        </th>

                        <th>
                          Serial
                          Number
                        </th>

                        <th>
                          Type
                        </th>

                        <th>
                          Vendor
                        </th>

                        <th>
                          Status
                        </th>

                        <th className="reports-table__number">
                          Purchase
                          Cost
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedAssets.map(
                        asset => (
                          <tr
                            key={
                              asset.id
                            }
                            data-status={asset.status?.toUpperCase()}
                          >
                            <td>
                              <div className="reports-asset-cell">
                                <div className="reports-asset-cell__icon">
                                  <Laptop
                                    size={
                                      17
                                    }
                                  />
                                </div>

                                <div>
                                  <strong>
                                    {asset.model ||
                                      'Unnamed asset'}
                                  </strong>

                                  <span>
                                    {formatAssetCode(
                                      asset.assetCode,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span className="reports-monospace">
                                {asset.serialNumber ||
                                  '—'}
                              </span>
                            </td>

                            <td>
                              {asset
                                .assetType
                                ?.name ||
                                '—'}
                            </td>

                            <td>
                              {asset
                                .vendor
                                ?.name ||
                                '—'}
                            </td>

                            <td>
                              <span
                                className={`reports-badge ${getStatusClass(
                                  asset.status,
                                )}`}
                              >
                                {formatStatus(
                                  asset.status,
                                )}
                              </span>
                            </td>

                            <td className="reports-table__number reports-table__currency">
                              {formatCurrency(
                                asset.purchaseCost,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={
                    inventoryPage
                  }
                  totalPages={
                    inventoryTotalPages
                  }
                  totalItems={
                    filteredAssets.length
                  }
                  pageSize={
                    PAGE_SIZE
                  }
                  onPageChange={
                    setInventoryPage
                  }
                />
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="reports-history-layout">
          <aside className="reports-history-selector">
            <div className="reports-history-selector__header">
              <FileClock
                size={20}
              />

              <div>
                <h2>
                  Select an asset
                </h2>

                <p>
                  Choose an asset
                  to view its
                  lifecycle.
                </p>
              </div>
            </div>

            <label htmlFor="asset-history-search">
              1. Search and choose
              an asset
            </label>

            <div className="reports-asset-picker-search">
              <Search size={16} />

              <input
                id="asset-history-search"
                value={
                  historyAssetSearch
                }
                onChange={event =>
                  setHistoryAssetSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search model, asset ID or serial number"
              />
            </div>

            <div
              className="reports-asset-picker"
              role="listbox"
              aria-label="Available assets"
            >
              {historyAssetOptions.length ===
              0 ? (
                <div className="reports-asset-picker__empty">
                  No assets match
                  your search.
                </div>
              ) : (
                historyAssetOptions.map(
                  asset => {
                    const selected =
                      asset.id ===
                      selectedAssetId

                    return (
                      <button
                        key={
                          asset.id
                        }
                        type="button"
                        role="option"
                        aria-selected={
                          selected
                        }
                        className={
                          selected
                            ? 'is-selected'
                            : ''
                        }
                        onClick={() =>
                          setSelectedAssetId(
                            asset.id,
                          )
                        }
                      >
                        <span className="reports-asset-picker__icon">
                          <Laptop
                            size={
                              16
                            }
                          />
                        </span>

                        <span className="reports-asset-picker__text">
                          <strong>
                            {asset.model ||
                              'Unnamed asset'}
                          </strong>

                          <small>
                            {formatAssetCode(
                              asset.assetCode,
                            )}{' '}
                            ·{' '}
                            {formatStatus(
                              asset.status,
                            )}
                          </small>
                        </span>

                        {selected && (
                          <Check
                            size={
                              17
                            }
                          />
                        )}
                      </button>
                    )
                  },
                )
              )}
            </div>

            <div className="reports-history-selector__stats">
              <span>
                <Package
                  size={16}
                />

                {assets.length}{' '}
                assets available
              </span>

              <span>
                <Archive
                  size={16}
                />

                {
                  inventorySummary.retired
                }{' '}
                retired
              </span>
            </div>
          </aside>

          <div className="reports-history-content">
            {!selectedAssetId ? (
              <EmptyState
                icon={
                  <History
                    size={28}
                  />
                }
                title="Select an asset"
                description="Choose an asset from the list to review its complete status and lifecycle history."
              />
            ) : isHistoryLoading ? (
              <div className="reports-loading">
                <LoaderCircle
                  size={30}
                  className="reports-spin"
                />

                <p>
                  Loading asset
                  history...
                </p>
              </div>
            ) : history ? (
              <>
                <div className="reports-history-asset">
                  <div className="reports-history-asset__main">
                    <div className="reports-history-asset__icon">
                      <Laptop
                        size={24}
                      />
                    </div>

                    <div>
                      <p>
                        Asset
                        lifecycle
                      </p>

                      <h2>
                        {
                          history
                            .asset
                            .model
                        }
                      </h2>

                      <div className="reports-history-identifiers">
                        <span>
                          <b>
                            Asset ID
                          </b>

                          {formatAssetCode(
                            history
                              .asset
                              .assetCode,
                          )}
                        </span>

                        <span>
                          <b>
                            Serial
                            Number
                          </b>

                          {history
                            .asset
                            .serialNumber ||
                            '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="reports-history-asset__actions">
                    <span
                      className={`reports-badge ${getStatusClass(
                        history.asset
                          .status,
                      )}`}
                    >
                      {formatStatus(
                        history.asset
                          .status,
                      )}
                    </span>

                    <button
                      type="button"
                      className="reports-download reports-download--asset"
                      onClick={() =>
                        void handleDownloadAssetHistoryPdf()
                      }
                      disabled={
                        isPdfDownloading
                      }
                    >
                      {isPdfDownloading ? (
                        <LoaderCircle
                          size={
                            16
                          }
                          className="reports-spin"
                        />
                      ) : (
                        <Download
                          size={
                            16
                          }
                        />
                      )}

                      {isPdfDownloading
                        ? 'Preparing PDF...'
                        : 'Download this asset'}
                    </button>
                  </div>
                </div>

                <div className="reports-history-meta">
                  <div>
                    <span>
                      Asset type
                    </span>

                    <strong>
                      {history
                        .asset
                        .assetType
                        ?.name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Vendor
                    </span>

                    <strong>
                      {history
                        .asset
                        .vendor
                        ?.name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Purchase
                      cost
                    </span>

                    <strong>
                      {formatCurrency(
                        history
                          .asset
                          .purchaseCost,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      History
                      events
                    </span>

                    <strong>
                      {
                        sortedHistory.length
                      }
                    </strong>
                  </div>
                </div>

                {sortedHistory.length ===
                0 ? (
                  <EmptyState
                    icon={
                      <Clock3
                        size={
                          27
                        }
                      />
                    }
                    title="No history recorded"
                    description="No lifecycle or status changes have been recorded for this asset."
                  />
                ) : (
                  <div className="reports-timeline">
                    {sortedHistory.map(
                      (
                        item,
                        index,
                      ) => (
                        <article
                          key={
                            item.id
                          }
                          className="reports-timeline-item"
                        >
                          <div className="reports-timeline-item__rail">
                            <span className="reports-timeline-item__dot" />

                            {index <
                              sortedHistory.length -
                                1 && (
                              <span className="reports-timeline-item__line" />
                            )}
                          </div>

                          <div className="reports-timeline-item__content">
                            <div className="reports-timeline-item__header">
                              <div>
                                <strong>
                                  {formatStatus(
                                    item.eventType,
                                  )}
                                </strong>

                                <span>
                                  {formatDateTime(
                                    item.effectiveAt,
                                  )}
                                </span>
                              </div>

                              <span
                                className={`reports-badge ${getStatusClass(
                                  item.toStatus,
                                )}`}
                              >
                                {formatStatus(
                                  item.toStatus,
                                )}
                              </span>
                            </div>

                            <div className="reports-status-change">
                              <span>
                                {formatStatus(
                                  item.fromStatus ||
                                    'NEW',
                                )}
                              </span>

                              <span className="reports-status-change__arrow">
                                →
                              </span>

                              <span>
                                {formatStatus(
                                  item.toStatus,
                                )}
                              </span>
                            </div>

                            {item.remarks && (
                              <p className="reports-timeline-item__remarks">
                                {
                                  item.remarks
                                }
                              </p>
                            )}

                            {(item.employeeName ||
                              item.department ||
                              item.location ||
                              item.performedBy) && (
                              <div className="reports-history-details">
                                {item.employeeName && (
                                  <span>
                                    <b>
                                      Employee
                                    </b>

                                    {
                                      item.employeeName
                                    }

                                    {item.employeeCode
                                      ? ` (${item.employeeCode})`
                                      : ''}
                                  </span>
                                )}

                                {item.department && (
                                  <span>
                                    <b>
                                      Department
                                    </b>

                                    {
                                      item.department
                                    }
                                  </span>
                                )}

                                {item.location && (
                                  <span>
                                    <b>
                                      Location
                                    </b>

                                    {
                                      item.location
                                    }
                                  </span>
                                )}

                                {item.performedBy && (
                                  <span>
                                    <b>
                                      Performed
                                      by
                                    </b>

                                    {
                                      item.performedBy
                                    }
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={
                  <AlertCircle
                    size={27}
                  />
                }
                title="History unavailable"
                description="The selected asset history could not be displayed."
              />
            )}
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="reports-audit-view">
          <section className="reports-audit-hero">
            <div className="reports-audit-hero__copy">
              <div className="reports-audit-hero__icon">
                <ShieldCheck size={24} />
              </div>
              <div>
                <span>Security & accountability</span>
                <h2>Audit activity</h2>
                <p>A clear record of changes made across your inventory system.</p>
              </div>
            </div>
            <div className="reports-audit-hero__pulse">
              <i /> Live activity log
            </div>
          </section>

          <section className="reports-audit-metrics" aria-label="Audit activity summary">
            {[
              { label: 'All events', value: auditSummary.total, icon: <Activity size={18} />, tone: 'all' },
              { label: 'Created', value: auditSummary.created, icon: <Plus size={18} />, tone: 'created' },
              { label: 'Updated', value: auditSummary.updated, icon: <PencilLine size={18} />, tone: 'updated' },
              { label: 'Deleted', value: auditSummary.deleted, icon: <Trash2 size={18} />, tone: 'deleted' },
            ].map(metric => (
              <article key={metric.label} className={`reports-audit-metric reports-audit-metric--${metric.tone}`}>
                <div>{metric.icon}</div>
                <span>{metric.label}</span>
                <strong>{metric.value.toLocaleString()}</strong>
              </article>
            ))}
          </section>

          <div className="reports-panel reports-audit-panel">
          <div className="reports-toolbar reports-audit-toolbar">
            <SearchField
              value={
                auditSearch
              }
              placeholder="Search user, action, entity or entity ID..."
              onChange={
                setAuditSearch
              }
            />

            <div className="reports-result-count reports-audit-result-count">
              <ShieldCheck
                size={16}
              />

              {
                filteredAudits.length
              }{' '}
              event
              {filteredAudits.length !==
              1
                ? 's'
                : ''}
            </div>
          </div>

          {isAuditLoading &&
          !auditLoaded ? (
            <div className="reports-loading">
              <LoaderCircle
                size={30}
                className="reports-spin"
              />

              <p>
                Loading audit
                activity...
              </p>
            </div>
          ) : paginatedAudits.length ===
            0 ? (
            <EmptyState
              icon={
                <ShieldCheck
                  size={27}
                />
              }
              title={
                auditSearch
                  ? 'No matching audit events'
                  : 'No audit activity'
              }
              description={
                auditSearch
                  ? 'Try searching with another user, action, entity or identifier.'
                  : 'System activity will appear here when audit events are recorded.'
              }
            />
          ) : (
            <>
              <div className="reports-table-wrapper">
                <table className="reports-table reports-audit-table">
                  <thead>
                    <tr>
                      <th>
                        Date and
                        Time
                      </th>

                      <th>
                        User
                      </th>

                      <th>
                        Action
                      </th>

                      <th>
                        Entity
                      </th>

                      <th>
                        Entity ID
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedAudits.map(
                      item => (
                        <tr
                          key={
                            item.id
                          }
                          data-action={item.action?.toUpperCase()}
                        >
                          <td>
                            <div className="reports-date-cell">
                              <Clock3
                                size={
                                  16
                                }
                              />

                              {formatDateTime(
                                item.createdAt,
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="reports-user-cell">
                              <div className="reports-user-cell__avatar">
                                {(
                                  item
                                    .user
                                    ?.name ||
                                  'S'
                                )
                                  .charAt(
                                    0,
                                  )
                                  .toUpperCase()}
                              </div>

                              <span>
                                {item
                                  .user
                                  ?.name ||
                                  'System'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`reports-badge ${getActionClass(
                                item.action,
                              )}`}
                            >
                              {formatStatus(
                                item.action,
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="reports-entity">
                              {formatStatus(
                                item.entity,
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className="reports-monospace reports-entity-id"
                              title={
                                item.entityId ||
                                'No entity ID'
                              }
                            >
                              {item.entityId ||
                                '—'}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={
                  auditPage
                }
                totalPages={
                  auditTotalPages
                }
                totalItems={
                  filteredAudits.length
                }
                pageSize={
                  PAGE_SIZE
                }
                onPageChange={
                  setAuditPage
                }
              />
            </>
          )}
          </div>
        </div>
      )}
    </section>
  )
}
