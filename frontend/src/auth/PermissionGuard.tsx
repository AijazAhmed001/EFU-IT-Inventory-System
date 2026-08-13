import type { ReactNode } from 'react'
import { hasAllPermissions, hasAnyPermission, hasPermission } from './permissions'

export function Can({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  return hasPermission(permission) ? children : fallback
}
export function PermissionGuard({ any = [], all = [], children, fallback = null }: { any?: string[]; all?: string[]; children: ReactNode; fallback?: ReactNode }) {
  const allowed = (any.length === 0 || hasAnyPermission(any)) && (all.length === 0 || hasAllPermissions(all))
  return allowed ? children : fallback
}
