import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, loadSession } from '../../../lib/api'
import { CURRENCY_OPTIONS, setDisplayCurrency } from '../../../utils/currency'
import './Settings.css'
import PermissionDialog from '../components/PermissionDialog'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLoginAt?: string
  employeeCode?: string
}

interface UserForm {
  name: string
  email: string
  password: string
  role: string
  status: string
}

type SettingsTab = 'general' | 'security' | 'users'

type SettingsData = Record<string, string | boolean | number>

const emptyUserForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'VIEWER',
  status: 'ACTIVE',
}

const formatLabel = (value?: string) => {
  if (!value) return 'Unknown'

  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

const formatDateTime = (value?: string) => {
  if (!value) return 'Never'

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

const getRoleClass = (role?: string) => {
  switch (role?.toUpperCase()) {
    case 'SUPER_ADMIN':
      return 'settings-badge--purple'

    case 'IT_ADMIN':
      return 'settings-badge--primary'

    case 'VIEWER':
      return 'settings-badge--neutral'

    default:
      return 'settings-badge--neutral'
  }
}

const getStatusClass = (status?: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'settings-badge--success'

    case 'INACTIVE':
    case 'DISABLED':
      return 'settings-badge--danger'

    case 'PENDING':
      return 'settings-badge--warning'

    default:
      return 'settings-badge--neutral'
  }
}

interface TabButtonProps {
  active: boolean
  icon: ReactNode
  label: string
  description: string
  onClick: () => void
}

function TabButton({
  active,
  icon,
  label,
  description,
  onClick,
}: TabButtonProps) {
  return (
    <button
      type="button"
      className={`settings-tab ${active ? 'settings-tab--active' : ''}`}
      onClick={onClick}
    >
      <span className="settings-tab__icon">{icon}</span>

      <span className="settings-tab__content">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  )
}

interface FieldRowProps {
  label: string
  description?: string
  children: ReactNode
}

function FieldRow({
  label,
  description,
  children,
}: FieldRowProps) {
  return (
    <div className="settings-field-row">
      <div className="settings-field-row__label">
        <label>{label}</label>

        {description && <p>{description}</p>}
      </div>

      <div className="settings-field-row__control">{children}</div>
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>('general')

  const [settings, setSettings] = useState<SettingsData>({})
  const [users, setUsers] = useState<SystemUser[]>([])
  const [userForm, setUserForm] =
    useState<UserForm>(emptyUserForm)

  const [editingUser, setEditingUser] =
    useState<SystemUser | null>(null)
  const [permissionUser, setPermissionUser] = useState<SystemUser | null>(null)

  const [isSettingsLoading, setIsSettingsLoading] =
    useState(false)

  const [isUsersLoading, setIsUsersLoading] = useState(false)
  const [isSavingSettings, setIsSavingSettings] =
    useState(false)

  const [isSavingUser, setIsSavingUser] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const currentUser = loadSession(false)?.user
  const role = currentUser?.role
  const isSuperAdmin = role === 'SUPER_ADMIN'

  const clearNotification = () => {
    setMessage('')
    setError('')
  }

  const showSuccess = (value: string) => {
    setError('')
    setMessage(value)
  }

  const showError = (value: string) => {
    setMessage('')
    setError(value)
  }

  const loadSettings = useCallback(async () => {
    try {
      setIsSettingsLoading(true)
      setError('')

      const response = await api.get<SettingsData>('/settings')

      setSettings(response ?? {})
      if (response?.currency) setDisplayCurrency(String(response.currency))
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load settings.',
      )
    } finally {
      setIsSettingsLoading(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isSuperAdmin) return

    try {
      setIsUsersLoading(true)
      setError('')

      const response = await api.get<SystemUser[]>('/users')

      setUsers(Array.isArray(response) ? response : [])
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load users.',
      )
    } finally {
      setIsUsersLoading(false)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (isSuperAdmin) {
      void loadUsers()
    }
  }, [isSuperAdmin, loadUsers])

  useEffect(() => {
    if (!isSuperAdmin && tab === 'users') {
      setTab('general')
    }
  }, [isSuperAdmin, tab])

  const setSetting = (
    key: string,
    value: string | boolean | number,
  ) => {
    setSettings(currentSettings => ({
      ...currentSettings,
      [key]: value,
    }))
  }

  const validateGeneralSettings = () => {
    if (!String(settings.companyName ?? '').trim()) {
      return 'Company name is required.'
    }

    if (!String(settings.systemName ?? '').trim()) {
      return 'System name is required.'
    }

    if (!String(settings.timezone ?? '').trim()) {
      return 'Timezone is required.'
    }

    if (!String(settings.currency ?? '').trim()) {
      return 'Currency is required.'
    }

    return ''
  }

  const validateSecuritySettings = () => {
    const timeout = Number(settings.sessionTimeoutMinutes ?? 30)
    const expiry = Number(settings.passwordExpiryDays ?? 90)

    if (!Number.isFinite(timeout) || timeout < 1) {
      return 'Session timeout must be at least 1 minute.'
    }

    if (!Number.isFinite(expiry) || expiry < 1) {
      return 'Password expiry must be at least 1 day.'
    }

    return ''
  }

  const saveSettings = async () => {
    clearNotification()

    const validationError =
      tab === 'security'
        ? validateSecuritySettings()
        : validateGeneralSettings()

    if (validationError) {
      showError(validationError)
      return
    }

    try {
      setIsSavingSettings(true)

      await api.put('/settings', settings)
      setDisplayCurrency(String(settings.currency ?? 'PKR'))

      showSuccess('Settings saved successfully.')
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save settings.',
      )
    } finally {
      setIsSavingSettings(false)
    }
  }

  const resetUserForm = () => {
    setEditingUser(null)
    setUserForm(emptyUserForm)
    setShowPassword(false)
  }

  const validateUserForm = () => {
    if (!userForm.name.trim()) {
      return 'User name is required.'
    }

    if (!userForm.email.trim()) {
      return 'Email address is required.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailPattern.test(userForm.email.trim())) {
      return 'Enter a valid email address.'
    }

    if (!editingUser && userForm.password.length < 8) {
      return 'Initial password must contain at least 8 characters.'
    }

    if (!userForm.role) {
      return 'User role is required.'
    }

    return ''
  }

  const saveUser = async () => {
    clearNotification()

    const validationError = validateUserForm()

    if (validationError) {
      showError(validationError)
      return
    }

    try {
      setIsSavingUser(true)

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, {
          name: userForm.name.trim(),
          role: userForm.role,
          status: userForm.status,
        })

        showSuccess('User updated successfully.')
      } else {
        await api.post('/users', {
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
          status: userForm.status,
        })

        showSuccess('User created successfully.')
      }

      resetUserForm()
      await loadUsers()
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save user.',
      )
    } finally {
      setIsSavingUser(false)
    }
  }

  const editUser = (user: SystemUser) => {
    clearNotification()
    setEditingUser(user)

    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const removeUser = async (user: SystemUser) => {
    clearNotification()

    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} (${user.email})?`,
    )

    if (!confirmed) return

    try {
      setDeletingUserId(user.id)

      await api.delete(`/users/${user.id}`)

      if (editingUser?.id === user.id) {
        resetUserForm()
      }

      await loadUsers()
      showSuccess('User deleted successfully.')
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete user.',
      )
    } finally {
      setDeletingUserId('')
    }
  }

  const sortedUsers = useMemo(() => {
    return [...users].sort((first, second) => {
      if (first.id === currentUser?.id) return -1
      if (second.id === currentUser?.id) return 1

      return first.name.localeCompare(second.name)
    })
  }, [users, currentUser?.id])

  const activeUsers = useMemo(() => {
    return users.filter(
      user => user.status?.toUpperCase() === 'ACTIVE',
    ).length
  }, [users])

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <p className="settings-header__eyebrow">
            System administration
          </p>

          <h1>Settings</h1>

          <p className="settings-header__description">
            Manage company preferences, security policies and user
            access.
          </p>
        </div>

        <button
          type="button"
          className="settings-refresh-button"
          onClick={() => {
            void loadSettings()

            if (isSuperAdmin) {
              void loadUsers()
            }
          }}
          disabled={isSettingsLoading || isUsersLoading}
        >
          <RefreshCw
            size={17}
            className={
              isSettingsLoading || isUsersLoading
                ? 'settings-spin'
                : ''
            }
          />

          Refresh
        </button>
      </header>

      {(message || error) && (
        <div
          className={`settings-alert ${
            error
              ? 'settings-alert--error'
              : 'settings-alert--success'
          }`}
          role="alert"
        >
          <div className="settings-alert__content">
            {error ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}

            <div>
              <strong>
                {error ? 'Action failed' : 'Success'}
              </strong>

              <p>{error || message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={clearNotification}
            aria-label="Dismiss notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar__header">
            <UserCog size={20} />

            <div>
              <strong>Configuration</strong>
              <span>System preferences</span>
            </div>
          </div>

          <nav className="settings-tabs">
            <TabButton
              active={tab === 'general'}
              icon={<Globe2 size={18} />}
              label="General"
              description="Company and regional settings"
              onClick={() => {
                clearNotification()
                setTab('general')
              }}
            />

            <TabButton
              active={tab === 'security'}
              icon={<ShieldCheck size={18} />}
              label="Security"
              description="Sessions and authentication"
              onClick={() => {
                clearNotification()
                setTab('security')
              }}
            />

            {isSuperAdmin && (
              <TabButton
                active={tab === 'users'}
                icon={<Users size={18} />}
                label="User Management"
                description="Roles and system access"
                onClick={() => {
                  clearNotification()
                  setTab('users')
                }}
              />
            )}
          </nav>

          <div className="settings-sidebar__account">
            <span>Signed in as</span>
            <strong>{currentUser?.name || 'System User'}</strong>
            <small>{formatLabel(role)}</small>
          </div>
        </aside>

        <main className="settings-content">
          {isSettingsLoading && tab !== 'users' ? (
            <div className="settings-loading">
              <LoaderCircle
                size={30}
                className="settings-spin"
              />

              <p>Loading settings...</p>
            </div>
          ) : (
            <>
              {tab === 'general' && (
                <div className="settings-section">
                  <div className="settings-section__header">
                    <div className="settings-section__icon">
                      <Globe2 size={21} />
                    </div>

                    <div>
                      <h2>General Settings</h2>

                      <p>
                        Configure company identity, region and
                        formatting preferences.
                      </p>
                    </div>
                  </div>

                  <div className="settings-section__body">
                    <FieldRow
                      label="Company Name"
                      description="The legal or display name of your organisation."
                    >
                      <input
                        className="settings-input"
                        value={String(
                          settings.companyName ?? '',
                        )}
                        onChange={event =>
                          setSetting(
                            'companyName',
                            event.target.value,
                          )
                        }
                        placeholder="EFU General Insurance"
                      />
                    </FieldRow>

                    <FieldRow
                      label="System Name"
                      description="The name displayed throughout the application."
                    >
                      <input
                        className="settings-input"
                        value={String(
                          settings.systemName ?? '',
                        )}
                        onChange={event =>
                          setSetting(
                            'systemName',
                            event.target.value,
                          )
                        }
                        placeholder="IT Hardware Inventory System"
                      />
                    </FieldRow>

                    <FieldRow
                      label="Timezone"
                      description="Used for reports, audit logs and transaction times."
                    >
                      <select
                        className="settings-input"
                        value={String(
                          settings.timezone ?? 'Asia/Karachi',
                        )}
                        onChange={event =>
                          setSetting(
                            'timezone',
                            event.target.value,
                          )
                        }
                      >
                        <option value="Asia/Karachi">
                          Asia/Karachi
                        </option>

                        <option value="UTC">UTC</option>

                        <option value="Asia/Dubai">
                          Asia/Dubai
                        </option>

                        <option value="Europe/London">
                          Europe/London
                        </option>

                        <option value="America/New_York">
                          America/New York
                        </option>
                      </select>
                    </FieldRow>

                    <FieldRow
                      label="Date Format"
                      description="Controls how dates are shown throughout the system."
                    >
                      <select
                        className="settings-input"
                        value={String(
                          settings.dateFormat ?? 'dd MMM yyyy',
                        )}
                        onChange={event =>
                          setSetting(
                            'dateFormat',
                            event.target.value,
                          )
                        }
                      >
                        <option value="dd MMM yyyy">
                          04 Aug 2026
                        </option>

                        <option value="dd/MM/yyyy">
                          04/08/2026
                        </option>

                        <option value="MM/dd/yyyy">
                          08/04/2026
                        </option>

                        <option value="yyyy-MM-dd">
                          2026-08-04
                        </option>
                      </select>
                    </FieldRow>

                    <FieldRow
                      label="Currency"
                      description="Display currency for all asset prices and exported reports. Stored values remain safely based in PKR."
                    >
                      <select
                        className="settings-input"
                        value={String(
                          settings.currency ?? 'PKR',
                        )}
                        onChange={event => {
                          setSetting('currency', event.target.value)
                          setDisplayCurrency(event.target.value)
                        }}
                      >
                        {CURRENCY_OPTIONS.map(option => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FieldRow>
                  </div>

                  <div className="settings-section__footer">
                    <button
                      type="button"
                      className="settings-primary-button"
                      onClick={() => void saveSettings()}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? (
                        <LoaderCircle
                          size={17}
                          className="settings-spin"
                        />
                      ) : (
                        <Save size={17} />
                      )}

                      {isSavingSettings
                        ? 'Saving...'
                        : 'Save General Settings'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'security' && (
                <div className="settings-section">
                  <div className="settings-section__header">
                    <div className="settings-section__icon">
                      <LockKeyhole size={21} />
                    </div>

                    <div>
                      <h2>Security Settings</h2>

                      <p>
                        Configure authentication and session
                        protection policies.
                      </p>
                    </div>
                  </div>

                  <div className="settings-section__body">
                    <FieldRow
                      label="Two-Factor Authentication"
                      description="Require an additional verification step during login."
                    >
                      <label className="settings-switch">
                        <input
                          type="checkbox"
                          checked={Boolean(
                            settings.twoFactorAuthentication,
                          )}
                          onChange={event =>
                            setSetting(
                              'twoFactorAuthentication',
                              event.target.checked,
                            )
                          }
                        />

                        <span className="settings-switch__track">
                          <span className="settings-switch__thumb" />
                        </span>

                        <span className="settings-switch__label">
                          {Boolean(
                            settings.twoFactorAuthentication,
                          )
                            ? 'Enabled'
                            : 'Disabled'}
                        </span>
                      </label>
                    </FieldRow>

                    <FieldRow
                      label="Session Timeout"
                      description="Automatically sign users out after inactivity."
                    >
                      <div className="settings-number-input">
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={Number(
                            settings.sessionTimeoutMinutes ?? 30,
                          )}
                          onChange={event =>
                            setSetting(
                              'sessionTimeoutMinutes',
                              Number(event.target.value),
                            )
                          }
                        />

                        <span>minutes</span>
                      </div>
                    </FieldRow>

                    <FieldRow
                      label="Password Expiry"
                      description="Require users to change passwords periodically."
                    >
                      <div className="settings-number-input">
                        <input
                          type="number"
                          min={1}
                          max={365}
                          value={Number(
                            settings.passwordExpiryDays ?? 90,
                          )}
                          onChange={event =>
                            setSetting(
                              'passwordExpiryDays',
                              Number(event.target.value),
                            )
                          }
                        />

                        <span>days</span>
                      </div>
                    </FieldRow>
                  </div>

                  <div className="settings-section__footer">
                    <button
                      type="button"
                      className="settings-primary-button"
                      onClick={() => void saveSettings()}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? (
                        <LoaderCircle
                          size={17}
                          className="settings-spin"
                        />
                      ) : (
                        <Save size={17} />
                      )}

                      {isSavingSettings
                        ? 'Saving...'
                        : 'Save Security Settings'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'users' && isSuperAdmin && (
            <div className="settings-users">
              <div className="settings-users-summary">
                <article>
                  <div className="settings-users-summary__icon">
                    <Users size={21} />
                  </div>

                  <div>
                    <span>Total Users</span>
                    <strong>{users.length}</strong>
                  </div>
                </article>

                <article>
                  <div className="settings-users-summary__icon">
                    <CheckCircle2 size={21} />
                  </div>

                  <div>
                    <span>Active Users</span>
                    <strong>{activeUsers}</strong>
                  </div>
                </article>

                <article>
                  <div className="settings-users-summary__icon">
                    <ShieldCheck size={21} />
                  </div>

                  <div>
                    <span>Administrators</span>
                    <strong>
                      {
                        users.filter(user =>
                          user.role
                            ?.toUpperCase()
                            .includes('ADMIN'),
                        ).length
                      }
                    </strong>
                  </div>
                </article>
              </div>

              <div className="settings-user-form-card">
                <div className="settings-user-form-card__header">
                  <div>
                    <h2>
                      {editingUser
                        ? 'Edit User'
                        : 'Add New User'}
                    </h2>

                    <p>
                      {editingUser
                        ? 'Update the selected user account and permissions.'
                        : 'Create a new account and assign its system role.'}
                    </p>
                  </div>

                  {editingUser && (
                    <button
                      type="button"
                      className="settings-secondary-button"
                      onClick={resetUserForm}
                    >
                      <X size={16} />
                      Cancel Editing
                    </button>
                  )}
                </div>

                <div className="settings-user-form">
                  <div className="settings-form-field">
                    <label htmlFor="user-name">Full Name</label>

                    <input
                      id="user-name"
                      className="settings-input"
                      autoComplete="off"
                      placeholder="Enter full name"
                      value={userForm.name}
                      onChange={event =>
                        setUserForm(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="settings-form-field">
                    <label htmlFor="user-email">
                      Email Address
                    </label>

                    <input
                      id="user-email"
                      className="settings-input"
                      type="email"
                      autoComplete="off"
                      disabled={Boolean(editingUser)}
                      placeholder="name@company.com"
                      value={userForm.email}
                      onChange={event =>
                        setUserForm(current => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>

                  {!editingUser && (
                    <div className="settings-form-field">
                      <label htmlFor="user-password">
                        Initial Password
                      </label>

                      <div className="settings-password-input">
                        <input
                          id="user-password"
                          type={
                            showPassword ? 'text' : 'password'
                          }
                          autoComplete="new-password"
                          placeholder="Minimum 8 characters"
                          value={userForm.password}
                          onChange={event =>
                            setUserForm(current => ({
                              ...current,
                              password: event.target.value,
                            }))
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword(value => !value)
                          }
                          aria-label={
                            showPassword
                              ? 'Hide password'
                              : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="settings-form-field">
                    <label htmlFor="user-role">Role</label>

                    <select
                      id="user-role"
                      className="settings-input"
                      value={userForm.role}
                      onChange={event =>
                        setUserForm(current => ({
                          ...current,
                          role: event.target.value,
                        }))
                      }
                    >
                      <option value="SUPER_ADMIN">
                        Super Admin
                      </option>

                      <option value="IT_ADMIN">
                        IT Admin
                      </option>

                      <option value="VIEWER">Viewer</option>
                    </select>
                  </div>

                  {editingUser && (
                    <div className="settings-form-field">
                      <label htmlFor="user-status">Status</label>

                      <select
                        id="user-status"
                        className="settings-input"
                        value={userForm.status}
                        onChange={event =>
                          setUserForm(current => ({
                            ...current,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">
                          Inactive
                        </option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="settings-user-form-card__footer">
                  <button
                    type="button"
                    className="settings-primary-button"
                    onClick={() => void saveUser()}
                    disabled={isSavingUser}
                  >
                    {isSavingUser ? (
                      <LoaderCircle
                        size={17}
                        className="settings-spin"
                      />
                    ) : editingUser ? (
                      <Save size={17} />
                    ) : (
                      <Plus size={17} />
                    )}

                    {isSavingUser
                      ? 'Saving...'
                      : editingUser
                        ? 'Update User'
                        : 'Add User'}
                  </button>
                </div>
              </div>

              <div className="settings-users-table-card">
                <div className="settings-users-table-card__header">
                  <div>
                    <h2>System Users</h2>

                    <p>
                      Review account roles, status and recent login
                      activity.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="settings-secondary-button"
                    onClick={() => void loadUsers()}
                    disabled={isUsersLoading}
                  >
                    <RefreshCw
                      size={16}
                      className={
                        isUsersLoading ? 'settings-spin' : ''
                      }
                    />

                    Refresh
                  </button>
                </div>

                {isUsersLoading ? (
                  <div className="settings-loading">
                    <LoaderCircle
                      size={30}
                      className="settings-spin"
                    />

                    <p>Loading users...</p>
                  </div>
                ) : sortedUsers.length === 0 ? (
                  <div className="settings-empty">
                    <Users size={30} />

                    <h3>No users found</h3>

                    <p>
                      Create the first user using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="settings-table-wrapper">
                    <table className="settings-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last Login</th>
                          <th className="settings-table__actions">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedUsers.map(user => (
                          <tr key={user.id}>
                            <td>
                              <div className="settings-user-cell">
                                <div className="settings-user-cell__avatar">
                                  {user.name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {user.name}

                                    {user.id === currentUser?.id && (
                                      <span className="settings-current-user">
                                        You
                                      </span>
                                    )}
                                  </strong>

                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span
                                className={`settings-badge ${getRoleClass(
                                  user.role,
                                )}`}
                              >
                                {formatLabel(user.role)}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`settings-badge ${getStatusClass(
                                  user.status,
                                )}`}
                              >
                                {formatLabel(user.status)}
                              </span>
                            </td>

                            <td>
                              <span className="settings-last-login">
                                {formatDateTime(user.lastLoginAt)}
                              </span>
                            </td>

                            <td className="settings-table__actions">
                              <div className="settings-action-buttons">
                                <button
                                  type="button"
                                  className="settings-icon-button settings-icon-button--edit"
                                  onClick={() => editUser(user)}
                                  aria-label={`Edit ${user.email}`}
                                  title="Edit user"
                                >
                                  <Pencil size={16} />
                                </button>

                                {user.role === 'IT_ADMIN' && (
                                  <button
                                    type="button"
                                    className="settings-secondary-button"
                                    onClick={() => setPermissionUser(user)}
                                    aria-label={`Manage permissions for ${user.email}`}
                                    title="Manage Permissions"
                                  >
                                    <ShieldCheck size={16} /> Manage Permissions
                                  </button>
                                )}

                                {user.id !== currentUser?.id && (
                                  <button
                                    type="button"
                                    className="settings-icon-button settings-icon-button--delete"
                                    onClick={() =>
                                      void removeUser(user)
                                    }
                                    disabled={
                                      deletingUserId === user.id
                                    }
                                    aria-label={`Delete ${user.email}`}
                                    title="Delete user"
                                  >
                                    {deletingUserId === user.id ? (
                                      <LoaderCircle
                                        size={16}
                                        className="settings-spin"
                                      />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      {permissionUser && (
        <PermissionDialog
          user={permissionUser}
          onClose={() => setPermissionUser(null)}
          onSaved={showSuccess}
        />
      )}
    </section>
  )
}
