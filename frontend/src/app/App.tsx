import { useEffect, useState } from "react"
import Login from "../features/auth/pages/LoginPage"
import Layout from "../components/layout/AppLayout"
import Dashboard from "../features/dashboard/pages/DashboardPage"
import MasterSetup from "../features/master-data/pages/MasterSetupPage"
import NewAsset from "../features/assets/pages/NewAsset"
import Reports from "../features/reports/pages/Reports"
import Settings from "../features/settings/pages/Settings"
import Profile from "../features/profile/pages/Profile"
import Notifications from "../features/notifications/pages/Notifications"
import AssetExpiryReminders from "../features/notifications/pages/AssetExpiryReminders"
import Assets from "../features/assets/pages/Assets"
import AllocationHistory from "../features/allocations/pages/AllocationHistoryPage"
import { AssetAllocation, AssetRevocation, AssetExpiration } from "../features/transactions/pages/TransactionsPage"
import { authApi, clearSession, loadSession, updateStoredUser } from "../lib/api"
import { installInputLimits } from "../constants/inputLimits"
import AccessDenied from "../components/feedback/AccessDenied"
import { hasPermission, screenPermission } from "../auth/permissions"
import PurchaseOrdersPage from "../features/purchase-orders/pages/PurchaseOrdersPage"
import PurchaseOrderFormPage from "../features/purchase-orders/pages/PurchaseOrderFormPage"

type Screen = "dashboard" | "purchase-orders" | "purchase-order-form" | "assets" | "asset-type" | "asset-make" | "motherboard" | "memory" | "storage" | "operating-system" | "vendor" | "province" | "city" | "location" | "department" | "office" | "employee" | "lifecycle-policy" | "new-asset" | "allocations" | "asset-allocation" | "asset-revocation" | "asset-expiration" | "asset-history" | "settings" | "profile" | "notifications" | "email-reminders" | "asset-details"

const masterSetupScreens: Screen[] = [
  "asset-type",
  "asset-make",
  "motherboard",
  "memory",
  "storage",
  "operating-system",
  "vendor",
  "province",
  "city",
  "location",
  "department",
  "office",
  "employee",
  "lifecycle-policy",
]

const screenRoutes: Record<Screen, string> = {
  dashboard: "/dashboard",
  "purchase-orders": "/purchase-orders",
  "purchase-order-form": "/purchase-orders/new",
  assets: "/assets",
  "new-asset": "/assets/new",
  allocations: "/allocations",
  "asset-allocation": "/allocations/new",
  "asset-revocation": "/allocations/return",
  "asset-expiration": "/assets/retire",
  "asset-history": "/reports/assets",
  settings: "/settings",
  profile: "/profile",
  notifications: "/notifications",
  "email-reminders": "/notifications/email-reminders",
  "asset-details": "/assets",
  "asset-type": "/master/asset-types",
  "asset-make": "/master/asset-makes",
  motherboard: "/master/motherboards",
  memory: "/master/memory",
  storage: "/master/storage",
  "operating-system": "/master/operating-systems",
  vendor: "/master/vendors",
  province: "/master/provinces",
  city: "/master/cities",
  location: "/master/locations",
  department: "/master/departments",
  office: "/master/offices",
  employee: "/master/employees",
  "lifecycle-policy": "/master/lifecycle-policies",
}

const routeScreens = Object.fromEntries(
  Object.entries(screenRoutes).map(([screen, route]) => [route, screen]),
) as Record<string, Screen>
const loginRoute = "/login"
const screenFromLocation = (): Screen => {
  const path = window.location.pathname.replace(/\/$/, "") || "/"
  if (/^\/purchase-orders\/[^/]+(?:\/(?:edit|receive))?$/.test(path)) return "purchase-order-form"
  return routeScreens[path] || "dashboard"
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => loadSession(false) !== null)
  const [checkingSession, setCheckingSession] = useState(() => loadSession(false) !== null)
  const [currentScreen, setCurrentScreen] = useState<Screen>(screenFromLocation)
  const [, setPermissionRevision] = useState(0)

  useEffect(() => installInputLimits(), [])

  useEffect(() => {
    const onPopState = () => {
      if (!loggedIn) {
        window.history.replaceState({}, "", loginRoute)
        return
      }
      setCurrentScreen(screenFromLocation())
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [loggedIn])

  useEffect(() => {
    if (!loggedIn) return
    const refresh = () => authApi.me().then(user => { updateStoredUser(user); setPermissionRevision(value => value + 1) }).catch(() => undefined)
    const id = window.setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(id); window.removeEventListener('focus', refresh) }
  }, [loggedIn])

  useEffect(() => {
    const unauthorized = () => {
      clearSession()
      window.history.replaceState({}, "", loginRoute)
      setLoggedIn(false)
      setCurrentScreen("dashboard")
    }
    window.addEventListener("efu:unauthorized", unauthorized)
    return () => window.removeEventListener("efu:unauthorized", unauthorized)
  }, [])

  useEffect(() => {
    if (!loggedIn) {
      setCheckingSession(false)
      return
    }
    authApi
      .me()
      .then((user) => {
        updateStoredUser(user)
        setCheckingSession(false)
      })
      .catch(() => {
        clearSession()
        window.history.replaceState({}, "", loginRoute)
        setLoggedIn(false)
        setCheckingSession(false)
      })
  }, [loggedIn])

  const isAllowed = (screen: Screen) => screen === 'profile' || !screenPermission[screen] || hasPermission(screenPermission[screen])

  if (checkingSession)
    return <div role="status" aria-live="polite" className="app-loading">Checking your secure session…</div>

  if (!loggedIn)
    return (
      <Login
        onLogin={() => {
          window.history.replaceState({}, "", screenRoutes.dashboard)
          setCurrentScreen("dashboard")
          setLoggedIn(true)
        }}
      />
    )

  const navigate = (screen: string) => {
    const requested = screen as Screen
    const next = requested
    window.history.pushState(
      {},
      "",
      screenRoutes[next] || screenRoutes.dashboard,
    )
    setCurrentScreen(next)
  }

  const renderScreen = () => {
    if (!isAllowed(currentScreen)) return <AccessDenied onDashboard={() => navigate('dashboard')} />
    if (currentScreen === "dashboard")
      return <Dashboard onNavigate={navigate} />
    if (currentScreen === "purchase-orders") return <PurchaseOrdersPage />
    if (currentScreen === "purchase-order-form") return <PurchaseOrderFormPage />
    if (currentScreen === "assets") return <Assets />
    if (currentScreen === "allocations") return <AllocationHistory />
    if (masterSetupScreens.includes(currentScreen))
      return <MasterSetup screenKey={currentScreen} />
    if (currentScreen === "new-asset")
      return <NewAsset onCancel={() => setCurrentScreen("dashboard")} />
    if (currentScreen === "asset-allocation") return <AssetAllocation />
    if (currentScreen === "asset-revocation") return <AssetRevocation />
    if (currentScreen === "asset-expiration") return <AssetExpiration />
    if (currentScreen === "asset-history") return <Reports />
    if (currentScreen === "settings") return <Settings />
    if (currentScreen === "profile") return <Profile />
    if (currentScreen === "notifications") return <Notifications />
    if (currentScreen === "email-reminders") return <AssetExpiryReminders />
    return <Dashboard onNavigate={navigate} />
  }

  const logout = async () => {
    const session = loadSession(false)
    try {
      if (session) await authApi.logout(session)
    } catch {
      // Local logout must still complete when the server is unavailable.
    } finally {
      clearSession()
      window.history.replaceState({}, "", loginRoute)
      setLoggedIn(false)
      setCurrentScreen("dashboard")
    }
  }

  return (
    <Layout
      currentScreen={currentScreen}
      onNavigate={navigate}
      onLogout={logout}
    >
      {renderScreen()}
    </Layout>
  )
}
