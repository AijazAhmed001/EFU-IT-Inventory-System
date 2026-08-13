import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  Monitor,
  Users,
  CheckCircle,
  AlertTriangle,
  PackageX,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarDays,
  RefreshCw,
  Activity,
  Boxes,
  ShieldCheck,
} from "lucide-react"
import { api, loadSession } from "../../../lib/api"
import { useCurrency } from "../../../utils/currency"

interface DashboardData {
  stats: {
    total: number
    inStock: number
    allocated: number
    retired: number
    expiring: number
    warrantyExpiring: number
  }
  monthlyTrend: {
    month: string
    purchases: number
    allocations: number
    returns: number
  }[]
  departmentDistribution: {
    dept: string
    assets: number
  }[]
  assetDistribution: {
    name: string
    value: number
  }[]
  warrantyTrend: {
    month: string
    expiring: number
  }[]
  recentAllocations: {
    id: string
    allocationDate: string
    asset?: {
      model: string
      status: string
    }
    employee?: {
      name: string
      department?: string
    }
  }[]
  latestAssets: {
    id: string
    model: string
    type: string
    vendor?: string
    purchaseCost: number
    createdAt: string
  }[]
}

interface DashboardProps {
  onNavigate: (screen: string) => void
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: string | number
  sub?: string
  color: string
  trend?: {
    value: string
    up: boolean
  }
}

const CARD_SHADOW = "0 8px 24px rgba(15, 23, 42, 0.05)"
const CARD_SHADOW_HOVER = "0 14px 30px rgba(15, 23, 42, 0.09)"
const BLUE = "#005BAC"

const formatStatus = (value?: string) => {
  if (!value) return "Unknown"

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

const formatDate = (value?: string) => {
  if (!value) return "—"

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "—"
  }

  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: StatCardProps) {
  return (
    <article
      style={{
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
        background: "var(--surface)",
        borderRadius: 18,
        padding: "20px 22px",
        border: `1px solid ${color}24`,
        borderTop: `3px solid ${color}`,
        boxShadow: CARD_SHADOW,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
        minHeight: 150,
        transition:
          "transform 180ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)"
        event.currentTarget.style.boxShadow = CARD_SHADOW_HOVER
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)"
        event.currentTarget.style.boxShadow = CARD_SHADOW
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            flex: "0 0 46px",
            borderRadius: 14,
            background: `${color}18`,
            display: "grid",
            placeItems: "center",
            color,
          }}
        >
          {icon}
        </div>

        {trend && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: trend.up ? "#16A34A" : "#DC2626",
              whiteSpace: "nowrap",
            }}
          >
            {trend.up ? (
              <TrendingUp size={13} />
            ) : (
              <TrendingDown size={13} />
            )}
            {trend.value}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 760,
            color: "var(--text-primary)",
            lineHeight: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginTop: 5,
            fontWeight: 600,
          }}
        >
          {label}
        </div>

        {sub && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 3,
              lineHeight: 1.45,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </article>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section
      style={{
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
        background: "var(--surface)",
        borderRadius: 18,
        border: "1px solid var(--border)",
        boxShadow: CARD_SHADOW,
        overflow: "hidden",
        transition:
          "background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
      }}
    >
      <div
        style={{
          padding: "17px 20px",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.35,
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                marginTop: 3,
                fontSize: 11,
                color: "var(--text-tertiary)",
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ flex: "0 0 auto" }}>{action}</div>
      </div>

      <div style={{ padding: 20, minWidth: 0 }}>{children}</div>
    </section>
  )
}

function EmptyPanel({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      style={{
        minHeight: 220,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div
          style={{
            width: 48,
            height: 48,
            margin: "0 auto 12px",
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: "rgba(0, 91, 172, 0.08)",
            color: BLUE,
          }}
        >
          <Activity size={22} />
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            maxWidth: 320,
            marginTop: 5,
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--text-secondary)",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  )
}

function ViewAllButton({
  onClick,
  children = "View All",
}: {
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: BLUE,
        background: "transparent",
        border: 0,
        cursor: "pointer",
        fontWeight: 650,
        padding: "5px 0",
      }}
    >
      {children}
      <ArrowRight size={13} />
    </button>
  )
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { format: formatCurrency } = useCurrency()
  const session = loadSession(false)
  const isViewer = session?.user.role === "VIEWER"

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadDashboard = useCallback(async (showRefresh = false) => {
    try {
      setError("")

      if (showRefresh) {
        setIsRefreshing(true)
      }

      const response = await api.get<DashboardData>("/dashboard")
      setDashboard(response)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load dashboard data.",
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const currentDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  )

  const greeting = useMemo(() => {
    const hour = new Date().getHours()

    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }, [])

  const displayName =
    session?.user?.name?.trim() || "System Administrator"

  const palette = [
    "#005BAC",
    "#0070CC",
    "#3B82F6",
    "#60A5FA",
    "#93C5FD",
    "#BFDBFE",
    "#64748B",
  ]

  const assetDistribution = useMemo(() => {
    if (!dashboard) return []

    const sortedDistribution = [...dashboard.assetDistribution].sort(
      (left, right) => right.value - left.value,
    )

    const primaryDistribution = sortedDistribution.slice(0, 6)
    const remainingDistribution = sortedDistribution.slice(6)

    const groupedDistribution = remainingDistribution.length
      ? [
          ...primaryDistribution,
          {
            name: "Other",
            value: remainingDistribution.reduce(
              (total, item) => total + item.value,
              0,
            ),
          },
        ]
      : primaryDistribution

    return groupedDistribution.map((item, index) => ({
      ...item,
      color:
        item.name === "Other"
          ? "#64748B"
          : palette[index % 6],
    }))
  }, [dashboard])

  const remainingDistributionCount = useMemo(() => {
    if (!dashboard) return 0
    return Math.max(0, dashboard.assetDistribution.length - 6)
  }, [dashboard])

  const recentAllocations = useMemo(() => {
    if (!dashboard) return []

    return dashboard.recentAllocations.map((item) => ({
      id: item.id,
      asset: item.asset?.model || "Unknown asset",
      employee: item.employee?.name || "—",
      dept: item.employee?.department || "—",
      date: formatDate(item.allocationDate),
      status: formatStatus(item.asset?.status || "ALLOCATED"),
    }))
  }, [dashboard])

  const latestAssets = useMemo(() => {
    if (!dashboard) return []

    return dashboard.latestAssets.map((item) => ({
      id: item.id,
      name: item.model || "Unnamed asset",
      type: item.type || "—",
      vendor: item.vendor || "—",
      cost: formatCurrency(item.purchaseCost),
      date: formatDate(item.createdAt),
    }))
  }, [dashboard])

  if (error && !dashboard) {
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 12,
          border: "1px solid #FECACA",
          background: "#FEF2F2",
          color: "#B91C1C",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <strong style={{ display: "block", fontSize: 14 }}>
            Dashboard could not be loaded
          </strong>
          <span style={{ display: "block", marginTop: 4, fontSize: 12 }}>
            {error}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          style={{
            border: "1px solid #FCA5A5",
            background: "#fff",
            color: "#B91C1C",
            borderRadius: 9,
            padding: "8px 11px",
            cursor: "pointer",
            fontWeight: 650,
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div
        className="dashboard-skeleton"
        aria-label="Dashboard data is loading"
      >
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div className="dashboard-skeleton__card" key={item} />
        ))}
      </div>
    )
  }

  const {
    stats,
    monthlyTrend: monthlyData,
    departmentDistribution: departmentData,
    warrantyTrend,
  } = dashboard

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        width: "100%",
        maxWidth: 1680,
        minWidth: 0,
        margin: "0 auto",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 8,
              fontSize: 11,
              fontWeight: 700,
              color: BLUE,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
            }}
          >
            <ShieldCheck size={14} />
            Inventory overview
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 760,
              color: "var(--text-primary)",
              margin: 0,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
            }}
          >
            Dashboard
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
            }}
          >
            {greeting}, {displayName}.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 10,
              fontSize: 12,
              color: "var(--text-tertiary)",
            }}
          >
            <CalendarDays size={14} />
            {currentDate}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={isRefreshing}
            title="Refresh dashboard"
            aria-label="Refresh dashboard"
            style={{
              minHeight: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text-secondary)",
              cursor: isRefreshing ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 650,
              opacity: isRefreshing ? 0.65 : 1,
            }}
          >
            <RefreshCw
              size={16}
              style={
                isRefreshing
                  ? { animation: "dashboard-refresh-spin 0.8s linear infinite" }
                  : undefined
              }
            />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            padding: "11px 13px",
            border: "1px solid #FECACA",
            borderRadius: 10,
            background: "#FEF2F2",
            color: "#B91C1C",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Statistics */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
          gap: 16,
          width: "100%",
          minWidth: 0,
        }}
      >
        <StatCard
          icon={<Monitor size={21} />}
          label="Total Assets"
          value={stats.total}
          sub="All registered assets"
          color="#005BAC"
        />

        <StatCard
          icon={<CheckCircle size={21} />}
          label="Allocated"
          value={stats.allocated}
          sub="Currently assigned"
          color="#16A34A"
        />

        <StatCard
          icon={<Users size={21} />}
          label="IT Stock"
          value={stats.inStock}
          sub="Available to allocate"
          color="#0070CC"
        />

        <StatCard
          icon={<AlertTriangle size={21} />}
          label="Warranty Expiring"
          value={stats.warrantyExpiring}
          sub="Within the next 30 days"
          color="#F59E0B"
        />

        <StatCard
          icon={<PackageX size={21} />}
          label="Expiring"
          value={stats.expiring}
          sub="Lifecycle expiry within 30 days"
          color="#DC2626"
        />

        <StatCard
          icon={<Clock size={21} />}
          label="Retired"
          value={stats.retired}
          sub="Decommissioned assets"
          color="#6B7280"
        />
      </section>

      {/* Primary analytics */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
          gap: 20,
          width: "100%",
          minWidth: 0,
        }}
      >
        <SectionCard
          title="Monthly Purchase & Allocation Trend"
          subtitle="Purchases, allocations and returns by month"
        >
          {monthlyData.length === 0 ? (
            <EmptyPanel
              title="No monthly activity yet"
              description="Purchase, allocation and return trends will appear after inventory activity is recorded."
            />
          ) : (
            <div style={{ width: "100%", minWidth: 0, height: 270 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={12}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="purchases"
                    name="Purchases"
                    fill="#005BAC"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="allocations"
                    name="Allocations"
                    fill="#60A5FA"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="returns"
                    name="Returns"
                    fill="#16A34A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Department-wise Assets"
          subtitle="Current asset allocation by department"
        >
          {departmentData.length === 0 ? (
            <EmptyPanel
              title="No department allocation data"
              description="Department-wise totals will appear after assets are assigned to employees."
            />
          ) : (
            <div style={{ width: "100%", minWidth: 0, height: 270 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  barSize={14}
                  margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="dept"
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="assets"
                    fill="#005BAC"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Asset Distribution"
          subtitle="Largest asset categories in the inventory"
        >
          {assetDistribution.length === 0 ? (
            <EmptyPanel
              title="No asset distribution yet"
              description="Asset categories will appear after inventory records are added."
            />
          ) : (
            <>
              <div style={{ width: "100%", minWidth: 0, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetDistribution.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--surface-raised)",
                        color: "var(--text-primary)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "7px 12px",
                  marginTop: 8,
                }}
              >
                {assetDistribution.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: item.color,
                        flexShrink: 0,
                      }}
                    />

                    <span
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {item.name}
                    </span>

                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {remainingDistributionCount > 0 && (
                <p
                  style={{
                    margin: "11px 0 0",
                    color: "var(--text-tertiary)",
                    fontSize: 10,
                    textAlign: "center",
                    lineHeight: 1.45,
                  }}
                >
                  Showing the 6 largest asset types;{" "}
                  {remainingDistributionCount} smaller type
                  {remainingDistributionCount === 1 ? "" : "s"} grouped as
                  Other.
                </p>
              )}
            </>
          )}
        </SectionCard>
      </section>

      {/* Warranty + quick actions */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isViewer
            ? "minmax(0, 1fr)"
            : "minmax(0, 2fr) minmax(min(100%, 285px), 1fr)",
          gap: 20,
          width: "100%",
          minWidth: 0,
        }}
      >
        <SectionCard
          title="Warranty Expiry Trend"
          subtitle="Expected warranty expirations over the next 6 months"
        >
          {warrantyTrend.length === 0 ? (
            <EmptyPanel
              title="No warranty expiry data"
              description="Warranty trends will appear when assets have recorded warranty expiry dates."
            />
          ) : (
            <div style={{ width: "100%", minWidth: 0, height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={warrantyTrend}>
                  <defs>
                    <linearGradient
                      id="warranty-area-gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#F59E0B"
                        stopOpacity={0.22}
                      />
                      <stop
                        offset="95%"
                        stopColor="#F59E0B"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--chart-grid)"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 11,
                      fill: "var(--text-secondary)",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface-raised)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expiring"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#warranty-area-gradient)"
                    name="Expiring Assets"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        {!isViewer && (
          <section
            style={{
              minWidth: 0,
              width: "100%",
              boxSizing: "border-box",
              background: "var(--surface)",
              borderRadius: 18,
              border: "1px solid var(--border)",
              boxShadow: CARD_SHADOW,
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 5,
                color: "var(--text-primary)",
              }}
            >
              <Boxes size={17} color={BLUE} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Quick Actions
              </span>
            </div>

            <p
              style={{
                margin: "0 0 16px",
                fontSize: 11,
                color: "var(--text-tertiary)",
                lineHeight: 1.5,
              }}
            >
              Open common inventory operations.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                {
                  label: "Allocate Asset",
                  icon: "👤",
                  screen: "asset-allocation",
                  color: "#16A34A",
                },
                {
                  label: "Return Asset",
                  icon: "↩️",
                  screen: "asset-revocation",
                  color: "#F59E0B",
                },
                {
                  label: "Generate Report",
                  icon: "📊",
                  screen: "asset-history",
                  color: "#6B7280",
                },
              ].map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onNavigate(action.screen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 14px",
                    borderRadius: 12,
                    border: `1px solid ${action.color}25`,
                    background: `${action.color}09`,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                    minWidth: 0,
                    transition:
                      "transform 150ms ease, border-color 150ms ease, background 150ms ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform = "translateX(2px)"
                    event.currentTarget.style.borderColor = `${action.color}55`
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform = "translateX(0)"
                    event.currentTarget.style.borderColor = `${action.color}25`
                  }}
                >
                  <span style={{ fontSize: 18, flex: "0 0 auto" }}>
                    {action.icon}
                  </span>

                  <span
                    style={{
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      flex: 1,
                    }}
                  >
                    {action.label}
                  </span>

                  <ArrowRight
                    size={14}
                    color={action.color}
                    style={{ flex: "0 0 auto" }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

      {/* Tables */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 500px), 1fr))",
          gap: 20,
          width: "100%",
          minWidth: 0,
        }}
      >
        <SectionCard
          title="Recent Allocations"
          subtitle="Latest assets assigned to employees"
          action={
            !isViewer ? (
              <ViewAllButton
                onClick={() => onNavigate("allocations")}
              />
            ) : undefined
          }
        >
          {recentAllocations.length === 0 ? (
            <EmptyPanel
              title="No recent allocations"
              description="Recent employee asset allocations will appear here."
            />
          ) : (
            <div
              style={{
                width: "100%",
                minWidth: 0,
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 650,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Asset",
                      "Employee",
                      "Department",
                      "Date",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          textAlign: "left",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-tertiary)",
                          padding: "0 10px 10px 0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {recentAllocations.map((row) => (
                    <tr
                      key={row.id}
                      style={{
                        borderTop: "1px solid var(--border-soft)",
                      }}
                    >
                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.asset}
                      </td>

                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 12,
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.employee}
                      </td>

                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {row.dept}
                      </td>

                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.date}
                      </td>

                      <td style={{ padding: "11px 0" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 8px",
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "#DCFCE7",
                            color: "#15803D",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Latest Assets Added"
          subtitle="Most recently registered inventory"
          action={
            !isViewer ? (
              <ViewAllButton onClick={() => onNavigate("assets")} />
            ) : undefined
          }
        >
          {latestAssets.length === 0 ? (
            <EmptyPanel
              title="No assets added yet"
              description="Recently created assets will appear here."
            />
          ) : (
            <div
              style={{
                width: "100%",
                minWidth: 0,
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 650,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Asset",
                      "Type",
                      "Vendor",
                      "Cost",
                      "Date",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          textAlign: "left",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--text-tertiary)",
                          padding: "0 10px 10px 0",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {latestAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      style={{
                        borderTop: "1px solid var(--border-soft)",
                      }}
                    >
                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {asset.name}
                      </td>

                      <td style={{ padding: "11px 10px 11px 0" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "4px 8px",
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "#EBF4FF",
                            color: BLUE,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {asset.type}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {asset.vendor}
                      </td>

                      <td
                        style={{
                          padding: "11px 10px 11px 0",
                          fontSize: 12,
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {asset.cost}
                      </td>

                      <td
                        style={{
                          padding: "11px 0",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {asset.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>

      <style>
        {`
          @keyframes dashboard-refresh-spin {
            to {
              transform: rotate(360deg);
            }
          }

          @media (max-width: 900px) {
            .dashboard-skeleton {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 620px) {
            .dashboard-skeleton {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>
    </main>
  )
}
