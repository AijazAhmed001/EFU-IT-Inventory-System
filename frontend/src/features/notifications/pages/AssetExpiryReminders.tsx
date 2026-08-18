import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  CircleOff, Clock3, Eye, Mail, MailWarning, Play, RefreshCw, RotateCcw,
  Save, Search, Send, Settings2, ShieldCheck, X,
} from "lucide-react"
import { api, PageMeta } from "../../../lib/api"
import { hasPermission } from "../../../auth/permissions"
import "./AssetExpiryReminders.css"

type ReminderSettings = {
  enabled: boolean; executionTime: string; timeZone: string; reminderWindowDays: number
  sendEveryDay: boolean; sendOnExpiryDate: boolean; sendAfterExpiry: boolean
  postExpiryDays: number; ccItSupport?: string; bcc?: string; maximumRetryCount: number
  senderName: string; subjectPrefix: string; notifyAdminOnMissingEmail: boolean; batchSize: number
}
type ReminderSummary = {
  sentToday: number; failedToday: number; skippedToday: number
  missingRecipientEmailCount: number; assetsExpiringCount: number; nextScheduledRun?: string
  smtpConfigured?: boolean; automationReady?: boolean
}
type ReminderItem = {
  id: string; assetCode: string; assetName: string; recipientName: string; recipientEmail: string
  expiryType: string; expiryDate: string; daysRemaining: number; status: string
  attemptCount: number; sentAtUtc?: string; errorMessage?: string; correlationId: string; createdAt: string
}
type DialogState = { type: "scan" } | { type: "test"; email: string } | { type: "preview" } | null

const defaults: ReminderSettings = {
  enabled: true, executionTime: "09:00", timeZone: "Asia/Karachi", reminderWindowDays: 15,
  sendEveryDay: true, sendOnExpiryDate: true, sendAfterExpiry: false, postExpiryDays: 0,
  maximumRetryCount: 3, senderName: "EFU IT Department", subjectPrefix: "[EFU IT Inventory]",
  notifyAdminOnMissingEmail: false, batchSize: 100,
}
const emptySummary: ReminderSummary = { sentToday: 0, failedToday: 0, skippedToday: 0, missingRecipientEmailCount: 0, assetsExpiringCount: 0, smtpConfigured: false, automationReady: false }
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—"
const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"

function Toggle({ checked, onChange, label, help, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; help?: string; disabled?: boolean }) {
  return <label className={`reminder-toggle ${disabled ? "is-disabled" : ""}`}>
    <span><strong>{label}</strong>{help && <small>{help}</small>}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} />
    <i aria-hidden="true" />
  </label>
}

export default function AssetExpiryReminders() {
  const canManage = hasPermission("notifications.manage")
  const [settings, setSettings] = useState(defaults)
  const [savedSettings, setSavedSettings] = useState(defaults)
  const [summary, setSummary] = useState(emptySummary)
  const [items, setItems] = useState<ReminderItem[]>([])
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 25, total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [selected, setSelected] = useState<ReminderItem | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings])

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()) }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const loadSettings = useCallback(async () => {
    try { const value = await api.get<ReminderSettings>("/asset-expiry-reminders/settings"); setSettings(value); setSavedSettings(value) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Settings could not be loaded.") }
  }, [])
  const loadSummary = useCallback(async () => {
    try { setSummary(await api.get<ReminderSummary>("/asset-expiry-reminders/summary")) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Summary could not be loaded.") }
  }, [])
  const loadHistory = useCallback(async () => {
    try {
      const result = await api.getPage<ReminderItem>(`/asset-expiry-reminders/history?page=${page}&limit=25&status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`)
      setItems(result.data); setMeta(result.meta)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Reminder history could not be loaded.") }
  }, [page, search, status])
  const refresh = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    setError("")
    await Promise.allSettled([loadSettings(), loadSummary(), loadHistory()])
    setLoading(false)
  }, [loadHistory, loadSettings, loadSummary])
  useEffect(() => { void refresh(true) }, [refresh])

  const perform = async (name: string, work: () => Promise<unknown>, success: string) => {
    setBusy(name); setError(""); setNotice("")
    try { await work(); setNotice(success); setDialog(null); await refresh() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "The action could not be completed.") }
    finally { setBusy("") }
  }
  const save = () => perform("save", () => api.put("/asset-expiry-reminders/settings", settings), "Reminder settings saved successfully.")
  const retry = (id: string) => perform(id, () => api.post(`/asset-expiry-reminders/history/${id}/retry`, {}), "The reminder retry completed.")
  const nextRun = summary.nextScheduledRun ? formatDateTime(summary.nextScheduledRun) : `${settings.executionTime} PKT`
  const cards = [
    { label: "Sent today", value: summary.sentToday, icon: CheckCircle2, tone: "green", help: "Successfully delivered" },
    { label: "Failed today", value: summary.failedToday, icon: AlertTriangle, tone: "red", help: "Needs attention" },
    { label: "Skipped today", value: summary.skippedToday, icon: CircleOff, tone: "amber", help: "Not eligible to send" },
    { label: "Missing email", value: summary.missingRecipientEmailCount, icon: MailWarning, tone: "purple", help: "Recipient data issue" },
    { label: `Expiring in ${settings.reminderWindowDays} days`, value: summary.assetsExpiringCount, icon: CalendarClock, tone: "blue", help: "Active assigned assets" },
    { label: "Next scheduled run", value: nextRun, icon: Clock3, tone: "navy", help: settings.timeZone },
  ]

  return <section className="reminders-page">
    <header className="reminders-hero">
      <div className="hero-copy"><span className="eyebrow"><Mail size={14} /> Notification automation</span><h1>Asset expiry reminders</h1><p>Monitor upcoming expirations, control delivery rules, and review every employee notification.</p></div>
      <div className="hero-side"><span className={`automation-state ${summary.automationReady ? "is-on" : "is-off"}`}><i /> {summary.automationReady ? "Automation ready" : settings.enabled && !summary.smtpConfigured ? "Setup required" : "Automation paused"}</span>{canManage && <div className="hero-actions"><button className="button secondary" onClick={() => setDialog({ type: "test", email: "" })} disabled={!!busy || !summary.smtpConfigured} title={!summary.smtpConfigured ? "Configure SMTP first" : undefined}><Send size={16} /> Test email</button><button className="button primary" onClick={() => setDialog({ type: "scan" })} disabled={!!busy || !summary.smtpConfigured} title={!summary.smtpConfigured ? "Configure SMTP first" : undefined}><Play size={16} /> Run scan now</button><button className="icon-button" aria-label="Refresh reminder data" title="Refresh" onClick={() => void refresh(true)} disabled={!!busy}><RefreshCw size={17} className={loading ? "spin" : ""} /></button></div>}</div>
    </header>

    {error && <div className="reminder-banner error" role="alert"><AlertTriangle size={18} /><div><strong>We couldn’t complete that request</strong><span>{error}</span></div><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
    {notice && <div className="reminder-banner success" role="status"><CheckCircle2 size={18} /><div><strong>Done</strong><span>{notice}</span></div><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {!loading && settings.enabled && !summary.smtpConfigured && <div className="reminder-banner warning" role="status"><MailWarning size={18} /><div><strong>Email setup required</strong><span>The schedule is enabled, but SMTP host and sender settings are missing. Configure the backend before automatic emails can be delivered.</span></div></div>}

    <div className="summary-grid" aria-label="Reminder summary">{cards.map(({ label, value, icon: Icon, tone, help }) => <article className={`summary-card ${tone}`} key={label}><div className="summary-icon"><Icon size={20} /></div><div><span>{label}</span><strong>{loading ? <i className="value-skeleton" /> : value}</strong><small>{help}</small></div></article>)}</div>

    <form className="reminder-panel settings-panel" onSubmit={(event) => { event.preventDefault(); void save() }}>
      <div className="panel-heading"><div className="panel-title"><span><Settings2 size={18} /></span><div><h2>Schedule & delivery</h2><p>Choose when reminders run and which delivery rules apply.</p></div></div>{isDirty && <span className="unsaved-dot">Unsaved changes</span>}</div>
      <div className="reminder-settings-layout">
        <div className="settings-section"><h3>Automation</h3><Toggle checked={settings.enabled} onChange={(enabled) => setSettings({ ...settings, enabled })} label="Automatic reminders" help="Run the scheduled scan every day" /><div className="field-row"><label><span>Reminder window</span><div className="input-suffix"><input type="number" min="1" max="365" value={settings.reminderWindowDays} onChange={(event) => setSettings({ ...settings, reminderWindowDays: Number(event.target.value) })} /><i>days</i></div></label><label><span>Batch size</span><input type="number" min="1" max="1000" value={settings.batchSize} onChange={(event) => setSettings({ ...settings, batchSize: Number(event.target.value) })} /></label></div></div>
        <div className="settings-section"><h3>Daily schedule</h3><div className="field-row"><label><span>Execution time</span><input type="time" value={settings.executionTime} onChange={(event) => setSettings({ ...settings, executionTime: event.target.value })} /></label><label><span>Business timezone</span><select value={settings.timeZone} onChange={(event) => setSettings({ ...settings, timeZone: event.target.value })}><option value="Asia/Karachi">Asia/Karachi (PKT)</option><option value="UTC">UTC</option></select></label></div><Toggle checked={settings.sendEveryDay} onChange={(sendEveryDay) => setSettings({ ...settings, sendEveryDay })} label="Send every eligible day" help="Repeat throughout the reminder window" /></div>
        <div className="settings-section"><h3>Expiry rules</h3><Toggle checked={settings.sendOnExpiryDate} onChange={(sendOnExpiryDate) => setSettings({ ...settings, sendOnExpiryDate })} label="Send on expiry date" help="Include the 0-days-remaining reminder" /><Toggle checked={settings.sendAfterExpiry} onChange={(sendAfterExpiry) => setSettings({ ...settings, sendAfterExpiry })} label="Post-expiry reminders" help="Continue for a limited number of days" /><label className="standalone-field"><span>Post-expiry duration</span><div className="input-suffix"><input type="number" min="0" max="365" disabled={!settings.sendAfterExpiry} value={settings.postExpiryDays} onChange={(event) => setSettings({ ...settings, postExpiryDays: Number(event.target.value) })} /><i>days</i></div></label></div>
        <div className="settings-section"><h3>IT escalation</h3><label className="standalone-field"><span>IT support CC <em>Optional</em></span><input type="email" placeholder="it-support@company.com" value={settings.ccItSupport || ""} onChange={(event) => setSettings({ ...settings, ccItSupport: event.target.value })} /></label><Toggle checked={settings.notifyAdminOnMissingEmail} onChange={(notifyAdminOnMissingEmail) => setSettings({ ...settings, notifyAdminOnMissingEmail })} label="Missing-email alerts" help="Notify IT when an assignee has no valid email" /></div>
      </div>
      {canManage && <div className="settings-footer"><span><ShieldCheck size={15} /> Changes are recorded in the audit log.</span><div><button type="button" className="button secondary" disabled={!isDirty || !!busy} onClick={() => setSettings(savedSettings)}>Discard</button><button className="button primary" disabled={!isDirty || !!busy}>{busy === "save" ? <RefreshCw className="spin" size={16} /> : <Save size={16} />} Save changes</button></div></div>}
    </form>

    <section className="reminder-panel history-panel">
      <div className="panel-heading history-heading"><div className="panel-title"><span><Mail size={18} /></span><div><h2>Reminder history</h2><p>{meta.total} recorded {meta.total === 1 ? "delivery" : "deliveries"}</p></div></div><div className="history-filters"><label className="search-box"><Search size={16} /><input aria-label="Search reminder history" placeholder="Search asset or recipient" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />{searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput("")}><X size={14} /></button>}</label><select aria-label="Status filter" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">All statuses</option>{["SENT", "FAILED", "SKIPPED", "PROCESSING", "PENDING"].map((value) => <option key={value}>{value}</option>)}</select></div></div>
      <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Recipient</th><th>Expiry</th><th>Days left</th><th>Status</th><th>Attempts</th><th>Sent</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{loading ? [1, 2, 3].map((row) => <tr className="table-skeleton" key={row}><td colSpan={8}><i /></td></tr>) : items.map((item) => <tr key={item.id}><td><strong>{item.assetCode}</strong><small>{item.assetName}</small></td><td><strong>{item.recipientName || "Unassigned"}</strong><small>{item.recipientEmail || "No email address"}</small></td><td><strong>{item.expiryType}</strong><small>{formatDate(item.expiryDate)}</small></td><td><span className={`days-pill ${item.daysRemaining <= 1 ? "urgent" : ""}`}>{item.daysRemaining === 0 ? "Today" : item.daysRemaining}</span></td><td><span className={`status-badge ${item.status.toLowerCase()}`}><i />{item.status}</span></td><td>{item.attemptCount}</td><td>{formatDateTime(item.sentAtUtc)}</td><td><div className="row-actions"><button type="button" aria-label={`View ${item.assetCode} reminder details`} title="View details" onClick={() => setSelected(item)}><Eye size={16} /></button>{canManage && item.status === "FAILED" && <button type="button" aria-label={`Retry ${item.assetCode} reminder`} title="Retry" disabled={!!busy} onClick={() => void retry(item.id)}><RotateCcw size={15} /></button>}</div></td></tr>)}</tbody></table>{!loading && !items.length && <div className="empty-state"><span><Mail size={25} /></span><h3>{search || status ? "No matching reminders" : "No reminders recorded yet"}</h3><p>{search || status ? "Try clearing or changing the current filters." : "Reminder activity will appear here after the first eligible scan."}</p>{(search || status) && <button className="button secondary" onClick={() => { setSearchInput(""); setStatus("") }}>Clear filters</button>}</div>}</div>
      <footer className="history-footer"><span>Showing {items.length ? (page - 1) * 25 + 1 : 0}–{Math.min(page * 25, meta.total)} of {meta.total}</span><div><button aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span>Page {page} of {meta.totalPages || 1}</span><button aria-label="Next page" disabled={page >= (meta.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></footer>
    </section>

    {selected && <div className="reminder-modal" role="dialog" aria-modal="true" aria-labelledby="reminder-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><div className="modal-card"><header><div><span className={`status-badge ${selected.status.toLowerCase()}`}><i />{selected.status}</span><h2 id="reminder-detail-title">Reminder details</h2><p>{selected.assetCode} · {selected.expiryType}</p></div><button aria-label="Close details" onClick={() => setSelected(null)}><X size={18} /></button></header><dl><div><dt>Asset</dt><dd>{selected.assetName} <small>{selected.assetCode}</small></dd></div><div><dt>Recipient</dt><dd>{selected.recipientName || "Unassigned"} <small>{selected.recipientEmail || "No email"}</small></dd></div><div><dt>Expiry date</dt><dd>{formatDate(selected.expiryDate)}</dd></div><div><dt>Days remaining</dt><dd>{selected.daysRemaining}</dd></div><div><dt>Attempts</dt><dd>{selected.attemptCount}</dd></div><div><dt>Sent</dt><dd>{formatDateTime(selected.sentAtUtc)}</dd></div><div className="wide"><dt>Failure / skip reason</dt><dd>{selected.errorMessage || "None"}</dd></div><div className="wide"><dt>Correlation ID</dt><dd className="code-value">{selected.correlationId}</dd></div></dl></div></div>}

    {dialog && <div className="reminder-modal" role="dialog" aria-modal="true"><div className="modal-card action-dialog"><header><div><span className="dialog-icon">{dialog.type === "scan" ? <Play size={20} /> : <Send size={20} />}</span><h2>{dialog.type === "scan" ? "Run expiry scan now?" : dialog.type === "test" ? "Send a test reminder" : "Email preview"}</h2></div><button aria-label="Close dialog" onClick={() => setDialog(null)}><X size={18} /></button></header>{dialog.type === "scan" && <><p>The scan will evaluate all active assigned assets. Eligible employees may receive an email immediately; duplicate protection remains active.</p><div className="dialog-actions"><button className="button secondary" onClick={() => setDialog(null)}>Cancel</button><button className="button primary" disabled={!!busy} onClick={() => void perform("run", () => api.post("/asset-expiry-reminders/run", {}), "Expiry scan completed successfully.")}>{busy === "run" ? <RefreshCw className="spin" size={16} /> : <Play size={16} />} Run scan</button></div></>}{dialog.type === "test" && <form onSubmit={(event) => { event.preventDefault(); if (dialog.email) void perform("test", () => api.post("/asset-expiry-reminders/test-email", { email: dialog.email }), "Test reminder sent successfully.") }}><p>Send the fixed, clearly marked test template to a safe development mailbox.</p><label className="standalone-field"><span>Destination email</span><input autoFocus required type="email" placeholder="name@example.com" value={dialog.email} onChange={(event) => setDialog({ type: "test", email: event.target.value })} /></label><div className="dialog-actions"><button type="button" className="button secondary" onClick={() => setDialog(null)}>Cancel</button><button className="button primary" disabled={!dialog.email || !!busy}>{busy === "test" ? <RefreshCw className="spin" size={16} /> : <Send size={16} />} Send test</button></div></form>}</div></div>}
  </section>
}
