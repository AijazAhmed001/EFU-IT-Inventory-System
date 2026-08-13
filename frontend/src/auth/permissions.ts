import { loadSession } from '../lib/api'

export const hasPermission = (code: string) => {
  const user = loadSession(false)?.user
  return user?.role === 'SUPER_ADMIN' || Boolean(user?.permissions?.includes(code))
}
export const hasAnyPermission = (codes: string[]) => codes.some(hasPermission)
export const hasAllPermissions = (codes: string[]) => codes.every(hasPermission)

export const screenPermission: Record<string, string> = {
  dashboard: 'dashboard.view', assets: 'assets.view', 'new-asset': 'assets.create',
  allocations: 'allocations.view', 'asset-allocation': 'allocations.create',
  'asset-revocation': 'allocations.revoke', 'asset-expiration': 'assets.retire',
  'asset-history': 'reports.asset-history.view', settings: 'settings.view',
  notifications: 'notifications.view', 'asset-type': 'master.asset-types.view',
  'asset-make': 'master.asset-makes.view', motherboard: 'master.motherboards.view',
  memory: 'master.memory.view', storage: 'master.storage.view',
  'operating-system': 'master.operating-systems.view', vendor: 'master.vendors.view',
  province: 'master.provinces.view', city: 'master.cities.view', location: 'master.locations.view',
  department: 'master.departments.view', office: 'master.offices.view', employee: 'master.employees.view',
  'lifecycle-policy': 'master.lifecycle-policies.view',
}
