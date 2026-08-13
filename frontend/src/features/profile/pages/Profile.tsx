import {
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  authApi,
  loadSession,
  updateStoredUser,
  type User,
} from '../../../lib/api'
import './Profile.css'

interface ProfileForm {
  name: string
  employeeCode: string
  phone: string
}

interface PasswordForm {
  current: string
  next: string
  confirm: string
}

interface ProfileFieldProps {
  icon: ReactNode
  label: string
  value: string
  editing?: boolean
  children?: ReactNode
}

function ProfileField({
  icon,
  label,
  value,
  editing = false,
  children,
}: ProfileFieldProps) {
  return (
    <div className="profile-field">
      <div className="profile-field__icon">{icon}</div>

      <div className="profile-field__content">
        <span>{label}</span>

        {editing ? children : <strong>{value || '—'}</strong>}
      </div>
    </div>
  )
}

const formatRole = (role?: string) => {
  if (!role) return 'User'

  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase())
}

const getInitials = (name?: string) => {
  if (!name?.trim()) return 'U'

  return name
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const getPasswordStrength = (password: string) => {
  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (!password) {
    return {
      score: 0,
      label: 'No password entered',
      className: '',
    }
  }

  if (score <= 2) {
    return {
      score,
      label: 'Weak',
      className: 'profile-strength--weak',
    }
  }

  if (score <= 4) {
    return {
      score,
      label: 'Medium',
      className: 'profile-strength--medium',
    }
  }

  return {
    score,
    label: 'Strong',
    className: 'profile-strength--strong',
  }
}

export default function Profile() {
  const storedUser = loadSession(false)?.user ?? null

  const [user, setUser] = useState<User | null>(storedUser)

  const [form, setForm] = useState<ProfileForm>({
    name: storedUser?.name ?? '',
    employeeCode: storedUser?.employeeCode ?? '',
    phone: storedUser?.phone ?? '',
  })

  const [passwords, setPasswords] = useState<PasswordForm>({
    current: '',
    next: '',
    confirm: '',
  })

  const [editing, setEditing] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] =
    useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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

  const syncProfileForm = useCallback((nextUser: User) => {
    setForm({
      name: nextUser.name ?? '',
      employeeCode: nextUser.employeeCode ?? '',
      phone: nextUser.phone ?? '',
    })
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      clearNotification()

      const nextUser = await authApi.me()

      setUser(nextUser)
      syncProfileForm(nextUser)
      updateStoredUser(nextUser)
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load your profile.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [syncProfileForm])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const initials = useMemo(
    () => getInitials(user?.name),
    [user?.name],
  )

  const passwordStrength = useMemo(
    () => getPasswordStrength(passwords.next),
    [passwords.next],
  )

  const startEditing = () => {
    if (user) {
      syncProfileForm(user)
    }

    clearNotification()
    setEditing(true)
  }

  const cancelEditing = () => {
    if (user) {
      syncProfileForm(user)
    }

    clearNotification()
    setEditing(false)
  }

  const validateProfile = () => {
    if (!form.name.trim()) {
      return 'Full name is required.'
    }

    if (form.name.trim().length < 2) {
      return 'Full name must contain at least 2 characters.'
    }

    if (form.phone.trim() && form.phone.trim().length < 7) {
      return 'Enter a valid phone number.'
    }

    return ''
  }

  const saveProfile = async () => {
    clearNotification()

    const validationError = validateProfile()

    if (validationError) {
      showError(validationError)
      return
    }

    try {
      setIsSavingProfile(true)

      const nextUser = await authApi.updateProfile({
        name: form.name.trim(),
        employeeCode: form.employeeCode.trim(),
        phone: form.phone.trim(),
      })

      setUser(nextUser)
      syncProfileForm(nextUser)
      updateStoredUser(nextUser)
      setEditing(false)
      showSuccess('Profile updated successfully.')
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update profile.',
      )
    } finally {
      setIsSavingProfile(false)
    }
  }

  const validatePassword = () => {
    if (!passwords.current) {
      return 'Current password is required.'
    }

    if (!passwords.next) {
      return 'New password is required.'
    }

    if (passwords.next.length < 8) {
      return 'New password must contain at least 8 characters.'
    }

    if (passwords.current === passwords.next) {
      return 'New password must be different from the current password.'
    }

    if (passwords.next !== passwords.confirm) {
      return 'New password and confirmation do not match.'
    }

    return ''
  }

  const changePassword = async () => {
    clearNotification()

    const validationError = validatePassword()

    if (validationError) {
      showError(validationError)
      return
    }

    try {
      setIsChangingPassword(true)

      await authApi.changePassword(
        passwords.current,
        passwords.next,
      )

      setPasswords({
        current: '',
        next: '',
        confirm: '',
      })

      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)

      showSuccess('Password changed successfully.')
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to change password.',
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoading && !user) {
    return (
      <section className="profile-page">
        <div className="profile-loading">
          <LoaderCircle size={34} className="profile-spin" />
          <p>Loading your profile...</p>
        </div>
      </section>
    )
  }

  return (
    <section className="profile-page">
      <header className="profile-page-header">
        <div>
          <p className="profile-page-header__eyebrow">
            Account settings
          </p>

          <h1>My Profile</h1>

          <p className="profile-page-header__description">
            Review your personal information, employee details and
            account security.
          </p>
        </div>

        <button
          type="button"
          className="profile-secondary-button"
          onClick={() => void loadProfile()}
          disabled={isLoading}
        >
          <RefreshCw
            size={17}
            className={isLoading ? 'profile-spin' : ''}
          />
          Refresh
        </button>
      </header>

      {(message || error) && (
        <div
          className={`profile-alert ${
            error
              ? 'profile-alert--error'
              : 'profile-alert--success'
          }`}
          role="alert"
        >
          <div className="profile-alert__content">
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

      <div className="profile-layout">
        <main className="profile-main">
          <article className="profile-card">
            <div className="profile-cover">
              <div className="profile-cover__pattern" />
            </div>

            <div className="profile-card__body">
              <div className="profile-avatar-row">
                <div className="profile-avatar">
                  <span>{initials}</span>

                  <div
                    className="profile-avatar__status"
                    title="Active account"
                  >
                    <CheckCircle2 size={15} />
                  </div>
                </div>

                <div className="profile-heading">
                  <div className="profile-heading__title">
                    <div>
                      <h2>{user?.name || 'System User'}</h2>

                      <div className="profile-role">
                        <ShieldCheck size={14} />
                        {formatRole(user?.role)}
                      </div>
                    </div>

                    {!editing ? (
                      <button
                        type="button"
                        className="profile-primary-button"
                        onClick={startEditing}
                      >
                        <Pencil size={16} />
                        Edit Profile
                      </button>
                    ) : (
                      <div className="profile-edit-actions">
                        <button
                          type="button"
                          className="profile-secondary-button"
                          onClick={cancelEditing}
                          disabled={isSavingProfile}
                        >
                          <X size={16} />
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="profile-primary-button"
                          onClick={() => void saveProfile()}
                          disabled={isSavingProfile}
                        >
                          {isSavingProfile ? (
                            <LoaderCircle
                              size={16}
                              className="profile-spin"
                            />
                          ) : (
                            <Save size={16} />
                          )}

                          {isSavingProfile
                            ? 'Saving...'
                            : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  <p>
                    Keep your account information accurate and
                    up-to-date.
                  </p>
                </div>
              </div>

              <div className="profile-details">
                <ProfileField
                  icon={<UserRound size={18} />}
                  label="Full Name"
                  value={user?.name || '—'}
                  editing={editing}
                >
                  <input
                    className="profile-input"
                    value={form.name}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />
                </ProfileField>

                <ProfileField
                  icon={<BadgeCheck size={18} />}
                  label="Employee ID"
                  value={user?.employeeCode || '—'}
                  editing={editing}
                >
                  <input
                    className="profile-input"
                    value={form.employeeCode}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        employeeCode: event.target.value,
                      }))
                    }
                    placeholder="Enter employee ID"
                    autoComplete="off"
                  />
                </ProfileField>

                <ProfileField
                  icon={<Mail size={18} />}
                  label="Email Address"
                  value={user?.email || '—'}
                />

                <ProfileField
                  icon={<Phone size={18} />}
                  label="Phone Number"
                  value={user?.phone || '—'}
                  editing={editing}
                >
                  <input
                    className="profile-input"
                    value={form.phone}
                    onChange={event =>
                      setForm(current => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="Enter phone number"
                    autoComplete="tel"
                  />
                </ProfileField>

                <ProfileField
                  icon={<BriefcaseBusiness size={18} />}
                  label="Department"
                  value={user?.department || '—'}
                />

                <ProfileField
                  icon={<MapPin size={18} />}
                  label="Location"
                  value={user?.location || '—'}
                />
              </div>

              {editing && (
                <div className="profile-mobile-save">
                  <button
                    type="button"
                    className="profile-secondary-button"
                    onClick={cancelEditing}
                    disabled={isSavingProfile}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-primary-button"
                    onClick={() => void saveProfile()}
                    disabled={isSavingProfile}
                  >
                    {isSavingProfile ? (
                      <LoaderCircle
                        size={16}
                        className="profile-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </article>

          <article className="profile-security-card">
            <div className="profile-section-header">
              <div className="profile-section-header__icon">
                <KeyRound size={21} />
              </div>

              <div>
                <h2>Change Password</h2>

                <p>
                  Use a strong password that you do not use on other
                  websites.
                </p>
              </div>
            </div>

            <div className="profile-password-form">
              <div className="profile-form-field">
                <label htmlFor="current-password">
                  Current Password
                </label>

                <div className="profile-password-input">
                  <input
                    id="current-password"
                    type={
                      showCurrentPassword ? 'text' : 'password'
                    }
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    value={passwords.current}
                    onChange={event =>
                      setPasswords(current => ({
                        ...current,
                        current: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(value => !value)
                    }
                    aria-label={
                      showCurrentPassword
                        ? 'Hide current password'
                        : 'Show current password'
                    }
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              <div className="profile-form-field">
                <label htmlFor="new-password">
                  New Password
                </label>

                <div className="profile-password-input">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    value={passwords.next}
                    onChange={event =>
                      setPasswords(current => ({
                        ...current,
                        next: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword(value => !value)
                    }
                    aria-label={
                      showNewPassword
                        ? 'Hide new password'
                        : 'Show new password'
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              <div className="profile-form-field">
                <label htmlFor="confirm-password">
                  Confirm New Password
                </label>

                <div className="profile-password-input">
                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword ? 'text' : 'password'
                    }
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    value={passwords.confirm}
                    onChange={event =>
                      setPasswords(current => ({
                        ...current,
                        confirm: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(value => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? 'Hide confirmation password'
                        : 'Show confirmation password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {passwords.next && (
              <div className="profile-strength">
                <div className="profile-strength__header">
                  <span>Password strength</span>

                  <strong className={passwordStrength.className}>
                    {passwordStrength.label}
                  </strong>
                </div>

                <div className="profile-strength__bars">
                  {[1, 2, 3, 4, 5, 6].map(level => (
                    <span
                      key={level}
                      className={
                        level <= passwordStrength.score
                          ? passwordStrength.className
                          : ''
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="profile-password-requirements">
              <strong>Your password should include:</strong>

              <div>
                <span
                  className={
                    passwords.next.length >= 8
                      ? 'profile-requirement--valid'
                      : ''
                  }
                >
                  <CheckCircle2 size={14} />
                  At least 8 characters
                </span>

                <span
                  className={
                    /[A-Z]/.test(passwords.next)
                      ? 'profile-requirement--valid'
                      : ''
                  }
                >
                  <CheckCircle2 size={14} />
                  One uppercase letter
                </span>

                <span
                  className={
                    /\d/.test(passwords.next)
                      ? 'profile-requirement--valid'
                      : ''
                  }
                >
                  <CheckCircle2 size={14} />
                  One number
                </span>

                <span
                  className={
                    /[^A-Za-z0-9]/.test(passwords.next)
                      ? 'profile-requirement--valid'
                      : ''
                  }
                >
                  <CheckCircle2 size={14} />
                  One special character
                </span>
              </div>
            </div>

            <div className="profile-security-card__footer">
              <button
                type="button"
                className="profile-primary-button"
                onClick={() => void changePassword()}
                disabled={
                  isChangingPassword ||
                  !passwords.current ||
                  !passwords.next ||
                  !passwords.confirm
                }
              >
                {isChangingPassword ? (
                  <LoaderCircle
                    size={17}
                    className="profile-spin"
                  />
                ) : (
                  <KeyRound size={17} />
                )}

                {isChangingPassword
                  ? 'Changing Password...'
                  : 'Change Password'}
              </button>
            </div>
          </article>
        </main>

        <aside className="profile-sidebar">
          <article className="profile-account-card">
            <div className="profile-account-card__icon">
              <ShieldCheck size={23} />
            </div>

            <h3>Account Overview</h3>

            <div className="profile-account-list">
              <div>
                <span>Account Status</span>

                <strong className="profile-status-active">
                  <span />
                  Active
                </strong>
              </div>

              <div>
                <span>Access Level</span>
                <strong>{formatRole(user?.role)}</strong>
              </div>

              <div>
                <span>Employee ID</span>
                <strong>{user?.employeeCode || 'Not assigned'}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{user?.department || 'Not assigned'}</strong>
              </div>
            </div>
          </article>

          <article className="profile-help-card">
            <div className="profile-help-card__icon">
              <Building2 size={21} />
            </div>

            <div>
              <h3>Profile Information</h3>

              <p>
                Email address, department and location may be managed
                by your system administrator.
              </p>
            </div>
          </article>
        </aside>
      </div>
    </section>
  )
}