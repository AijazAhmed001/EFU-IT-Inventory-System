import { useEffect, useRef, useState } from "react"
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Building2,
  MapPin,
  Map,
  Users,
  Briefcase,
  Building,
  ClipboardList,
  PackagePlus,
  PackageCheck,
  PackageX,
  Clock,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  Check,
  Search,
  Moon,
  Sun,
  UserCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  FileText,
  Layers,
} from "lucide-react"
import { api, loadSession } from "../../lib/api"
import { hasPermission, screenPermission } from "../../auth/permissions"

type Screen = "dashboard" | "assets" | "asset-type" | "asset-make" | "motherboard" | "memory" | "storage" | "operating-system" | "vendor" | "province" | "city" | "location" | "department" | "office" | "employee" | "lifecycle-policy" | "new-asset" | "allocations" | "asset-allocation" | "asset-revocation" | "asset-expiration" | "asset-history" | "settings" | "profile" | "notifications" | "asset-details"

interface Props {
  currentScreen: Screen
  onNavigate: (screen: Screen) => void
  onLogout: () => void
  children: React.ReactNode
}

interface NavItem {
  label: string
  screen?: Screen
  icon: React.ReactNode
  children?: { label: string; screen: Screen; icon: React.ReactNode }[]
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    screen: "dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  { label: "All Assets", screen: "assets", icon: <Monitor size={18} /> },
  {
    label: "Master Setup",
    icon: <Layers size={18} />,
    children: [
      {
        label: "Asset Type",
        screen: "asset-type",
        icon: <Monitor size={16} />,
      },
      { label: "Asset Make", screen: "asset-make", icon: <Shield size={16} /> },
      { label: "Motherboard", screen: "motherboard", icon: <Cpu size={16} /> },
      { label: "Memory", screen: "memory", icon: <MemoryStick size={16} /> },
      { label: "Storage", screen: "storage", icon: <HardDrive size={16} /> },
      {
        label: "Operating System",
        screen: "operating-system",
        icon: <Server size={16} />,
      },
      { label: "Vendor", screen: "vendor", icon: <Building2 size={16} /> },
      { label: "Province", screen: "province", icon: <Map size={16} /> },
      { label: "City", screen: "city", icon: <MapPin size={16} /> },
      { label: "Location", screen: "location", icon: <MapPin size={16} /> },
      {
        label: "Department",
        screen: "department",
        icon: <Briefcase size={16} />,
      },
      { label: "Office", screen: "office", icon: <Building size={16} /> },
      { label: "Employee", screen: "employee", icon: <Users size={16} /> },
      {
        label: "Lifecycle Policy",
        screen: "lifecycle-policy",
        icon: <ClipboardList size={16} />,
      },
    ],
  },
  {
    label: "Transactions",
    icon: <FileText size={18} />,
    children: [
      {
        label: "New Asset",
        screen: "new-asset",
        icon: <PackagePlus size={16} />,
      },
      {
        label: "Asset Allocation",
        screen: "asset-allocation",
        icon: <PackageCheck size={16} />,
      },
      {
        label: "Allocation History",
        screen: "allocations",
        icon: <ClipboardList size={16} />,
      },
      {
        label: "Asset Revocation",
        screen: "asset-revocation",
        icon: <PackageX size={16} />,
      },
      {
        label: "Asset Expiration",
        screen: "asset-expiration",
        icon: <Clock size={16} />,
      },
    ],
  },
  {
    label: "Reports",
    icon: <BarChart2 size={18} />,
    children: [
      {
        label: "Asset History",
        screen: "asset-history",
        icon: <BarChart2 size={16} />,
      },
    ],
  },
  { label: "Settings", screen: "settings", icon: <Settings size={18} /> },
]

export default function Layout({
  currentScreen,
  onNavigate,
  onLogout,
  children,
}: Props) {
  const user = loadSession(false)?.user
  const isViewer = user?.role === "VIEWER"
  const visibleNavItems = navItems.map(item => item.children
    ? { ...item, children: item.children.filter(child => !screenPermission[child.screen] || hasPermission(screenPermission[child.screen])) }
    : item).filter(item => item.children ? item.children.length > 0 : !item.screen || !screenPermission[item.screen] || hasPermission(screenPermission[item.screen]))
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  const [unreadCount, setUnreadCount] = useState(0)
  useEffect(() => {
    if (!hasPermission('notifications.view')) {
      setUnreadCount(0)
      return
    }
    api
      .get<{ readAt?: string | null }[]>("/notifications")
      .then((items) =>
        setUnreadCount(items.filter((item) => !item.readAt).length),
      )
      .catch(() => undefined)
  }, [currentScreen, isViewer])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    "Master Setup": true,
    Transactions: true,
    Reports: true,
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logoHovered, setLogoHovered] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme =
      localStorage.getItem("efu.appTheme") ||
      localStorage.getItem("efu.loginTheme")
    return savedTheme === "dark"
  })
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const notificationMenuRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const theme = darkMode ? "dark" : "light"
    localStorage.setItem("efu.appTheme", theme)
    document.documentElement.style.colorScheme = theme

    return () => {
      document.documentElement.style.colorScheme = ""
    }
  }, [darkMode])

  useEffect(() => {
    const closeMenusOnOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node

      if (
        notifOpen &&
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target)
      ) {
        setNotifOpen(false)
      }

      if (
        profileOpen &&
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target)
      ) {
        setProfileOpen(false)
      }
    }

    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotifOpen(false)
        setProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", closeMenusOnOutsideInteraction)
    document.addEventListener("touchstart", closeMenusOnOutsideInteraction)
    document.addEventListener("keydown", closeMenusOnEscape)

    return () => {
      document.removeEventListener("mousedown", closeMenusOnOutsideInteraction)
      document.removeEventListener("touchstart", closeMenusOnOutsideInteraction)
      document.removeEventListener("keydown", closeMenusOnEscape)
    }
  }, [notifOpen, profileOpen])

  const toggleGroup = (label: string) => {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }))
  }

  const isActiveInGroup = (item: NavItem) =>
    item.children?.some((c) => c.screen === currentScreen)

  return (
    <div
      className="app-shell"
      data-theme={darkMode ? "dark" : "light"}
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--app-bg)",
      }}
    >
      {/* Sidebar */}
      <aside
        className="app-sidebar"
        style={{
          width: sidebarOpen ? 282 : 76,
          minWidth: sidebarOpen ? 282 : 76,
          background:
            "linear-gradient(180deg, #06345f 0%, #074b83 48%, #0a5f9f 100%)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.24s ease, min-width 0.24s ease",
          overflow: "hidden",
          zIndex: 40,
          flexShrink: 0,
          boxShadow: "6px 0 24px rgba(0, 31, 67, 0.14)",
        }}
      >
        {/* Logo and sidebar control */}
        <div
          style={{
            height: 64,
            padding: sidebarOpen ? "0 12px 0 18px" : "0 14px",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarOpen ? "space-between" : "center",
            gap: 8,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            title={
              !sidebarOpen ? "Open sidebar" : "EFU General IT Inventory System"
            }
            aria-label={
              !sidebarOpen ? "Open sidebar" : "EFU General IT Inventory System"
            }
            onClick={() => {
              if (!sidebarOpen) {
                setSidebarOpen(true)
                setLogoHovered(false)
              }
            }}
            onMouseEnter={() => {
              if (!sidebarOpen) setLogoHovered(true)
            }}
            onMouseLeave={() => {
              if (!sidebarOpen) setLogoHovered(false)
            }}
            style={{
              flex: sidebarOpen ? 1 : "initial",
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              gap: 12,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: sidebarOpen ? "default" : "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background:
                  !sidebarOpen && logoHovered
                    ? "rgba(255,255,255,0.16)"
                    : "#ffffff",
                border:
                  !sidebarOpen && logoHovered
                    ? "1px solid rgba(255,255,255,0.22)"
                    : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
                position: "relative",
                boxShadow:
                  !sidebarOpen && logoHovered
                    ? "none"
                    : "0 6px 18px rgba(0,0,0,0.18)",
                transition:
                  "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
                transform:
                  !sidebarOpen && logoHovered ? "scale(1.04)" : "scale(1)",
              }}
            >
              {!sidebarOpen && logoHovered ? (
                <PanelLeftOpen size={20} strokeWidth={1.8} color="#ffffff" />
              ) : (
                <img
                  src="/efu-sidebar-logo.png"
                  alt="EFU"
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: 74,
                    height: "auto",
                    left: -16,
                    top: -5,
                    maxWidth: "none",
                    userSelect: "none",
                  }}
                />
              )}
            </div>

            {sidebarOpen && (
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 750,
                    fontSize: 15,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                  }}
                >
                  EFU General
                </div>

                <div
                  style={{
                    color: "var(--sidebar-text-subtle)",
                    fontSize: 12,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  IT Inventory System
                </div>
              </div>
            )}
          </button>

          {sidebarOpen && (
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false)
                setLogoHovered(false)
              }}
              aria-label="Close sidebar"
              title="Close sidebar"
              style={{
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                padding: 0,
                borderRadius: 12,
                border: "1px solid transparent",
                background: "transparent",
                color: "#ffffff",
                cursor: "pointer",
                transition:
                  "background 0.18s ease, border-color 0.18s ease, transform 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.14)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"
                e.currentTarget.style.transform = "translateX(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.borderColor = "transparent"
                e.currentTarget.style.transform = "translateX(0)"
              }}
            >
              <PanelLeftClose size={19} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            overflowY: sidebarOpen ? "auto" : "hidden",
            overflowX: "hidden",
            padding: sidebarOpen ? "16px 12px" : "16px 12px",
          }}
        >
          {visibleNavItems.map((item) => {
            if (!item.children) {
              const active = currentScreen === item.screen

              return (
                <button
                  key={item.label}
                  type="button"
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={item.label}
                  onClick={() => item.screen && onNavigate(item.screen)}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    gap: sidebarOpen ? 11 : 0,
                    padding: sidebarOpen ? "11px 12px" : "11px 0",
                    marginBottom: 6,
                    borderRadius: 12,
                    border: "1px solid transparent",
                    background: active
                      ? "rgba(255,255,255,0.15)"
                      : "transparent",
                    color: active ? "var(--sidebar-text)" : "var(--sidebar-text-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: active ? 700 : 550,
                    textAlign: "left",
                    transition:
                      "background 0.16s ease, color 0.16s ease, transform 0.16s ease",
                    boxShadow: active
                      ? "inset 3px 0 0 rgba(255,255,255,0.9), 0 4px 12px rgba(0,0,0,0.08)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.08)"
                      e.currentTarget.style.color = "var(--sidebar-text)"
                      e.currentTarget.style.transform = sidebarOpen
                        ? "translateX(2px)"
                        : "none"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "var(--sidebar-text-muted)"
                      e.currentTarget.style.transform = "translateX(0)"
                    }
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>

                  {sidebarOpen && (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </button>
              )
            }

            const open = !collapsed[item.label]
            const groupActive = isActiveInGroup(item)

            return (
              <div key={item.label} style={{ marginBottom: 5 }}>
                <button
                  type="button"
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={item.label}
                  onClick={() => {
                    if (!sidebarOpen) {
                      setSidebarOpen(true)
                      setCollapsed((c) => ({ ...c, [item.label]: false }))
                      return
                    }
                    toggleGroup(item.label)
                  }}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    gap: sidebarOpen ? 11 : 0,
                    padding: sidebarOpen ? "10px 12px" : "10px 0",
                    borderRadius: 12,
                    border: "1px solid transparent",
                    background: groupActive
                      ? "rgba(255,255,255,0.10)"
                      : "transparent",
                    color: groupActive ? "var(--sidebar-text)" : "var(--sidebar-text-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: groupActive ? 700 : 550,
                    textAlign: "left",
                    transition: "background 0.16s ease, color 0.16s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.09)"
                    e.currentTarget.style.color = "var(--sidebar-text)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = groupActive
                      ? "rgba(255,255,255,0.11)"
                      : "transparent"
                    e.currentTarget.style.color = groupActive
                      ? "var(--sidebar-text)"
                      : "var(--sidebar-text-muted)"
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>

                  {sidebarOpen && (
                    <>
                      <span
                        style={{
                          flex: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                      {open ? (
                        <ChevronDown size={15} />
                      ) : (
                        <ChevronRight size={15} />
                      )}
                    </>
                  )}
                </button>

                {sidebarOpen && open && (
                  <div
                    style={{
                      paddingLeft: 16,
                      marginTop: 4,
                      borderLeft: "1px solid rgba(255,255,255,0.10)",
                      marginLeft: 23,
                    }}
                  >
                    {item.children.map((child) => {
                      const childActive = currentScreen === child.screen

                      return (
                        <button
                          key={child.label}
                          type="button"
                          onClick={() => onNavigate(child.screen)}
                          style={{
                            width: "100%",
                            minHeight: 38,
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            padding: "8px 10px",
                            marginBottom: 2,
                            borderRadius: 9,
                            border: "none",
                            background: childActive
                              ? "rgba(255,255,255,0.16)"
                              : "transparent",
                            color: childActive
                              ? "var(--sidebar-text)"
                              : "var(--sidebar-text-subtle)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: childActive ? 600 : 400,
                            textAlign: "left",
                            transition:
                              "background 0.15s ease, color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.08)"
                              e.currentTarget.style.color = "var(--sidebar-text)"
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = "transparent"
                              e.currentTarget.style.color =
                                "var(--sidebar-text-subtle)"
                            }
                          }}
                        >
                          <span
                            style={{
                              width: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {child.icon}
                          </span>
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {child.label}
                          </span>
                          {childActive && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "#fff",
                                marginLeft: "auto",
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div
          style={{
            padding: sidebarOpen ? "12px" : "12px",
            borderTop: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.05)",
          }}
        >
          <button
            type="button"
            title={!sidebarOpen ? user?.name || "Profile" : undefined}
            aria-label="Open profile"
            onClick={() => onNavigate("profile")}
            style={{
              width: "100%",
              minHeight: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              gap: sidebarOpen ? 10 : 0,
              padding: sidebarOpen ? "7px 8px" : "7px 0",
              border: sidebarOpen
                ? "1px solid rgba(255,255,255,0.10)"
                : "1px solid transparent",
              background: sidebarOpen
                ? "rgba(255,255,255,0.06)"
                : "transparent",
              cursor: "pointer",
              borderRadius: 14,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = sidebarOpen
                ? "rgba(255,255,255,0.06)"
                : "transparent"
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <UserCircle size={19} color="#fff" />
            </div>

            {sidebarOpen && (
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.name}
                </div>
                <div
                  style={{
                    color: "var(--sidebar-text-subtle)",
                    fontSize: 11,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.email}
                </div>
              </div>
            )}
          </button>

          <button
            type="button"
            title={!sidebarOpen ? "Logout" : undefined}
            aria-label="Logout"
            onClick={onLogout}
            style={{
              width: "100%",
              minHeight: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              gap: sidebarOpen ? 10 : 0,
              padding: sidebarOpen ? "8px 12px" : "8px 0",
              marginTop: 4,
              border: "none",
              background: "transparent",
              color: "var(--sidebar-text-muted)",
              cursor: "pointer",
              fontSize: 13,
              borderRadius: 10,
              textAlign: "left",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(220,38,38,0.16)"
              e.currentTarget.style.color = "var(--sidebar-text)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.color = "var(--sidebar-text-muted)"
            }}
          >
            <LogOut size={17} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          className="app-topbar"
          style={{
            height: 64,
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 16,
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Search */}
          <div
            style={{
              flex: 1,
              maxWidth: 400,
              position: "relative",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9CA3AF",
              }}
            />
            <input
              name="global-search"
              autoComplete="off"
              placeholder="Search assets, employees, locations..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--surface-soft)",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* Dark mode */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? "Use light mode" : "Use dark mode"}
              aria-pressed={darkMode}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                background: "var(--theme-button-bg)",
                border: "1px solid var(--theme-button-border)",
                cursor: "pointer",
                color: "var(--theme-button-color)",
                padding: 0,
                borderRadius: 10,
                boxShadow: "var(--theme-button-shadow)",
                transition:
                  "background-color .2s ease, color .2s ease, border-color .2s ease, transform .2s ease",
              }}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            {!isViewer && <div ref={notificationMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setNotifOpen((n) => !n)
                  setProfileOpen(false)
                }}
                aria-label={`Notifications${
                  unreadCount ? `, ${unreadCount} unread` : ""
                }`}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  padding: 8,
                  borderRadius: 8,
                  position: "relative",
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      minWidth: 16,
                      height: 16,
                      padding: "0 3px",
                      borderRadius: 8,
                      background: "#DC2626",
                      border: "2px solid #fff",
                      color: "#fff",
                      fontSize: 9,
                      lineHeight: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "110%",
                    width: 320,
                    background: "var(--surface-raised)",
                    borderRadius: 16,
                    boxShadow: "var(--dropdown-shadow)",
                    border: "1px solid var(--border)",
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "15px 16px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                      <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 9, background: "#eaf5ff", color: "#0069b8" }}><Bell size={15} /></span>
                      Notifications
                    </span>
                    <button
                      disabled={!unreadCount}
                      onClick={() =>
                        api
                          .patch("/notifications/read-all", {})
                          .then(() => setUnreadCount(0))
                      }
                      style={{
                        fontSize: 12,
                        color: "#005BAC",
                        border: 0,
                        background: "none",
                        opacity: unreadCount ? 1 : 0.45,
                        cursor: unreadCount ? "pointer" : "not-allowed",
                      }}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div style={{ padding: "24px 18px 20px", display: "grid", justifyItems: "center", textAlign: "center" }}>
                    <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 14, background: unreadCount ? "#fff1f2" : "#ecfdf3", color: unreadCount ? "#dc2626" : "#15803d", marginBottom: 10 }}>
                      {unreadCount ? <Bell size={21} /> : <Check size={22} />}
                    </span>
                    <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>
                      {unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}
                    </strong>
                    <span style={{ marginTop: 4, color: "var(--text-secondary)", fontSize: 12 }}>
                      {unreadCount ? "Open the notification center to review updates." : "There are no new alerts right now."}
                    </span>
                  </div>
                  <div style={{ padding: "10px 12px 12px", borderTop: "1px solid var(--border-soft)" }}>
                    <button
                      onClick={() => {
                        onNavigate("notifications")
                        setNotifOpen(false)
                      }}
                      style={{
                        fontSize: 13,
                        color: "#005BAC",
                        width: "100%",
                        minHeight: 38,
                        background: "#eaf5ff",
                        border: "1px solid #c7e4f8",
                        borderRadius: 10,
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>}

            {/* Profile */}
            <div ref={profileMenuRef} style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setProfileOpen((p) => !p)
                  setNotifOpen(false)
                }}
                aria-label="Open user menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #005BAC, #003B73)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}
                  >
                    {initials}
                  </span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      lineHeight: 1.2,
                    }}
                  >
                    {user?.role?.replaceAll("_", " ")}
                  </div>
                </div>
                <ChevronDown size={14} color="#9CA3AF" />
              </button>
              {profileOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "110%",
                    width: 200,
                    background: "var(--surface-raised)",
                    borderRadius: 10,
                    boxShadow: "var(--dropdown-shadow)",
                    border: "1px solid var(--border)",
                    zIndex: 100,
                    overflow: "hidden",
                  }}
                >
                  {[
                    { label: "My Profile", screen: "profile" as Screen },
                    { label: "Settings", screen: "settings" as Screen },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        onNavigate(item.screen)
                        setProfileOpen(false)
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        borderBottom: "1px solid var(--border-soft)",
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      onLogout()
                      setProfileOpen(false)
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 13,
                      color: "#DC2626",
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="app-content"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            background: "var(--app-bg)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
