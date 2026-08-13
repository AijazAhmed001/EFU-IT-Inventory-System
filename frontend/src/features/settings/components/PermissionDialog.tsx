import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  normalizePermissionCatalog,
  updateSelection,
  type PermissionDefinition,
} from '../../../auth/permissionLogic'
import { api } from '../../../lib/api'
import './PermissionDialog.css'

type User = {
  id: string
  name: string
  email: string
  employeeCode?: string
  role: string
  status: string
}
type Definition = PermissionDefinition
type GrantData = {
  permissions: string[]
  lastPermissionUpdate?: string
  lastChangedBy?: string
}
type History = {
  id: number
  permissionCode: string
  change: string
  changedBy: string
  changedAt: string
}

const templates: Record<string, string[]> = {
  'Read-Only IT Admin': [
    'dashboard.view',
    'assets.view',
    'allocations.view',
    'reports.inventory.view',
  ],
  'Asset Operator': [
    'dashboard.view',
    'assets.view',
    'assets.create',
    'assets.update',
    'allocations.view',
    'allocations.create',
    'allocations.revoke',
  ],
  'Asset Manager': [
    'dashboard.view',
    'assets.view',
    'assets.create',
    'assets.update',
    'assets.delete',
    'assets.attachments.download',
    'assets.attachments.upload',
    'allocations.view',
    'allocations.create',
    'allocations.revoke',
    'assets.retire',
  ],
  'Reporting Admin': [
    'dashboard.view',
    'assets.view',
    'reports.inventory.view',
    'reports.asset-history.view',
    'reports.audit.view',
    'reports.export.pdf',
    'reports.export.csv',
    'reports.export.xlsx',
    'audit.view',
  ],
}

export default function PermissionDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [catalog, setCatalog] = useState<Definition[]>([])
  const [saved, setSaved] = useState(new Set<string>())
  const [selected, setSelected] = useState(new Set<string>())
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState(new Set<string>())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [error, setError] = useState('')
  const [errorPhase, setErrorPhase] = useState<'load' | 'save'>('load')
  const [historyUnavailable, setHistoryUnavailable] = useState(false)
  const [history, setHistory] = useState<History[]>([])
  const [meta, setMeta] = useState<GrantData>({ permissions: [] })

  useEffect(() => {
    dialogRef.current?.showModal()
    const load = async () => {
      setLoading(true)
      setError('')
      setErrorPhase('load')
      try {
        const [definitions, grants] = await Promise.all([
          api.get<Array<string | Partial<Definition>>>('/permissions'),
          api.get<GrantData>(`/users/${user.id}/permissions`),
        ])
        setCatalog(normalizePermissionCatalog(definitions))
        setSaved(new Set(grants.permissions))
        setSelected(new Set(grants.permissions))
        setMeta(grants)
        window.setTimeout(() => searchRef.current?.focus(), 0)

        try {
          setHistory(
            await api.get<History[]>(`/users/${user.id}/permission-history`),
          )
        } catch {
          // Older running API versions may not expose history yet. Permission
          // management remains usable and explains that a restart is needed.
          setHistoryUnavailable(true)
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load the permission catalog.',
        )
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [user.id])

  const groups = useMemo(
    () =>
      catalog
        .filter(item =>
          `${item.name} ${item.code} ${item.group}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .reduce((map, item) => {
          const values = map.get(item.group) ?? []
          values.push(item)
          map.set(item.group, values)
          return map
        }, new Map<string, Definition[]>()),
    [catalog, search],
  )

  const added = [...selected].filter(code => !saved.has(code))
  const removed = [...saved].filter(code => !selected.has(code))
  const dirty = added.length + removed.length > 0

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setConfirmClose(true)
      return
    }
    onClose()
  }

  const selectCodes = (codes: string[]) =>
    setSelected(current =>
      codes.reduce(
        (next, code) => updateSelection(next, catalog, code, true),
        new Set(current),
      ),
    )

  const clearCodes = (codes: string[]) =>
    setSelected(current =>
      codes.reduce(
        (next, code) => updateSelection(next, catalog, code, false),
        new Set(current),
      ),
    )

  const applyTemplate = (name: string) => {
    const available = new Set(catalog.map(item => item.code))
    const codes =
      name === 'Full IT Admin'
        ? catalog.map(item => item.code)
        : name === 'Master Data Manager'
          ? catalog
              .filter(
                item =>
                  item.group === 'Master Data' ||
                  item.code === 'dashboard.view',
              )
              .map(item => item.code)
          : templates[name]
    const compatibleCodes = codes.filter(code => available.has(code))
    // Legacy backends use a few broader codes. Use them only when the
    // equivalent granular template codes are unavailable.
    if (name === 'Reporting Admin') {
      if (available.has('reports.view')) compatibleCodes.push('reports.view')
      if (available.has('reports.export')) compatibleCodes.push('reports.export')
    }
    if (name === 'Master Data Manager') {
      if (available.has('master.view')) compatibleCodes.push('master.view')
      if (available.has('master.manage')) compatibleCodes.push('master.manage')
    }
    setSelected(
      [...new Set(compatibleCodes)].reduce(
        (next, code) => updateSelection(next, catalog, code, true),
        new Set<string>(),
      ),
    )
  }

  const save = async () => {
    if (
      removed.some(code => catalog.find(item => item.code === code)?.sensitive) &&
      !window.confirm(
        `Remove ${removed.length} permission(s), including sensitive access?`,
      )
    )
      return

    setSaving(true)
    setError('')
    setErrorPhase('save')
    try {
      const result = await api.put<GrantData>(
        `/users/${user.id}/permissions`,
        { permissions: [...selected] },
      )
      setSaved(new Set(result.permissions))
      onSaved(`Permissions updated for ${user.name}.`)
      onClose()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save permissions.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="permission-dialog"
      onCancel={event => {
        event.preventDefault()
        requestClose()
      }}
      onClick={event => {
        // Native dialog backdrop clicks target the dialog itself. Coordinate
        // checking prevents clicks on padding or any child control from being
        // mistaken for a backdrop click.
        if (event.target !== event.currentTarget) return
        const bounds = event.currentTarget.getBoundingClientRect()
        const outside =
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        if (outside) requestClose()
      }}
      aria-labelledby="permission-title"
    >
      <header className="permission-dialog__header">
        <div className="permission-dialog__identity-icon">
          <ShieldCheck size={24} />
        </div>
        <div className="permission-dialog__identity">
          <div className="permission-dialog__title-row">
            <h2 id="permission-title">Manage Permissions</h2>
            <span
              className={`permission-dialog__status permission-dialog__status--${user.status.toLowerCase()}`}
            >
              {user.status}
            </span>
          </div>
          <strong>{user.name}</strong>
          <p>
            {user.email}
            <span aria-hidden="true">•</span>
            {user.employeeCode || 'No employee code'}
            <span aria-hidden="true">•</span>
            {user.role.replaceAll('_', ' ')}
          </p>
          <small>
            Last updated:{' '}
            {meta.lastPermissionUpdate
              ? new Date(meta.lastPermissionUpdate).toLocaleString()
              : 'Never'}
            {' · '}Changed by {meta.lastChangedBy || '—'}
          </small>
        </div>
        <button
          type="button"
          className="permission-dialog__close"
          aria-label="Close permission manager"
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </header>

      <div className="permission-dialog__body">
        {error && (
          <div role="alert" className="permission-dialog__error">
            <AlertTriangle size={19} />
            <div>
              <strong>
                {errorPhase === 'save'
                  ? 'Permissions could not be saved'
                  : 'Permissions could not be loaded'}
              </strong>
              <span>{error}</span>
              {error.includes('404') && (
                <small>
                  Restart the backend so the new permission endpoints are active.
                </small>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="permission-dialog__loading" role="status">
            <LoaderCircle className="settings-spin" size={30} />
            <strong>Loading permission catalog…</strong>
            <span>Retrieving current access and audit information.</span>
          </div>
        ) : catalog.length > 0 ? (
          <>
            <section className="permission-toolbar" aria-label="Permission tools">
              <label className="permission-search">
                <Search size={17} />
                <input
                  ref={searchRef}
                  aria-label="Search permissions"
                  placeholder="Search by permission or code…"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <div className="permission-toolbar__actions">
                <button
                  type="button"
                  onClick={() => selectCodes(catalog.map(item => item.code))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => clearCodes(catalog.map(item => item.code))}
                >
                  Clear all
                </button>
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={() => setSelected(new Set(saved))}
                >
                  <RotateCcw size={15} /> Reset
                </button>
              </div>
            </section>

            <section className="permission-templates" aria-labelledby="template-heading">
              <div>
                <Sparkles size={17} />
                <span id="template-heading">Quick templates</span>
              </div>
              <div className="permission-template-list">
                {[...Object.keys(templates), 'Master Data Manager', 'Full IT Admin'].map(
                  name => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => applyTemplate(name)}
                    >
                      {name}
                    </button>
                  ),
                )}
              </div>
            </section>

            <div className="permission-dialog__content-grid">
              <section className="permission-groups" aria-label="Permission groups">
                {groups.size === 0 ? (
                  <div className="permission-dialog__empty">
                    No permissions match “{search}”.
                  </div>
                ) : (
                  [...groups].map(([group, items]) => {
                    const isCollapsed = collapsed.has(group)
                    const selectedCount = items.filter(item =>
                      selected.has(item.code),
                    ).length
                    return (
                      <section className="permission-group" key={group}>
                        <div className="permission-group__header">
                          <button
                            type="button"
                            className="permission-group__toggle"
                            aria-expanded={!isCollapsed}
                            onClick={() =>
                              setCollapsed(current => {
                                const next = new Set(current)
                                next.has(group) ? next.delete(group) : next.add(group)
                                return next
                              })
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                            <strong>{group}</strong>
                            <span>
                              {selectedCount}/{items.length}
                            </span>
                          </button>
                          <div>
                            <button
                              type="button"
                              onClick={() => selectCodes(items.map(item => item.code))}
                            >
                              Select group
                            </button>
                            <button
                              type="button"
                              onClick={() => clearCodes(items.map(item => item.code))}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        {!isCollapsed && (
                          <div className="permission-group__items">
                            {items.map(permission => (
                              <label
                                className={`permission-item ${selected.has(permission.code) ? 'permission-item--selected' : ''}`}
                                key={permission.code}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.has(permission.code)}
                                  onChange={event =>
                                    setSelected(current =>
                                      updateSelection(
                                        current,
                                        catalog,
                                        permission.code,
                                        event.target.checked,
                                      ),
                                    )
                                  }
                                />
                                <span className="permission-item__check">
                                  <Check size={14} />
                                </span>
                                <span>
                                  <strong>{permission.name}</strong>
                                  <code>{permission.code}</code>
                                  {permission.requires && (
                                    <small>Requires {permission.requires}</small>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </section>
                    )
                  })
                )}
              </section>

              <aside className="permission-summary">
                <div className="permission-summary__heading">
                  <span>Review changes</span>
                  {dirty && <em>Unsaved</em>}
                </div>
                <div className="permission-summary__count">
                  <strong>{selected.size}</strong>
                  <span>effective permissions</span>
                </div>
                <div className="permission-summary__stats">
                  <span><b>+{added.length}</b> added</span>
                  <span><b>−{removed.length}</b> removed</span>
                </div>
                {added.length > 0 && (
                  <div className="permission-summary__changes permission-summary__changes--added">
                    <strong>Being added</strong>
                    {added.map(code => <code key={code}>{code}</code>)}
                  </div>
                )}
                {removed.length > 0 && (
                  <div className="permission-summary__changes permission-summary__changes--removed">
                    <strong>Being removed</strong>
                    {removed.map(code => <code key={code}>{code}</code>)}
                  </div>
                )}
                {!dirty && (
                  <p className="permission-summary__unchanged">
                    <Check size={16} /> Permissions match the saved configuration.
                  </p>
                )}
                <details className="permission-history">
                  <summary>
                    <Clock3 size={16} /> Permission history
                    {history.length > 0 && <span>{history.length}</span>}
                  </summary>
                  {historyUnavailable ? (
                    <p>History will be available after restarting the updated backend.</p>
                  ) : history.length === 0 ? (
                    <p>No permission changes have been recorded yet.</p>
                  ) : (
                    <ul>
                      {history.slice(0, 20).map(item => (
                        <li key={item.id}>
                          <strong>{item.change}</strong>
                          <code>{item.permissionCode}</code>
                          <small>
                            {item.changedBy} ·{' '}
                            {new Date(item.changedAt).toLocaleString()}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              </aside>
            </div>
          </>
        ) : null}
      </div>

      <footer className="permission-dialog__footer">
        <span>
          {dirty
            ? `${added.length + removed.length} unsaved change${added.length + removed.length === 1 ? '' : 's'}`
            : 'No unsaved changes'}
        </span>
        <div>
          <button type="button" disabled={saving} onClick={requestClose}>
            Cancel
          </button>
          <button
            type="button"
            className="permission-dialog__save"
            disabled={!dirty || saving || loading || catalog.length === 0}
            onClick={() => void save()}
          >
            {saving ? <LoaderCircle className="settings-spin" size={17} /> : <ShieldCheck size={17} />}
            {saving ? 'Saving…' : `Save ${selected.size} permissions`}
          </button>
        </div>
      </footer>

      {confirmClose && (
        <div
          className="permission-close-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="discard-permissions-title"
          aria-describedby="discard-permissions-description"
          onClick={event => event.stopPropagation()}
        >
          <div className="permission-close-confirm__card">
            <span className="permission-close-confirm__icon">
              <AlertTriangle size={22} />
            </span>
            <h3 id="discard-permissions-title">Discard unsaved changes?</h3>
            <p id="discard-permissions-description">
              You have {added.length + removed.length} unsaved permission
              change{added.length + removed.length === 1 ? '' : 's'}. Closing
              now will discard them.
            </p>
            <div>
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmClose(false)}
              >
                Continue editing
              </button>
              <button
                type="button"
                className="permission-close-confirm__discard"
                onClick={onClose}
              >
                Discard and close
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
