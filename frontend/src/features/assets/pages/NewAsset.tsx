import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  PackagePlus,
  Save,
  Upload,
  X,
} from "lucide-react"
import { api } from "../../../lib/api"
import { hasPermission } from "../../../auth/permissions"
import { useCurrency } from "../../../utils/currency"
import "./NewAsset.css"

const steps = [
  "General Info",
  "Asset Details",
  "Purchase Info",
  "System Info",
  "Review",
]

type FormData = Record<string, string>

type FieldType = "text" | "select" | "date" | "number" | "textarea"

interface FieldConfig {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
  note?: string
  span?: 2
  placeholder?: string
  disabled?: boolean
}

interface MasterItem {
  id?: string
  name?: string
  generation?: string
  size?: string
  type?: string
  capacity?: string
  version?: string
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="asset-stepper" aria-label="Asset creation progress">
      {steps.map((step, index) => {
        const completed = index < current
        const active = index === current

        return (
          <div className="asset-step" key={step}>
            <div className="asset-step__main">
              <div
                className={`asset-step__circle ${
                  completed ? "is-complete" : active ? "is-active" : ""
                }`}
                aria-current={active ? "step" : undefined}
              >
                {completed ? <Check size={16} strokeWidth={2.5} /> : index + 1}
              </div>
              <div className="asset-step__text">
                <span className="asset-step__eyebrow">Step {index + 1}</span>
                <span
                  className={`asset-step__label ${
                    completed ? "is-complete" : active ? "is-active" : ""
                  }`}
                >
                  {step}
                </span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`asset-step__line ${completed ? "is-complete" : ""}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function FormSection({
  title,
  description,
  fields,
  data,
  errors,
  onChange,
}: {
  title: string
  description: string
  fields: FieldConfig[]
  data: FormData
  errors: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <section className="asset-form-section">
      <div className="asset-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="asset-form-grid">
        {fields.map((field) => {
          const inputId = `asset-field-${field.key}`
          const error = errors[field.key]
          const fieldClass = `asset-field ${
            field.span === 2 ? "asset-field--wide" : ""
          }`

          return (
            <div className={fieldClass} key={field.key}>
              <label htmlFor={inputId}>
                {field.label}
                {field.required && <span className="asset-required">*</span>}
              </label>

              {field.type === "select" ? (
                <select
                  id={inputId}
                  value={data[field.key] || ""}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  className={error ? "has-error" : ""}
                  disabled={field.disabled}
                  required={field.required}
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={inputId}
                  value={data[field.key] || ""}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  rows={4}
                  placeholder={
                    field.placeholder || `Enter ${field.label.toLowerCase()}`
                  }
                  className={error ? "has-error" : ""}
                  disabled={field.disabled}
                  required={field.required}
                />
              ) : (
                <input
                  id={inputId}
                  type={field.type}
                  value={data[field.key] || ""}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={
                    field.placeholder || `Enter ${field.label.toLowerCase()}`
                  }
                  className={error ? "has-error" : ""}
                  disabled={field.disabled}
                  required={field.required}
                  min={field.type === "number" ? "0" : undefined}
                />
              )}

              {error ? (
                <div className="asset-field-message asset-field-message--error">
                  <AlertCircle size={13} />
                  {error}
                </div>
              ) : field.note ? (
                <div className="asset-field-message">
                  <AlertCircle size={13} />
                  {field.note}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const STEP_FIELDS: FieldConfig[][] = [
  [
    { key: "assetType", label: "Asset Type", type: "select", required: true },
    {
      key: "manufacturer",
      label: "Manufacturer",
      type: "select",
      required: true,
    },
    { key: "model", label: "Model Name", type: "text", required: true },
    {
      key: "serialNumber",
      label: "Serial Number",
      type: "text",
      required: true,
    },
    { key: "assetTag", label: "Asset Tag", type: "text", required: true },
    {
      key: "condition",
      label: "Condition",
      type: "select",
      options: ["New", "Refurbished", "Used - Good", "Used - Fair"],
    },
  ],
  [
    { key: "processor", label: "Processor", type: "select" },
    { key: "memory", label: "Memory (RAM)", type: "select" },
    { key: "storage", label: "Storage", type: "select" },
    { key: "os", label: "Operating System", type: "select" },
    { key: "accessories", label: "Accessories Included", type: "text" },
    { key: "notes", label: "Additional Notes", type: "textarea", span: 2 },
  ],
  [
    { key: "vendor", label: "Vendor", type: "select", required: true },
    {
      key: "purchaseDate",
      label: "Purchase Date",
      type: "date",
      required: true,
    },
    {
      key: "purchaseCost",
      label: "Purchase Cost (PKR)",
      type: "number",
      required: true,
    },
    { key: "poNumber", label: "PO Number", type: "text" },
    { key: "invoiceNumber", label: "Invoice Number", type: "text" },
    {
      key: "warrantyExpiry",
      label: "Warranty Expiry",
      type: "date",
      note: "Calculated automatically when lifecycle rules are available.",
    },
    {
      key: "expectedExpiry",
      label: "Expected Expiry",
      type: "date",
      note: "Calculated automatically when lifecycle rules are available.",
    },
    { key: "location", label: "Receiving Location", type: "select" },
  ],
  [
    {
      key: "macAddress",
      label: "MAC Address",
      type: "text",
      placeholder: "Example: 00:1A:2B:3C:4D:5E",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      type: "text",
      placeholder: "Example: 192.168.1.25",
    },
    {
      key: "hostname",
      label: "Hostname",
      type: "text",
      placeholder: "Example: EFU-KHI-LT-001",
    },
    {
      key: "domain",
      label: "Domain",
      type: "text",
      placeholder: "Example: efu.local",
    },
    { key: "bios", label: "BIOS Version", type: "text" },
    { key: "gpuModel", label: "GPU Model", type: "text" },
  ],
]

const STEP_DESCRIPTIONS = [
  "Enter the primary identification information for this asset.",
  "Record the hardware configuration and included accessories.",
  "Add procurement, vendor, warranty, and receiving details.",
  "Add optional network and technical identification information.",
]

function ReviewStep({ data }: { data: FormData }) {
  const { format: formatCurrency } = useCurrency()
  const sections = [
    {
      title: "General Information",
      keys: [
        "assetType",
        "manufacturer",
        "model",
        "serialNumber",
        "assetTag",
        "condition",
      ],
    },
    {
      title: "Asset Details",
      keys: ["processor", "memory", "storage", "os", "accessories", "notes"],
    },
    {
      title: "Purchase Information",
      keys: [
        "vendor",
        "purchaseDate",
        "purchaseCost",
        "poNumber",
        "invoiceNumber",
        "warrantyExpiry",
        "expectedExpiry",
        "location",
      ],
    },
    {
      title: "System Information",
      keys: [
        "macAddress",
        "ipAddress",
        "hostname",
        "domain",
        "bios",
        "gpuModel",
      ],
    },
  ]

  const fieldLabels = STEP_FIELDS.flat().reduce<Record<string, string>>(
    (result, field) => {
      result[field.key] = field.label
      return result
    },
    {},
  )

  const displayValue = (key: string) => {
    const value = data[key]
    if (!value) return "Not provided"
    if (key === "purchaseCost") {
      const amount = Number(value)
      return Number.isFinite(amount)
        ? formatCurrency(amount)
        : value
    }
    return value
  }

  return (
    <section className="asset-review">
      <div className="asset-section-heading">
        <div>
          <h2>Review Asset Information</h2>
          <p>Confirm the details below before creating the asset record.</p>
        </div>
      </div>

      <div className="asset-review-grid">
        {sections.map((section) => (
          <article className="asset-review-card" key={section.title}>
            <div className="asset-review-card__header">
              <FileText size={17} />
              <h3>{section.title}</h3>
            </div>
            <dl>
              {section.keys.map((key) => (
                <div className="asset-review-row" key={key}>
                  <dt>{fieldLabels[key] || key}</dt>
                  <dd className={!data[key] ? "is-empty" : ""}>
                    {displayValue(key)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function NewAsset({ onCancel }: { onCancel: () => void }) {
  const canUploadAttachments = hasPermission("assets.attachments.upload")
  const [step, setStep] = useState(0)
  const [data, setData] = useState<FormData>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingMasters, setLoadingMasters] = useState(true)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [masters, setMasters] = useState<Record<string, MasterItem[]>>({})
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addAttachments = (files: FileList | File[]) => {
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
    const maximumSize = 10 * 1024 * 1024
    const candidates = Array.from(files)
    const invalid = candidates.find(
      (file) => !allowedTypes.has(file.type) || file.size > maximumSize,
    )
    if (invalid) {
      setError(`${invalid.name} must be a PDF, JPG, or PNG file no larger than 10 MB.`)
      return
    }
    setAttachments((current) => {
      const merged = [...current]
      for (const file of candidates) {
        const duplicate = merged.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)
        if (!duplicate) merged.push(file)
      }
      return merged
    })
    setError("")
  }

  useEffect(() => {
    api.get<Record<string, MasterItem[]>>("/task-lookups/asset-create")
      .then(setMasters)
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load master data.",
        ),
      )
      .finally(() => setLoadingMasters(false))
  }, [])

  const fields = useMemo(() => {
    const mappings: Record<string, {
      type: string
      label: (item: MasterItem) => string
    }> = {
      assetType: { type: "asset-type", label: (item) => item.name || "" },
      manufacturer: { type: "asset-make", label: (item) => item.name || "" },
      processor: {
        type: "motherboard",
        label: (item) =>
          [item.name, item.generation].filter(Boolean).join(" - "),
      },
      memory: {
        type: "memory",
        label: (item) => [item.size, item.type].filter(Boolean).join(" "),
      },
      storage: {
        type: "storage",
        label: (item) => [item.capacity, item.type].filter(Boolean).join(" "),
      },
      os: {
        type: "operating-system",
        label: (item) => [item.name, item.version].filter(Boolean).join(" "),
      },
      vendor: { type: "vendor", label: (item) => item.name || "" },
      location: { type: "location", label: (item) => item.name || "" },
    }

    return STEP_FIELDS.map((group) =>
      group.map((field) => {
        const mapping = mappings[field.key]
        if (!mapping) return field

        const options = (masters[mapping.type] || [])
          .map(mapping.label)
          .filter((value): value is string => Boolean(value))

        return { ...field, options }
      }),
    )
  }, [masters])

  const onChange = (key: string, value: string) => {
    setData((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setError("")
  }

  const selectedId = (
    type: string,
    value: string,
    label: (item: MasterItem) => string = (item) => item.name || "",
  ) => masters[type]?.find((item) => label(item) === value)?.id || null

  const validateCurrentStep = () => {
    if (step >= 4) return true

    const errors: Record<string, string> = {}
    fields[step].forEach((field) => {
      if (field.required && !data[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required.`
      }
    })

    if (step === 2 && data.purchaseCost && Number(data.purchaseCost) <= 0) {
      errors.purchaseCost = "Purchase cost must be greater than zero."
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError("Please correct the highlighted fields before continuing.")
      return false
    }

    setError("")
    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    setStep((current) => Math.min(current + 1, 4))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrevious = () => {
    setError("")
    setFieldErrors({})
    setStep((current) => Math.max(current - 1, 0))
  }

  const handleSaveDraft = () => {
    localStorage.setItem("efu-new-asset-draft", JSON.stringify({ step, data }))
    setError("Draft saved locally on this device.")
  }

  const handleCreate = async () => {
    setSaving(true)
    setError("")

    try {
      const asset = await api.post<{ id: string }>("/assets", {
        assetTypeId: selectedId("asset-type", data.assetType),
        assetMakeId: selectedId("asset-make", data.manufacturer),
        model: data.model,
        serialNumber: data.serialNumber,
        motherboardId: selectedId("motherboard", data.processor, (item) =>
          [item.name, item.generation].filter(Boolean).join(" - "),
        ),
        memoryId: selectedId("memory", data.memory, (item) =>
          [item.size, item.type].filter(Boolean).join(" "),
        ),
        storageId: selectedId("storage", data.storage, (item) =>
          [item.capacity, item.type].filter(Boolean).join(" "),
        ),
        operatingSystemId: selectedId("operating-system", data.os, (item) =>
          [item.name, item.version].filter(Boolean).join(" "),
        ),
        accessories: data.accessories || null,
        additionalNotes: data.notes || null,
        vendorId: selectedId("vendor", data.vendor),
        purchaseDate: data.purchaseDate,
        purchaseCost: Number(data.purchaseCost),
        locationId: selectedId("location", data.location),
        assetTag: data.assetTag || null,
        condition: data.condition || null,
        purchaseOrderNumber: data.poNumber || null,
        invoiceNumber: data.invoiceNumber || null,
        macAddress: data.macAddress || null,
        ipAddress: data.ipAddress || null,
        hostname: data.hostname || null,
        domain: data.domain || null,
        biosVersion: data.bios || null,
        gpuModel: data.gpuModel || null,
      })

      if (canUploadAttachments && attachments.length > 0) {
        const uploadBody = new globalThis.FormData()
        attachments.forEach((file) => uploadBody.append("files", file))
        await api.upload(`/assets/${asset.id}/attachments`, uploadBody)
      }

      localStorage.removeItem("efu-new-asset-draft")
      setSaved(true)
      onCancel()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to create asset.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="asset-success">
        <div className="asset-success__icon">
          <Check size={38} strokeWidth={2.4} />
        </div>
        <h2>Asset created successfully</h2>
        <p>The asset has been added to the inventory. Redirecting now…</p>
      </div>
    )
  }

  return (
    <div className="asset-page">
      <header className="asset-page-header">
        <div>
          <nav className="asset-breadcrumb" aria-label="Breadcrumb">
            <span>Transactions</span>
            <ChevronRight size={13} />
            <span>New Asset</span>
          </nav>
          <div className="asset-title-row">
            <div className="asset-title-icon">
              <PackagePlus size={22} />
            </div>
            <div>
              <h1>Add New Asset</h1>
              <p>Create a complete inventory record in five guided steps.</p>
            </div>
          </div>
        </div>
        <div className="asset-progress-summary">
          <div className="asset-progress-summary__top">
            <span>Step {step + 1} of {steps.length}</span>
            <b>{Math.round(((step + 1) / steps.length) * 100)}%</b>
          </div>
          <strong>{steps[step]}</strong>
          <div className="asset-progress-summary__track" aria-hidden="true">
            <i style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="asset-card">
        <StepIndicator current={step} />

        {error && (
          <div
            className={`asset-alert ${
              error.includes("saved locally") ? "asset-alert--success" : ""
            }`}
            role="alert"
          >
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {loadingMasters && step < 4 ? (
          <div className="asset-loading">
            <Loader2 size={24} className="asset-spin" />
            <span>Loading form options…</span>
          </div>
        ) : (
          <>
            {step < 4 && (
              <FormSection
                title={steps[step]}
                description={STEP_DESCRIPTIONS[step]}
                fields={fields[step]}
                data={data}
                errors={fieldErrors}
                onChange={onChange}
              />
            )}

            {step === 3 && canUploadAttachments && (
              <section className="asset-upload-section">
                <div className="asset-section-heading">
                  <div>
                    <h2>Attachments</h2>
                    <p>
                      Upload invoice, warranty, or supporting asset documents.
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  className="asset-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={(event) => {
                    if (event.target.files) addAttachments(event.target.files)
                    event.target.value = ""
                  }}
                />
                <button
                  className={`asset-upload-box ${isDraggingFiles ? "is-dragging" : ""}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setIsDraggingFiles(true) }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDraggingFiles(false)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDraggingFiles(false)
                    addAttachments(event.dataTransfer.files)
                  }}
                >
                  <span className="asset-upload-box__icon">
                    <Upload size={24} />
                  </span>
                  <strong>Drop files here or click to browse</strong>
                  <span>PDF, JPG, or PNG — maximum 10 MB per file</span>
                </button>
                {attachments.length > 0 && (
                  <div className="asset-upload-list" aria-live="polite">
                    {attachments.map((file) => (
                      <div className="asset-upload-file" key={`${file.name}-${file.lastModified}`}>
                        <span className="asset-upload-file__icon"><FileText size={17} /></span>
                        <span className="asset-upload-file__details">
                          <strong>{file.name}</strong>
                          <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                        </span>
                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item !== file))}>
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {step === 4 && <ReviewStep data={data} />}
          </>
        )}

        <footer className="asset-actions">
          <button
            type="button"
            className="asset-button asset-button--secondary"
            onClick={step === 0 ? onCancel : handlePrevious}
          >
            <ChevronLeft size={17} />
            {step === 0 ? "Cancel" : "Previous"}
          </button>

          <div className="asset-actions__right">
            {step < 4 && (
              <button
                type="button"
                className="asset-button asset-button--ghost"
                onClick={handleSaveDraft}
              >
                <Save size={16} />
                Save Draft
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="asset-button asset-button--primary"
                onClick={handleNext}
                disabled={loadingMasters}
              >
                Continue
                <ChevronRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                className="asset-button asset-button--success"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={17} className="asset-spin" />
                ) : (
                  <Check size={17} />
                )}
                {saving ? "Creating Asset…" : "Create Asset"}
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
