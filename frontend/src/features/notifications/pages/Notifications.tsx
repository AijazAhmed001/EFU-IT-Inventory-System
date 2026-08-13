import { useEffect, useState } from "react"
import { Bell, Check, CheckCheck, Clock3, Inbox, RefreshCw } from "lucide-react"
import { api } from "../../../lib/api"
import "./Notifications.css"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  createdAt: string
  readAt?: string | null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function Notifications() {
  const [items, setItems] = useState<Notification[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setError("")
    try {
      setItems(await api.get<Notification[]>("/notifications"))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Notifications could not be loaded.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const markAll = async () => {
    setUpdating(true)
    try {
      await api.patch("/notifications/read-all", {})
      const readAt = new Date().toISOString()
      setItems((all) => all.map((item) => ({ ...item, readAt: item.readAt || readAt })))
    } finally {
      setUpdating(false)
    }
  }

  const markOne = async (id: string) => {
    const updated = await api.patch<Notification>(`/notifications/${id}/read`, {})
    setItems((all) => all.map((item) => item.id === id ? updated : item))
  }

  const unread = items.filter((item) => !item.readAt).length

  return (
    <section className="notifications-page">
      <header className="notifications-header">
        <div>
          <div className="notifications-eyebrow"><Bell size={14} /> Notification center</div>
          <h1>Notifications</h1>
          <p>Review system alerts and recent inventory activity.</p>
        </div>
        <div className="notifications-actions">
          <span className={`notifications-count ${unread ? "has-unread" : ""}`}>
            {unread} unread
          </span>
          <button type="button" onClick={markAll} disabled={!unread || updating}>
            <CheckCheck size={17} /> {updating ? "Updating" : "Mark all as read"}
          </button>
        </div>
      </header>

      {error && (
        <div className="notifications-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()}><RefreshCw size={15} /> Retry</button>
        </div>
      )}

      {!error && loading && (
        <div className="notifications-list" aria-label="Loading notifications">
          {[1, 2, 3].map((item) => <div className="notification-skeleton" key={item} />)}
        </div>
      )}

      {!error && !loading && !items.length && (
        <div className="notifications-empty">
          <span><Inbox size={30} /></span>
          <h2>You’re all caught up</h2>
          <p>New system alerts and inventory activity will appear here.</p>
        </div>
      )}

      {!error && !loading && items.length > 0 && (
        <div className="notifications-list">
          {items.map((item) => {
            const isUnread = !item.readAt
            return (
              <article className={`notification-card ${isUnread ? "is-unread" : ""}`} key={item.id}>
                <div className="notification-icon"><Bell size={19} /></div>
                <div className="notification-content">
                  <div className="notification-title-row">
                    <h2>{item.title}</h2>
                    <time dateTime={item.createdAt}><Clock3 size={13} /> {formatDate(item.createdAt)}</time>
                  </div>
                  <p>{item.message}</p>
                  <div className="notification-meta">
                    <span className={isUnread ? "unread-badge" : "read-badge"}>
                      {isUnread ? "New" : <><Check size={12} /> Read</>}
                    </span>
                    {isUnread && <button type="button" onClick={() => void markOne(item.id)}>Mark as read</button>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
