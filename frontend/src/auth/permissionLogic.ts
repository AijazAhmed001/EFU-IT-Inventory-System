export type PermissionItem = { code: string; requires?: string }

export type PermissionDefinition = PermissionItem & {
  name: string
  group: string
  sensitive: boolean
}

const permissionNames: Record<string, string> = {
  'dashboard.view': 'View Dashboard',
  'assets.view': 'View Assets',
  'assets.create': 'Create Assets',
  'assets.update': 'Edit Assets',
  'assets.delete': 'Delete Assets',
  'assets.attachments.download': 'View / Download Attachments',
  'assets.attachments.upload': 'Upload Attachments',
  'assets.attachments.delete': 'Delete Attachments',
  'allocations.view': 'View Allocations',
  'allocations.create': 'Allocate Assets',
  'allocations.revoke': 'Return / Revoke Assets',
  'assets.retire': 'Retire Assets',
  'master.view': 'View Master Data',
  'master.manage': 'Manage Master Data',
  'reports.view': 'View Reports',
  'reports.export': 'Export Reports',
  'notifications.view': 'View Notifications',
  'users.view': 'View Users',
  'users.manage': 'Manage Users',
  'users.permissions.manage': 'Manage User Permissions',
  'settings.view': 'View Settings',
  'settings.update': 'Update Settings',
  'audit.view': 'View Audit Trail',
}

const titleCase = (value: string) =>
  value
    .replaceAll('-', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())

const inferGroup = (code: string) => {
  if (code.startsWith('dashboard.')) return 'Dashboard'
  if (code.startsWith('assets.attachments.')) return 'Asset Attachments'
  if (code === 'assets.retire') return 'Asset Retirement'
  if (code.startsWith('assets.')) return 'Assets'
  if (code.startsWith('allocations.')) return 'Allocations'
  if (code.startsWith('master.')) return 'Master Data'
  if (code.startsWith('reports.')) return 'Reports'
  if (code.startsWith('notifications.')) return 'Notifications'
  if (code.startsWith('users.')) return 'Users'
  if (code.startsWith('settings.')) return 'Settings'
  if (code.startsWith('audit.')) return 'Audit'
  if (code.startsWith('sessions.')) return 'Sessions'
  if (code.startsWith('backups.')) return 'Backups'
  return 'Other'
}

const inferName = (code: string) => {
  if (permissionNames[code]) return permissionNames[code]
  const parts = code.split('.')
  const action = parts.pop() ?? code
  const subject = titleCase(parts.at(-1) ?? '')
  const actionName: Record<string, string> = {
    view: 'View',
    manage: 'Manage',
    create: 'Create',
    update: 'Edit',
    delete: 'Delete',
    download: 'Download',
    upload: 'Upload',
  }
  return `${actionName[action] ?? titleCase(action)} ${subject}`.trim()
}

const inferDependency = (code: string) => {
  if (code === 'allocations.create' || code === 'allocations.revoke')
    return 'allocations.view'
  if (code === 'assets.retire') return 'assets.view'
  if (/^assets\.(create|update|delete)$/.test(code)) return 'assets.view'
  if (code === 'assets.attachments.delete')
    return 'assets.attachments.download'
  if (code.startsWith('assets.attachments.')) return 'assets.view'
  if (code.startsWith('master.') && code.endsWith('.manage'))
    return code.replace(/\.manage$/, '.view')
  if (code.startsWith('reports.export.')) return 'reports.inventory.view'
  return undefined
}

export function normalizePermissionCatalog(
  values: Array<string | Partial<PermissionDefinition>>,
): PermissionDefinition[] {
  const seen = new Set<string>()
  return values.flatMap(value => {
    const code = typeof value === 'string' ? value : value.code?.trim()
    if (!code || seen.has(code)) return []
    seen.add(code)
    return [{
      code,
      name:
        typeof value === 'string' || !value.name?.trim()
          ? inferName(code)
          : value.name,
      group:
        typeof value === 'string' || !value.group?.trim()
          ? inferGroup(code)
          : value.group,
      requires:
        typeof value === 'string' || !value.requires
          ? inferDependency(code)
          : value.requires,
      sensitive:
        typeof value === 'string'
          ? /delete|manage|retire|revoke|deactivate/.test(code)
          : Boolean(value.sensitive),
    }]
  })
}

export function updateSelection(current: Iterable<string>, catalog: PermissionItem[], code: string, enabled: boolean) {
  const next = new Set(current)
  const item = catalog.find(value => value.code === code)
  if (enabled) {
    next.add(code)
    if (item?.requires) next.add(item.requires)
    if (code === 'allocations.create') next.add('assets.view')
  } else {
    next.delete(code)
    catalog.filter(value => value.requires === code).forEach(value => next.delete(value.code))
    if (code === 'assets.view') next.delete('allocations.create')
  }
  return next
}
