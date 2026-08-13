import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../../lib/api'
import { hasPermission } from '../../../auth/permissions'

type FieldType = 'text' | 'email' | 'number' | 'textarea' | 'select'

type Field = {
  key: string
  label: string
  type?: FieldType
  options?: string[]
  required?: boolean
}

type MasterConfig = {
  title: string
  fields: Field[]
  rowKeys: string[]
}

type MasterRow = Record<string, string>
type ApiRow = Record<string, unknown>

const statusField: Field = {
  key: 'status',
  label: 'Status',
  type: 'select',
  options: ['Active', 'Inactive'],
  required: true,
}

const masterConfigs: Record<string, MasterConfig> = {
  'asset-type': {
    title: 'Asset Type',
    rowKeys: ['name', 'prefix', 'description', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'prefix', label: 'Prefix', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      statusField,
    ],
  },
  'asset-make': {
    title: 'Asset Make',
    rowKeys: ['name', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      statusField,
    ],
  },
  motherboard: {
    title: 'Motherboard / Processor',
    rowKeys: ['name', 'generation', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'generation', label: 'Generation' },
      statusField,
    ],
  },
  memory: {
    title: 'Memory',
    rowKeys: ['size', 'type', 'status'],
    fields: [
      { key: 'size', label: 'Name', required: true },
      { key: 'type', label: 'Memory Type' },
      statusField,
    ],
  },
  storage: {
    title: 'Storage',
    rowKeys: ['type', 'capacity', 'status'],
    fields: [
      { key: 'type', label: 'Name', required: true },
      { key: 'capacity', label: 'Capacity', required: true },
      statusField,
    ],
  },
  'operating-system': {
    title: 'Operating System',
    rowKeys: ['name', 'version', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'version', label: 'Version' },
      statusField,
    ],
  },
  vendor: {
    title: 'Vendor',
    rowKeys: ['name', 'contact', 'phone', 'email', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'contact', label: 'Contact Person' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'ntn', label: 'NTN' },
      statusField,
    ],
  },
  province: {
    title: 'Province',
    rowKeys: ['name', 'status'],
    fields: [{ key: 'name', label: 'Name', required: true }, statusField],
  },
  city: {
    title: 'City',
    rowKeys: ['name', 'province', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'province', label: 'Province', type: 'select', required: true },
      statusField,
    ],
  },
  location: {
    title: 'Location',
    rowKeys: ['name', 'province', 'city', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'province', label: 'Province', type: 'select' },
      { key: 'city', label: 'City', type: 'select' },
      statusField,
    ],
  },
  department: {
    title: 'Department',
    rowKeys: ['name', 'status'],
    fields: [{ key: 'name', label: 'Name', required: true }, statusField],
  },
  office: {
    title: 'Office',
    rowKeys: ['name', 'location', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'location', label: 'Location', type: 'select' },
      statusField,
    ],
  },
  employee: {
    title: 'Employee',
    rowKeys: ['name', 'empId', 'email', 'department', 'location', 'status'],
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'empId', label: 'Employee ID', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'department', label: 'Department', type: 'select' },
      { key: 'location', label: 'Location', type: 'select' },
      { key: 'office', label: 'Office', type: 'select' },
      statusField,
    ],
  },
  'lifecycle-policy': {
    title: 'Lifecycle Policy',
    rowKeys: ['assetType', 'lifespan', 'warranty', 'depreciation', 'salvage', 'eolAction'],
    fields: [
      { key: 'assetType', label: 'Name', type: 'select', required: true },
      { key: 'lifespan', label: 'Expected Lifespan (Years)', type: 'number', required: true },
      { key: 'warranty', label: 'Warranty Period (Years)', type: 'number', required: true },
      {
        key: 'depreciation',
        label: 'Depreciation Method',
        type: 'select',
        options: ['Straight Line', 'Declining Balance'],
        required: true,
      },
      { key: 'salvage', label: 'Salvage Value %', type: 'number', required: true },
      {
        key: 'eolAction',
        label: 'End of Life Action',
        type: 'select',
        options: ['Retire', 'Dispose', 'Donate', 'Sell', 'Repurpose'],
        required: true,
      },
    ],
  },
}

// Display field -> API foreign-key field.
const relationFields: Record<string, Record<string, string>> = {
  city: { province: 'provinceId' },
  location: { province: 'provinceId', city: 'cityId' },
  office: { location: 'locationId' },
  employee: {
    department: 'departmentId',
    location: 'locationId',
    office: 'officeId',
  },
  'lifecycle-policy': { assetType: 'assetTypeId' },
}

const lookupTypes: Record<string, string[]> = {
  city: ['province'],
  location: ['province', 'city'],
  office: ['location'],
  employee: ['department', 'location', 'office'],
  'lifecycle-policy': ['asset-type'],
}

function toTitleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function relationTypeFor(fieldKey: string): string {
  return fieldKey === 'assetType' ? 'asset-type' : fieldKey
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function mapApiRow(
  raw: ApiRow,
  screenKey: string,
  lookups: Record<string, MasterRow[]>,
): MasterRow {
  const row: MasterRow = {}

  // Keep only primitive response values. Nested API objects are not sent back in update requests.
  for (const [key, value] of Object.entries(raw)) {
    if (value == null || typeof value !== 'object') {
      row[key] = String(value ?? '')
    }
  }

  if (screenKey === 'employee') {
    row.empId = String(raw.employeeId ?? '')
  }

  if (screenKey === 'lifecycle-policy') {
    row.lifespan = String(raw.expectedLifespanYears ?? '')
    row.warranty = String(raw.warrantyPeriodYears ?? '')
    row.depreciation = String(raw.depreciationMethod ?? '').replaceAll('_', ' ')
    row.salvage = String(raw.salvageValuePercent ?? '')
    row.eolAction = String(raw.endOfLifeAction ?? '')
  }

  for (const [displayField, idField] of Object.entries(relationFields[screenKey] ?? {})) {
    const lookupType = relationTypeFor(displayField)
    const selectedId = String(raw[idField] ?? '')
    row[displayField] = lookups[lookupType]?.find((item) => item.id === selectedId)?.name ?? ''
  }

  if (row.status) row.status = toTitleCase(row.status.replaceAll('_', ' '))
  return row
}

/**
 * Creates a clean API body from the visible form fields only.
 * This intentionally excludes id, createdAt, updatedAt, deletedAt and isDeleted.
 * Sending those database fields previously caused the Asset Make PUT request to fail with HTTP 500.
 */
function buildPayload(
  values: MasterRow,
  screenKey: string,
  fields: Field[],
  lookups: Record<string, MasterRow[]>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  // Copy only fields that belong to the current form.
  for (const field of fields) {
    const value = values[field.key] ?? ''
    body[field.key] = field.type === 'number' ? Number(value) : value.trim()
  }

  if ('status' in body) {
    body.status = toTitleCase(String(body.status))
  }

  // Convert display names such as "Sindh" into their relation IDs.
  for (const [displayField, idField] of Object.entries(relationFields[screenKey] ?? {})) {
    const lookupType = relationTypeFor(displayField)
    const selectedName = String(values[displayField] ?? '')
    body[idField] = lookups[lookupType]?.find((item) => item.name === selectedName)?.id ?? null
    delete body[displayField]
  }

  if (screenKey === 'employee') {
    body.employeeId = values.empId.trim()
    delete body.empId
  }

  if (screenKey === 'lifecycle-policy') {
    body.expectedLifespanYears = Number(values.lifespan)
    body.warrantyPeriodYears = Number(values.warranty)
    body.depreciationMethod = values.depreciation.toUpperCase().replaceAll(' ', '_')
    body.salvageValuePercent = Number(values.salvage)
    body.endOfLifeAction = values.eolAction.toUpperCase()

    for (const oldKey of ['lifespan', 'warranty', 'depreciation', 'salvage', 'eolAction']) {
      delete body[oldKey]
    }
  }

  return body
}


const formControlStyle: CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '0 12px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const iconButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  borderRadius: 9,
  cursor: 'pointer',
}

function formatColumnLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
}

export default function MasterSetup({ screenKey }: { screenKey: string }) {
  const config = masterConfigs[screenKey]
  const permissionKind: Record<string,string> = { 'asset-type':'asset-types','asset-make':'asset-makes',motherboard:'motherboards',memory:'memory',storage:'storage','operating-system':'operating-systems',vendor:'vendors',province:'provinces',city:'cities',location:'locations',department:'departments',office:'offices',employee:'employees','lifecycle-policy':'lifecycle-policies' }
  const canManage = hasPermission(`master.${permissionKind[screenKey]}.manage`)
  const recordsPerPage = 10

  const [rows, setRows] = useState<MasterRow[]>([])
  const [lookups, setLookups] = useState<Record<string, MasterRow[]>>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<MasterRow | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const formFields = useMemo(() => {
    return config.fields.map((field) => {
      const lookupType = relationTypeFor(field.key)
      const lookup = lookups[lookupType]
      return lookup ? { ...field, options: lookup.map((item) => item.name) } : field
    })
  }, [config.fields, lookups])

  const formIsValid = Boolean(
    form && formFields.every((field) => !field.required || String(form[field.key] ?? '').trim()),
  )

  const filteredRows = rows.filter((row) =>
    Object.values(row).some((value) => value.toLowerCase().includes(search.toLowerCase())),
  )

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / recordsPerPage))
  const visibleRows = filteredRows.slice(
    (page - 1) * recordsPerPage,
    page * recordsPerPage,
  )

  async function loadRecords() {
    setLoading(true)
    setError('')

    try {
      const requiredLookupTypes = lookupTypes[screenKey] ?? []
      const lookupEntries = await Promise.all(
        requiredLookupTypes.map(async (type) => {
          const result = await api.getPage<MasterRow>(`/master/${type}?page=1&limit=100`)
          return [type, result.data] as const
        }),
      )

      const loadedLookups = Object.fromEntries(lookupEntries)
      setLookups(loadedLookups)

      const result = await api.getPage<ApiRow>(`/master/${screenKey}?page=1&limit=100`)
      setRows(result.data.map((raw) => mapApiRow(raw, screenKey, loadedLookups)))
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to load records.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    void loadRecords()
    // loadRecords depends on screenKey; changing screen reloads the correct master data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenKey])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setForm(null)
      }
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  function openAddForm() {
    const initialForm: MasterRow = {}
    for (const field of formFields) initialForm[field.key] = ''
    if (formFields.some((field) => field.key === 'status')) initialForm.status = 'Active'
    setForm(initialForm)
    setError('')
  }

  function openEditForm(row: MasterRow) {
    // Only keep ID plus fields displayed by the form. Database metadata is excluded.
    const editableForm: MasterRow = { id: row.id }
    for (const field of formFields) editableForm[field.key] = row[field.key] ?? ''
    setForm(editableForm)
    setError('')
  }

  function updateFormField(key: string, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  async function saveRecord() {
    if (!form) return

    const missingFields = formFields.filter(
      (field) => field.required && !String(form[field.key] ?? '').trim(),
    )

    if (missingFields.length > 0) {
      setError(`Please complete: ${missingFields.map((field) => field.label).join(', ')}`)
      return
    }

    try {
      setSaving(true)
      setError('')
      const requestBody = buildPayload(form, screenKey, formFields, lookups)

      if (form.id) {
        await api.put(`/master/${screenKey}/${form.id}`, requestBody)
      } else {
        await api.post(`/master/${screenKey}`, requestBody)
      }

      setForm(null)
      await loadRecords()
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to save record.'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord(row: MasterRow) {
    const displayName = row[config.rowKeys[0]] || 'this record'
    if (!window.confirm(`Delete ${displayName}?`)) return

    try {
      setDeletingId(row.id)
      setError('')
      await api.delete(`/master/${screenKey}/${row.id}`)
      await loadRecords()
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to delete record.'))
    } finally {
      setDeletingId(null)
    }
  }

  if (!config) {
    return <div>Unknown master setup screen: {screenKey}</div>
  }

  return (
    <main
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* Page header */}
      <section>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
          }}
        >
          Master Setup / {config.title}
        </div>

        <h1
          style={{
            margin: '5px 0 0',
            fontSize: 24,
            fontWeight: 750,
            color: 'var(--text-primary)',
          }}
        >
          {config.title}
        </h1>

        <p
          style={{
            margin: '6px 0 0',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}
        >
          Manage {config.title.toLowerCase()} records used across the inventory system.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '11px 14px',
            border: '1px solid #FECACA',
            borderRadius: 10,
            background: '#FEF2F2',
            color: '#B91C1C',
            fontSize: 13,
          }}
        >
          <span>{error}</span>

          <button
            type="button"
            aria-label="Close error"
            onClick={() => setError('')}
            style={{
              ...iconButtonStyle,
              border: 0,
              background: 'transparent',
              color: '#B91C1C',
            }}
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          padding: 14,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 5px 18px rgba(15,23,42,.04)',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: '1 1 280px',
            maxWidth: 420,
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)',
            }}
          />

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder={`Search ${config.title.toLowerCase()}…`}
            style={{
              ...formControlStyle,
              paddingLeft: 38,
              background: 'var(--surface-soft)',
            }}
          />
        </div>

        <button
          type="button"
          aria-label="Refresh records"
          title="Refresh records"
          onClick={() => void loadRecords()}
          style={{
            ...iconButtonStyle,
            width: 42,
            height: 42,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <RefreshCw size={16} />
        </button>

        {canManage && (
          <button
            type="button"
            onClick={openAddForm}
            style={{
              minHeight: 42,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              border: '1px solid #005BAC',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #005BAC, #0070CC)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
              boxShadow: '0 8px 18px rgba(0,91,172,.20)',
            }}
          >
            <Plus size={17} />
            Add {config.title}
          </button>
        )}
      </section>

      {/* Data table */}
      <section
        style={{
          width: '100%',
          height: 'fit-content',
          alignSelf: 'start',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 6px 20px rgba(15,23,42,.04)',
        }}
      >
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: Math.max(760, config.rowKeys.length * 180),
              borderCollapse: 'collapse',
            }}
          >
            <caption
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
              }}
            >
              {config.title} records
            </caption>

            <thead>
              <tr style={{ background: 'var(--surface-soft)' }}>
                <th
                  scope="col"
                  style={{
                    width: 64,
                    padding: '13px 16px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  #
                </th>

                {config.rowKeys.map((key) => (
                  <th
                    key={key}
                    scope="col"
                    style={{
                      padding: '13px 16px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatColumnLabel(key)}
                  </th>
                ))}

                <th
                  scope="col"
                  style={{
                    width: 120,
                    padding: '13px 16px',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={config.rowKeys.length + 2}
                    style={{
                      height: 220,
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: 13,
                    }}
                  >
                    Loading records…
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={config.rowKeys.length + 2}
                    style={{
                      height: 220,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        margin: '0 auto 12px',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--surface-soft)',
                        border: '1px solid var(--border-soft)',
                        color: 'var(--text-secondary)',
                        position: 'static',
                      }}
                      aria-hidden="true"
                    >
                      <Search size={22} style={{ position: 'static', display: 'block' }} />
                    </div>

                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      No records found
                    </div>

                    <div
                      style={{
                        marginTop: 5,
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Try changing your search or add a new {config.title.toLowerCase()}.
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: '1px solid var(--border-soft)',
                      transition: 'background .15s ease',
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background =
                        'var(--surface-soft)'
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <td
                      style={{
                        padding: '13px 16px',
                        fontSize: 12,
                        fontWeight: 650,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {(page - 1) * recordsPerPage + index + 1}
                    </td>

                    {config.rowKeys.map((key) => {
                      const value = row[key] || '—'

                      if (key === 'status') {
                        return (
                          <td key={key} style={{ padding: '13px 16px' }}>
                            <span className={`status-badge status-badge--${value.toLowerCase().replaceAll(' ', '-')}`}>
                              {value}
                            </span>
                          </td>
                        )
                      }

                      return (
                        <td
                          key={key}
                          style={{
                            padding: '13px 16px',
                            fontSize: 12,
                            color:
                              key === config.rowKeys[0]
                                ? 'var(--text-primary)'
                                : 'var(--text-secondary)',
                            fontWeight:
                              key === config.rowKeys[0] ? 650 : 400,
                            whiteSpace:
                              key === 'description' || key === 'address'
                                ? 'normal'
                                : 'nowrap',
                          }}
                        >
                          {value}
                        </td>
                      )
                    })}

                    <td
                      style={{
                        padding: '13px 16px',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {canManage && (
                          <button
                            type="button"
                            title="Edit record"
                            aria-label={`Edit ${row[config.rowKeys[0]] || 'record'}`}
                            onClick={() => openEditForm(row)}
                            style={{
                              ...iconButtonStyle,
                              border: '1px solid #BBF7D0',
                              background: '#F0FDF4',
                              color: '#15803D',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            title="Delete record"
                            aria-label={`Delete ${row[config.rowKeys[0]] || 'record'}`}
                            disabled={deletingId === row.id}
                            onClick={() => void deleteRecord(row)}
                            style={{
                              ...iconButtonStyle,
                              border: '1px solid #FECACA',
                              background: '#FEF2F2',
                              color: '#DC2626',
                              cursor:
                                deletingId === row.id
                                  ? 'not-allowed'
                                  : 'pointer',
                              opacity: deletingId === row.id ? 0.6 : 1,
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border-soft)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            Showing {visibleRows.length ? (page - 1) * recordsPerPage + 1 : 0}–
            {Math.min(page * recordsPerPage, filteredRows.length)} of{' '}
            {filteredRows.length} records
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              style={{
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 11px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color:
                  page === 1
                    ? 'var(--text-tertiary)'
                    : 'var(--text-primary)',
                fontSize: 12,
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.55 : 1,
              }}
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <span
              style={{
                padding: '0 6px',
                fontSize: 12,
                fontWeight: 650,
                color: 'var(--text-primary)',
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              style={{
                minHeight: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '0 11px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color:
                  page === totalPages
                    ? 'var(--text-tertiary)'
                    : 'var(--text-primary)',
                fontSize: 12,
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.55 : 1,
              }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Centered add/edit modal */}
      {form && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setForm(null)
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            padding: 20,
            background: 'rgba(15,23,42,.58)',
            display: 'grid',
            placeItems: 'center',
            backdropFilter: 'blur(3px)',
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="master-form-title"
            style={{
              width: 'min(100%, 620px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              boxShadow: '0 28px 80px rgba(15,23,42,.28)',
            }}
          >
            <header
              style={{
                padding: '20px 22px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div>
                <h2
                  id="master-form-title"
                  style={{
                    margin: 0,
                    fontSize: 20,
                    color: 'var(--text-primary)',
                  }}
                >
                  {form.id ? 'Edit' : 'Add'} {config.title}
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Complete the information below and save the record.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close form"
                onClick={() => setForm(null)}
                style={{
                  ...iconButtonStyle,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={18} />
              </button>
            </header>

            <div
              style={{
                padding: 22,
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {formFields.map((field) => {
                const fullWidth = field.type === 'textarea'

                return (
                  <label
                    key={field.key}
                    style={{
                      display: 'grid',
                      gap: 7,
                      gridColumn: fullWidth ? '1 / -1' : undefined,
                      fontSize: 12,
                      fontWeight: 650,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>
                      {field.label}
                      {field.required && (
                        <span style={{ color: '#DC2626' }}> *</span>
                      )}
                    </span>

                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={form[field.key] || ''}
                        onChange={(event) =>
                          updateFormField(field.key, event.target.value)
                        }
                        style={{
                          ...formControlStyle,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Select {field.label.toLowerCase()}…</option>
                        {field.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={form[field.key] || ''}
                        onChange={(event) =>
                          updateFormField(field.key, event.target.value)
                        }
                        rows={4}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        style={{
                          ...formControlStyle,
                          minHeight: 110,
                          padding: 12,
                          resize: 'vertical',
                          fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <input
                        required={field.required}
                        type={field.type || 'text'}
                        value={form[field.key] || ''}
                        onChange={(event) =>
                          updateFormField(field.key, event.target.value)
                        }
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        style={formControlStyle}
                      />
                    )}
                  </label>
                )
              })}
            </div>

            <footer
              style={{
                padding: '16px 22px 20px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                borderTop: '1px solid var(--border-soft)',
              }}
            >
              <button
                type="button"
                onClick={() => setForm(null)}
                style={{
                  minHeight: 42,
                  padding: '0 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving || !formIsValid}
                onClick={() => void saveRecord()}
                style={{
                  minHeight: 42,
                  padding: '0 18px',
                  border: '1px solid #005BAC',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #005BAC, #0070CC)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: saving || !formIsValid ? 'not-allowed' : 'pointer',
                  opacity: saving || !formIsValid ? 0.6 : 1,
                  boxShadow: '0 8px 18px rgba(0,91,172,.18)',
                }}
              >
                {saving ? 'Saving…' : form.id ? 'Save Changes' : `Add ${config.title}`}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  )
}
