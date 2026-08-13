import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clock3,
  LoaderCircle,
  PackageCheck,
  PackageX,
  RotateCcw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"
import { api } from "../../../lib/api"
import { formatAssetCode } from "../../../utils/assetCode"
import { useCurrency } from "../../../utils/currency"

interface AssetOption {
  id: string
  model: string
  assetCode: string
  serialNumber: string
  status: string
}

interface NamedOption {
  id: string
  name: string
  employeeId?: string
}

type FormState = Record<string, string>
type Feedback = { text: string; error?: boolean } | null

type Accent = "blue" | "amber" | "red"

const ACCENTS: Record<Accent, { primary: string; soft: string; border: string }> =
  {
    blue: { primary: "#005BAC", soft: "#EEF6FF", border: "#BFDBFE" },
    amber: { primary: "#D97706", soft: "#FFF8EB", border: "#FDE68A" },
    red: { primary: "#C62828", soft: "#FFF1F2", border: "#FECACA" },
  }

const today = () => new Date().toISOString().slice(0, 10)

function useTransactionData(purpose: "allocate" | "revoke" | "retire") {
  const [assets, setAssets] = useState<AssetOption[]>([])
  const [employees, setEmployees] = useState<NamedOption[]>([])
  const [locations, setLocations] = useState<NamedOption[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const options = await api.get<{ assets: AssetOption[]; employees: NamedOption[]; locations: NamedOption[] }>(`/task-lookups/${purpose}`)
      setAssets(options.assets)
      setEmployees(options.employees)
      setLocations(options.locations)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load transaction data.",
      )
    } finally {
      setLoading(false)
    }
  }, [purpose])

  useEffect(() => {
    void load()
  }, [load])

  return { assets, employees, locations, error, loading, load }
}

function Toast({
  message,
  error,
  close,
}: {
  message: string
  error?: boolean
  close: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(close, 4500)
    return () => window.clearTimeout(timer)
  }, [close])

  return (
    <div
      className={`transaction-toast ${error ? "is-error" : "is-success"}`}
      role="status"
      aria-live="polite"
    >
      <div className="transaction-toast__icon">
        {error ? <AlertCircle size={19} /> : <Check size={19} />}
      </div>
      <div>
        <strong>{error ? "Action failed" : "Completed successfully"}</strong>
        <span>{message}</span>
      </div>
      <button type="button" onClick={close} aria-label="Close notification">
        <X size={17} />
      </button>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
  span,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
  span?: boolean
}) {
  return (
    <div
      className={`transaction-field ${span ? "transaction-field--wide" : ""}`}
    >
      <div className="transaction-field__heading">
        <label>{label}</label>
        {required && <span className="transaction-required">Required</span>}
      </div>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="transaction-summary__row">
      <span>{label}</span>
      <strong>{value || "Not selected"}</strong>
    </div>
  )
}

function EmptyOption({ children }: { children: ReactNode }) {
  return <option value="">{children}</option>
}

interface FormCardProps {
  breadcrumb: string
  title: string
  subtitle: string
  icon: ReactNode
  accent?: Accent
  submit: () => Promise<void>
  submitLabel: string
  submitting: boolean
  loading: boolean
  canSubmit: boolean
  error?: string
  onReset: () => void
  summary: ReactNode
  children: ReactNode
}

function FormCard({
  breadcrumb,
  title,
  subtitle,
  icon,
  accent = "blue",
  submit,
  submitLabel,
  submitting,
  loading,
  canSubmit,
  error,
  onReset,
  summary,
  children,
}: FormCardProps) {
  const theme = ACCENTS[accent]

  return (
    <div
      className="transaction-page"
      style={
        {
          "--transaction-primary": theme.primary,
          "--transaction-soft": theme.soft,
          "--transaction-border": theme.border,
        } as CSSProperties
      }
    >
      <style>{transactionStyles}</style>

      <div className="transaction-breadcrumb">{breadcrumb}</div>

      <header className="transaction-header">
        <div className="transaction-header__identity">
          <div className="transaction-header__icon">{icon}</div>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
      </header>

      <div className="transaction-layout">
        <section className="transaction-card">
          <div className="transaction-card__head">
            <div>
              <span className="transaction-eyebrow">Transaction details</span>
              <h2>Complete the required information</h2>
              <p>
                Review the details carefully before submitting this inventory
                transaction.
              </p>
            </div>
            <div className="transaction-step">1</div>
          </div>

          {error && (
            <div className="transaction-inline-error" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="transaction-grid">{children}</div>

          <div className="transaction-actions">
            <button
              type="button"
              className="transaction-button transaction-button--secondary"
              onClick={onReset}
              disabled={submitting}
            >
              <RotateCcw size={17} />
              Clear form
            </button>
            <button
              type="button"
              className="transaction-button transaction-button--primary"
              onClick={() => void submit()}
              disabled={submitting || loading || !canSubmit}
            >
              {submitting ? (
                <LoaderCircle className="transaction-spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              {submitting ? "Processing…" : submitLabel}
            </button>
          </div>
        </section>

        <aside className="transaction-summary">
          <div className="transaction-summary__top">
            <span>Live summary</span>
            <div className="transaction-status-dot" />
          </div>
          <div className="transaction-summary__icon">{icon}</div>
          <h3>{title}</h3>
          <p>Your selections will appear here before submission.</p>
          <div className="transaction-summary__body">
            {loading ? (
              <div className="transaction-loading">
                <LoaderCircle className="transaction-spin" size={20} />
                Loading options…
              </div>
            ) : (
              summary
            )}
          </div>
          <div className="transaction-summary__note">
            <ShieldCheck size={17} />
            <span>Changes are recorded in the system audit trail.</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

export function AssetAllocation() {
  const [form, setForm] = useState<FormState>({ date: today() })
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)
  const { assets, employees, locations, error, loading, load } =
    useTransactionData("allocate")

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === form.asset),
    [assets, form.asset],
  )
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === form.employee),
    [employees, form.employee],
  )
  const selectedLocation = useMemo(
    () => locations.find((location) => location.id === form.location),
    [locations, form.location],
  )

  const set = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const reset = () => setForm({ date: today() })

  const submit = async () => {
    setFeedback(null)
    try {
      if (!form.asset || !form.employee || !form.date) {
        throw new Error("Asset, employee, and allocation date are required.")
      }

      setSubmitting(true)
      await api.post("/transactions/allocate", {
        assetId: form.asset,
        employeeId: form.employee,
        allocationDate: form.date,
        locationId: form.location || null,
        remarks: form.remarks?.trim() || null,
      })

      setFeedback({
        text: "The selected asset has been assigned successfully.",
      })
      reset()
      await load()
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error ? cause.message : "Unable to allocate asset.",
        error: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {feedback && (
        <Toast
          message={feedback.text}
          error={feedback.error}
          close={() => setFeedback(null)}
        />
      )}
      <FormCard
        breadcrumb="Transactions / Asset Allocation"
        title="Asset Allocation"
        subtitle="Assign an available IT asset to an employee and record its destination."
        icon={<PackageCheck size={24} />}
        submit={submit}
        submitLabel="Allocate Asset"
        submitting={submitting}
        loading={loading}
        canSubmit={Boolean(form.asset && form.employee && form.date)}
        error={error}
        onReset={reset}
        summary={
          <>
            <SummaryRow
              label="Asset"
              value={
                selectedAsset
                  ? `${selectedAsset.model} · ${formatAssetCode(selectedAsset.assetCode) || selectedAsset.serialNumber}`
                  : undefined
              }
            />
            <SummaryRow
              label="Employee"
              value={
                selectedEmployee
                  ? `${selectedEmployee.name}${
                      selectedEmployee.employeeId
                        ? ` · ${selectedEmployee.employeeId}`
                        : ""
                    }`
                  : undefined
              }
            />
            <SummaryRow label="Location" value={selectedLocation?.name} />
            <SummaryRow label="Allocation date" value={form.date} />
          </>
        }
      >
        <Field
          label="Select Asset"
          required
          hint={`${assets.length} available asset${
            assets.length === 1 ? "" : "s"
          } loaded`}
        >
          <select
            value={form.asset || ""}
            onChange={(event) => set("asset", event.target.value)}
            disabled={loading}
          >
            <EmptyOption>Choose an available asset</EmptyOption>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.model} — {formatAssetCode(asset.assetCode) || asset.serialNumber}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Assign To (Employee)"
          required
          hint="Select the employee who will receive this asset"
        >
          <select
            value={form.employee || ""}
            onChange={(event) => set("employee", event.target.value)}
            disabled={loading}
          >
            <EmptyOption>Choose an employee</EmptyOption>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
                {employee.employeeId ? ` — ${employee.employeeId}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Allocation Date" required>
          <input
            type="date"
            value={form.date || ""}
            onChange={(event) => set("date", event.target.value)}
            max={today()}
          />
        </Field>

        <Field
          label="Location"
          hint="Optional: leave blank to use the employee's default location"
        >
          <select
            value={form.location || ""}
            onChange={(event) => set("location", event.target.value)}
            disabled={loading}
          >
            <EmptyOption>Use employee default location</EmptyOption>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Remarks"
          span
          hint="Add handover notes, accessories, or approval references"
        >
          <textarea
            value={form.remarks || ""}
            onChange={(event) => set("remarks", event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Example: Issued with charger, laptop bag, and approved request number…"
          />
        </Field>
      </FormCard>
    </>
  )
}

export function AssetRevocation() {
  const [form, setForm] = useState<FormState>({ date: today() })
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)
  const { assets, error, loading, load } = useTransactionData("revoke")

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === form.asset),
    [assets, form.asset],
  )
  const set = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const reset = () => setForm({ date: today() })

  const submit = async () => {
    setFeedback(null)
    try {
      if (!form.asset || !form.date || !form.reason) {
        throw new Error("Asset, return date, and reason are required.")
      }

      setSubmitting(true)
      await api.post("/transactions/revoke", {
        assetId: form.asset,
        reason: form.reason,
        condition: form.condition || null,
        remarks: form.remarks?.trim() || null,
        revocationDate: form.date,
      })

      setFeedback({ text: "The asset return has been recorded successfully." })
      reset()
      await load()
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error ? cause.message : "Unable to return asset.",
        error: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {feedback && (
        <Toast
          message={feedback.text}
          error={feedback.error}
          close={() => setFeedback(null)}
        />
      )}
      <FormCard
        breadcrumb="Transactions / Asset Revocation"
        title="Asset Revocation"
        subtitle="Record the return of an allocated asset and update its physical condition."
        icon={<PackageX size={24} />}
        accent="amber"
        submit={submit}
        submitLabel="Submit Return"
        submitting={submitting}
        loading={loading}
        canSubmit={Boolean(form.asset && form.date && form.reason?.trim())}
        error={error}
        onReset={reset}
        summary={
          <>
            <SummaryRow
              label="Asset"
              value={
                selectedAsset
                  ? `${selectedAsset.model} · ${formatAssetCode(selectedAsset.assetCode) || selectedAsset.serialNumber}`
                  : undefined
              }
            />
            <SummaryRow label="Return date" value={form.date} />
            <SummaryRow label="Reason" value={form.reason} />
            <SummaryRow label="Condition" value={form.condition} />
          </>
        }
      >
        <Field
          label="Select Allocated Asset"
          required
          hint={`${assets.length} allocated asset${
            assets.length === 1 ? "" : "s"
          } loaded`}
        >
          <select
            value={form.asset || ""}
            onChange={(event) => set("asset", event.target.value)}
            disabled={loading}
          >
            <EmptyOption>Choose an allocated asset</EmptyOption>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.model} — {formatAssetCode(asset.assetCode) || asset.serialNumber}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Return Date" required>
          <input
            type="date"
            value={form.date || ""}
            onChange={(event) => set("date", event.target.value)}
            max={today()}
          />
        </Field>

        <Field label="Reason for Return" required>
          <select
            value={form.reason || ""}
            onChange={(event) => set("reason", event.target.value)}
          >
            <EmptyOption>Select a return reason</EmptyOption>
            {[
              "Employee Resigned",
              "Employee Transfer",
              "Hardware Upgrade",
              "Asset Malfunction",
              "End of Project",
              "Other",
            ].map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Asset Condition"
          hint="Condition after physical inspection"
        >
          <select
            value={form.condition || ""}
            onChange={(event) => set("condition", event.target.value)}
          >
            <EmptyOption>Select condition</EmptyOption>
            {["Excellent", "Good", "Fair", "Poor"].map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Remarks"
          span
          hint="Add inspection notes, missing accessories, damage, or follow-up actions"
        >
          <textarea
            value={form.remarks || ""}
            onChange={(event) => set("remarks", event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Example: Device received with charger; minor scratches on the lid…"
          />
        </Field>
      </FormCard>
    </>
  )
}

export function AssetExpiration() {
  const { format: formatCurrency } = useCurrency()
  const [form, setForm] = useState<FormState>({ date: today() })
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [submitting, setSubmitting] = useState(false)
  const { assets, error, loading, load } = useTransactionData("retire")

  const eligibleAssets = useMemo(
    () => assets.filter((asset) => asset.status !== "RETIRED"),
    [assets],
  )
  const selectedAsset = useMemo(
    () => eligibleAssets.find((asset) => asset.id === form.asset),
    [eligibleAssets, form.asset],
  )
  const set = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))
  const reset = () => setForm({ date: today() })

  const submit = async () => {
    setFeedback(null)
    try {
      if (!form.asset || !form.reason || !form.action || !form.date) {
        throw new Error(
          "Asset, date, reason, and end-of-life action are required.",
        )
      }

      const salvageValue = form.salvage ? Number(form.salvage) : null
      if (
        salvageValue !== null &&
        (!Number.isFinite(salvageValue) || salvageValue < 0)
      ) {
        throw new Error("Estimated salvage value must be zero or greater.")
      }

      setSubmitting(true)
      await api.post("/transactions/retire", {
        assetId: form.asset,
        currentOwner: form.owner?.trim() || null,
        reason: form.reason,
        condition: form.condition || null,
        endOfLifeAction: form.action,
        salvageValue,
        remarks: form.remarks?.trim() || null,
        expirationDate: form.date,
      })

      setFeedback({
        text: "The asset retirement has been recorded successfully.",
      })
      reset()
      await load()
    } catch (cause) {
      setFeedback({
        text:
          cause instanceof Error ? cause.message : "Unable to retire asset.",
        error: true,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {feedback && (
        <Toast
          message={feedback.text}
          error={feedback.error}
          close={() => setFeedback(null)}
        />
      )}
      <FormCard
        breadcrumb="Transactions / Asset Expiration"
        title="Asset Expiration / Retirement"
        subtitle="Remove an asset from active service and record its end-of-life decision."
        icon={<Clock3 size={24} />}
        accent="red"
        submit={submit}
        submitLabel="Retire Asset"
        submitting={submitting}
        loading={loading}
        canSubmit={Boolean(form.asset && form.reason?.trim() && form.action && form.date)}
        error={error}
        onReset={reset}
        summary={
          <>
            <SummaryRow
              label="Asset"
              value={
                selectedAsset
                  ? `${selectedAsset.model} · ${formatAssetCode(selectedAsset.assetCode) || selectedAsset.serialNumber}`
                  : undefined
              }
            />
            <SummaryRow label="Retirement date" value={form.date} />
            <SummaryRow label="Reason" value={form.reason} />
            <SummaryRow label="End-of-life action" value={form.action} />
            <SummaryRow
              label="Salvage value"
              value={
                form.salvage
                  ? formatCurrency(Number(form.salvage))
                  : undefined
              }
            />
          </>
        }
      >
        <Field
          label="Select Asset"
          required
          hint={`${eligibleAssets.length} active asset${
            eligibleAssets.length === 1 ? "" : "s"
          } available`}
        >
          <select
            value={form.asset || ""}
            onChange={(event) => set("asset", event.target.value)}
            disabled={loading}
          >
            <EmptyOption>Choose an asset</EmptyOption>
            {eligibleAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.model} — {formatAssetCode(asset.assetCode) || asset.serialNumber}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Retirement Date" required>
          <input
            type="date"
            value={form.date || ""}
            onChange={(event) => set("date", event.target.value)}
            max={today()}
          />
        </Field>

        <Field
          label="Current Owner"
          hint="Optional employee or department name"
        >
          <div className="transaction-input-icon">
            <UserRound size={17} />
            <input
              value={form.owner || ""}
              onChange={(event) => set("owner", event.target.value)}
              placeholder="Enter current owner"
            />
          </div>
        </Field>

        <Field label="Reason" required>
          <select
            value={form.reason || ""}
            onChange={(event) => set("reason", event.target.value)}
          >
            <EmptyOption>Select retirement reason</EmptyOption>
            {[
              "End of Lifecycle",
              "Beyond Economic Repair",
              "Theft / Loss",
              "Technology Obsolescence",
            ].map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Physical Condition">
          <select
            value={form.condition || ""}
            onChange={(event) => set("condition", event.target.value)}
          >
            <EmptyOption>Select condition</EmptyOption>
            {["Excellent", "Good", "Fair", "Poor", "Damaged", "Missing"].map(
              (condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="End of Life Action" required>
          <select
            value={form.action || ""}
            onChange={(event) => set("action", event.target.value)}
          >
            <EmptyOption>Select action</EmptyOption>
            {["RETIRE", "DISPOSE", "DONATE", "SELL", "REPURPOSE"].map(
              (action) => (
                <option key={action} value={action}>
                  {action.replaceAll("_", " ")}
                </option>
              ),
            )}
          </select>
        </Field>

        <Field label="Estimated Salvage Value" hint="Enter value in PKR">
          <input
            type="number"
            min="0"
            step="1"
            value={form.salvage || ""}
            onChange={(event) => set("salvage", event.target.value)}
            placeholder="0"
          />
        </Field>

        <Field
          label="Remarks"
          span
          hint="Document approval, disposal method, evidence, or any required follow-up"
        >
          <textarea
            value={form.remarks || ""}
            onChange={(event) => set("remarks", event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Add retirement and disposal notes…"
          />
        </Field>
      </FormCard>
    </>
  )
}

const transactionStyles = `
  .transaction-page {
    width: 100%;
    max-width: 1420px;
    margin: 0 auto;
    color: #0f172a;
  }

  .transaction-breadcrumb {
    margin-bottom: 10px;
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
  }

  .transaction-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .transaction-header__identity {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .transaction-header__icon,
  .transaction-summary__icon {
    display: grid;
    place-items: center;
    color: var(--transaction-primary);
    background: var(--transaction-soft);
    border: 1px solid var(--transaction-border);
  }

  .transaction-header__icon {
    width: 50px;
    height: 50px;
    border-radius: 14px;
  }

  .transaction-header h1 {
    margin: 0;
    font-size: clamp(22px, 2vw, 28px);
    line-height: 1.2;
    letter-spacing: -0.025em;
  }

  .transaction-header p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
  }

  .transaction-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 330px;
    gap: 22px;
    align-items: start;
  }

  .transaction-card,
  .transaction-summary {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.055);
  }

  .transaction-card {
    border-radius: 18px;
    overflow: hidden;
  }

  .transaction-card__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 25px 28px 22px;
    border-bottom: 1px solid #edf2f7;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  }

  .transaction-eyebrow {
    display: inline-block;
    margin-bottom: 7px;
    color: var(--transaction-primary);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .transaction-card__head h2 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.015em;
  }

  .transaction-card__head p {
    margin: 6px 0 0;
    max-width: 620px;
    color: #64748b;
    font-size: 13px;
    line-height: 1.55;
  }

  .transaction-step {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: var(--transaction-primary);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--transaction-primary) 24%, transparent);
  }

  .transaction-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 22px 20px;
    padding: 28px;
  }

  .transaction-field--wide {
    grid-column: 1 / -1;
  }

  .transaction-field__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .transaction-field label {
    color: #334155;
    font-size: 12.5px;
    font-weight: 700;
  }

  .transaction-required {
    padding: 3px 7px;
    border-radius: 999px;
    background: #fff1f2;
    color: #be123c;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .transaction-field input,
  .transaction-field select,
  .transaction-field textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #dbe3ec;
    border-radius: 10px;
    background: #fff;
    color: #0f172a;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .transaction-field input,
  .transaction-field select {
    min-height: 43px;
    padding: 10px 12px;
  }

  .transaction-field textarea {
    min-height: 104px;
    padding: 12px;
    resize: vertical;
    line-height: 1.5;
  }

  .transaction-field input::placeholder,
  .transaction-field textarea::placeholder {
    color: #94a3b8;
  }

  .transaction-field input:hover,
  .transaction-field select:hover,
  .transaction-field textarea:hover {
    border-color: #bac7d5;
  }

  .transaction-field input:focus,
  .transaction-field select:focus,
  .transaction-field textarea:focus {
    border-color: var(--transaction-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--transaction-primary) 12%, transparent);
  }

  .transaction-field select:disabled,
  .transaction-field input:disabled {
    cursor: not-allowed;
    background: #f8fafc;
    color: #94a3b8;
  }

  .transaction-field small {
    display: block;
    margin-top: 6px;
    color: #7c8ba1;
    font-size: 10.5px;
    line-height: 1.4;
  }

  .transaction-input-icon {
    position: relative;
  }

  .transaction-input-icon > svg {
    position: absolute;
    top: 50%;
    left: 12px;
    z-index: 1;
    color: #94a3b8;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .transaction-input-icon input {
    padding-left: 38px;
  }

  .transaction-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 19px 28px;
    border-top: 1px solid #edf2f7;
    background: #fbfdff;
  }

  .transaction-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 42px;
    padding: 10px 17px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 750;
    cursor: pointer;
    transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  }

  .transaction-button:not(:disabled):hover {
    transform: translateY(-1px);
  }

  .transaction-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .transaction-button--secondary {
    border: 1px solid #dbe3ec;
    background: #fff;
    color: #475569;
  }

  .transaction-button--secondary:hover {
    border-color: #b7c3d0;
  }

  .transaction-button--primary {
    min-width: 145px;
    border: 1px solid var(--transaction-primary);
    background: var(--transaction-primary);
    color: #fff;
    box-shadow: 0 8px 18px color-mix(in srgb, var(--transaction-primary) 20%, transparent);
  }

  .transaction-summary {
    position: sticky;
    top: 88px;
    padding: 22px;
    border-radius: 18px;
  }

  .transaction-summary__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .transaction-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 4px #dcfce7;
  }

  .transaction-summary__icon {
    width: 48px;
    height: 48px;
    margin-bottom: 14px;
    border-radius: 14px;
  }

  .transaction-summary h3 {
    margin: 0;
    font-size: 17px;
  }

  .transaction-summary > p {
    margin: 7px 0 20px;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }

  .transaction-summary__body {
    overflow: hidden;
    border: 1px solid #e7edf4;
    border-radius: 12px;
  }

  .transaction-summary__row {
    padding: 12px 13px;
    border-bottom: 1px solid #edf2f7;
  }

  .transaction-summary__row:last-child {
    border-bottom: 0;
  }

  .transaction-summary__row span,
  .transaction-summary__row strong {
    display: block;
  }

  .transaction-summary__row span {
    margin-bottom: 4px;
    color: #94a3b8;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .transaction-summary__row strong {
    overflow-wrap: anywhere;
    color: #334155;
    font-size: 11.5px;
    line-height: 1.45;
  }

  .transaction-summary__note {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 18px;
    padding: 12px;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
    font-size: 10.5px;
    line-height: 1.45;
  }

  .transaction-summary__note svg {
    flex: 0 0 auto;
    color: #16a34a;
  }

  .transaction-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-height: 90px;
    color: #64748b;
    font-size: 12px;
  }

  .transaction-inline-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 20px 28px 0;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff7f7;
    color: #b91c1c;
    font-size: 12px;
  }

  .transaction-toast {
    position: fixed;
    top: 82px;
    right: 24px;
    z-index: 1000;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: min(390px, calc(100vw - 32px));
    padding: 14px;
    border: 1px solid;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
  }

  .transaction-toast.is-success {
    border-color: #bbf7d0;
  }

  .transaction-toast.is-error {
    border-color: #fecaca;
  }

  .transaction-toast__icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }

  .transaction-toast.is-success .transaction-toast__icon {
    background: #ecfdf3;
    color: #16a34a;
  }

  .transaction-toast.is-error .transaction-toast__icon {
    background: #fff1f2;
    color: #dc2626;
  }

  .transaction-toast strong,
  .transaction-toast span {
    display: block;
  }

  .transaction-toast strong {
    margin-bottom: 2px;
    color: #0f172a;
    font-size: 12px;
  }

  .transaction-toast span {
    color: #64748b;
    font-size: 11px;
    line-height: 1.4;
  }

  .transaction-toast button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
  }

  .transaction-toast button:hover {
    background: #f1f5f9;
  }

  .transaction-spin {
    animation: transaction-spin 0.9s linear infinite;
  }

  @keyframes transaction-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1100px) {
    .transaction-layout {
      grid-template-columns: 1fr;
    }

    .transaction-summary {
      position: static;
      order: -1;
    }
  }

  @media (max-width: 720px) {
    .transaction-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .transaction-card__head,
    .transaction-grid,
    .transaction-actions {
      padding-left: 18px;
      padding-right: 18px;
    }

    .transaction-grid {
      grid-template-columns: 1fr;
    }

    .transaction-field--wide {
      grid-column: auto;
    }

    .transaction-actions {
      align-items: stretch;
      flex-direction: column-reverse;
    }

    .transaction-button {
      width: 100%;
    }

    .transaction-toast {
      right: 16px;
    }
  }

  /* Complete dark mode */
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-page {
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-breadcrumb {
    color: #9fb0c6;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-header h1 {
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-header p {
    color: #a8b6ca;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-header__icon,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__icon {
    background: color-mix(in srgb, var(--transaction-primary) 16%, #0f1b2d);
    border-color: color-mix(in srgb, var(--transaction-primary) 42%, #24364f);
    color: #7cc5ff;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-card,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary {
    background: #0f1b2d;
    border-color: #24364f;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.28);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-card__head {
    border-bottom-color: #24364f;
    background: linear-gradient(180deg, #111e31 0%, #0f1b2d 100%);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-card__head h2,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary h3 {
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-card__head p,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary > p {
    color: #a8b6ca;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-eyebrow {
    color: #69b9f4;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field label {
    color: #e2e8f0;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-required {
    background: rgba(239, 68, 68, 0.14);
    color: #fca5a5;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field input,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field select,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field textarea {
    border-color: #334a68;
    background: #0a1728;
    color: #f8fafc;
    color-scheme: dark;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field select option {
    background: #0a1728;
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field input::placeholder,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field textarea::placeholder {
    color: #8fa3bc;
    opacity: 1;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field input:hover,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field select:hover,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field textarea:hover {
    border-color: #4d6685;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field input:focus,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field select:focus,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field textarea:focus {
    border-color: #38bdf8;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.16);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field select:disabled,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field input:disabled {
    background: #111e31;
    color: #7f91aa;
    border-color: #2b3e58;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-field small {
    color: #94a6bd;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-input-icon > svg {
    color: #8fa3bc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-actions {
    border-top-color: #24364f;
    background: #0f1b2d;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-button--secondary {
    border-color: #334a68;
    background: transparent;
    color: #cbd5e1;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-button--secondary:not(:disabled):hover {
    border-color: #4d6685;
    background: #16243a;
    color: #ffffff;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-button--primary {
    background: linear-gradient(135deg, color-mix(in srgb, var(--transaction-primary) 86%, #38bdf8), var(--transaction-primary));
    border-color: #2899e6;
    box-shadow: 0 9px 22px color-mix(in srgb, var(--transaction-primary) 32%, transparent);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-button--primary:not(:disabled):hover {
    filter: brightness(1.08);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__top {
    color: #9fb0c6;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-status-dot {
    background: #4ade80;
    box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.13);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__body {
    border-color: #24364f;
    background: #0a1728;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__row {
    border-bottom-color: #24364f;
    background: #0a1728;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__row span {
    color: #8fa3bc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__row strong {
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-summary__note {
    background: #111e31;
    color: #a8b6ca;
    border: 1px solid #24364f;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-loading {
    color: #a8b6ca;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-inline-error {
    border-color: rgba(248, 113, 113, 0.4);
    background: rgba(127, 29, 29, 0.25);
    color: #fecaca;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast {
    background: #0f1b2d;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.4);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast.is-success {
    border-color: rgba(74, 222, 128, 0.42);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast.is-error {
    border-color: rgba(248, 113, 113, 0.42);
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast.is-success .transaction-toast__icon {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast.is-error .transaction-toast__icon {
    background: rgba(239, 68, 68, 0.14);
    color: #fca5a5;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast strong {
    color: #f8fafc;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast span,
  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast button {
    color: #a8b6ca;
  }

  :is(html.dark, body.dark, [data-theme='dark']) .transaction-toast button:hover {
    background: #16243a;
    color: #ffffff;
  }
`
