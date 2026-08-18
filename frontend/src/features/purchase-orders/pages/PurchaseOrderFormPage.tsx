import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Lock,
  PackageCheck,
  Plus,
  Save,
  Send,
  Trash2,
  Unlock,
  X,
} from "lucide-react"
import { API_URL, api, loadSession } from "../../../lib/api"
import { hasPermission } from "../../../auth/permissions"
import { itemTotal, Lookup, money, PoItem, PurchaseOrder } from "../types"
import "./PurchaseOrders.css"
const emptyItem = (): PoItem => ({
  itemName: "",
  unitPrice: 0,
  quantity: 1,
  taxRate: 0,
  discountType: "AMOUNT",
  discountValue: 0,
})
const today = () => new Date().toISOString().slice(0, 10)
const pathInfo = () => {
  const m = location.pathname.match(
    /^\/purchase-orders\/([^/]+)(?:\/(edit|receive))?$/,
  )
  return { id: m?.[1], mode: m?.[2] }
}
const back = () => {
  history.pushState({}, "", "/purchase-orders")
  window.dispatchEvent(new PopStateEvent("popstate"))
}
const downloadProtected = async (path: string, name: string) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${loadSession(false)?.accessToken || ""}` },
  })
  if (!response.ok) throw new Error("Download was not authorized.")
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
export default function PurchaseOrderFormPage() {
  const { id, mode } = pathInfo(),
    isNew = id === "new"
  const [po, setPo] = useState<Partial<PurchaseOrder>>({
      commodity: "Supplies",
      poDate: today(),
      poFor: "Computer",
      currencyCode: "PKR",
      isCommercial: false,
      otherCharges: 0,
      items: [],
    }),
    [masters, setMasters] = useState<Record<string, Lookup[]>>({}),
    [loading, setLoading] = useState(!isNew),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [dirty, setDirty] = useState(false),
    [editing, setEditing] = useState<number | null>(null),
    [draftItem, setDraftItem] = useState<PoItem>(emptyItem()),
    [collapsed, setCollapsed] = useState<Record<string, boolean>>({}),
    [receipt, setReceipt] = useState<Record<string, number>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    api
      .get<Record<string, Lookup[]>>("/task-lookups/asset-create")
      .then(setMasters)
      .catch(() => setError("Unable to load master selections."))
    if (!isNew && id)
      api
        .get<PurchaseOrder>(`/purchase-orders/${id}`)
        .then(setPo)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
  }, [id, isNew])
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    addEventListener("beforeunload", warn)
    return () => removeEventListener("beforeunload", warn)
  }, [dirty])
  const editable =
    isNew ||
    (["DRAFT", "REJECTED"].includes(po.status || "DRAFT") &&
      !po.isLocked &&
      mode !== undefined)
  const set = (key: string, value: unknown) => {
    setPo((p) => ({ ...p, [key]: value }))
    setDirty(true)
  }
  const totals = useMemo(() => {
    const items = po.items || []
    const subtotal = money(
      items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    )
    const discount = money(
      items.reduce((s, i) => {
        const b = i.unitPrice * i.quantity
        return (
          s +
          (i.discountType === "PERCENT"
            ? (b * i.discountValue) / 100
            : i.discountValue)
        )
      }, 0),
    )
    const grand = money(
      items.reduce((s, i) => s + itemTotal(i), 0) +
        Number(po.otherCharges || 0),
    )
    return {
      subtotal,
      discount,
      tax: money(grand - subtotal + discount - Number(po.otherCharges || 0)),
      grand,
      quantity: items.reduce((s, i) => s + Number(i.quantity), 0),
      received: items.reduce((s, i) => s + Number(i.receivedQuantity || 0), 0),
    }
  }, [po.items, po.otherCharges])
  const payload = () => ({
    ...po,
    poDate: po.poDate || today(),
    items: (po.items || []).map(
      ({
        id: _,
        lineNumber: __,
        receivedQuantity: ___,
        discountAmount: ____,
        taxAmount: _____,
        lineTotal: ______,
        ...x
      }) => x,
    ),
  })
  const save = async () => {
    if (!po.vendorId || !po.poFor || !po.poDate) {
      setError("PO date, PO for, and vendor are required.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const saved = isNew
        ? await api.post<PurchaseOrder>("/purchase-orders", payload())
        : await api.put<PurchaseOrder>(`/purchase-orders/${id}`, payload())
      setPo(saved)
      setDirty(false)
      setSuccess("Purchase order saved.")
      if (isNew) {
        history.replaceState({}, "", `/purchase-orders/${saved.id}/edit`)
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save purchase order.",
      )
    } finally {
      setBusy(false)
    }
  }
  const action = async (name: string, comment?: string) => {
    if (!id) return
    setBusy(true)
    setError("")
    try {
      const next = await api.post<PurchaseOrder>(
        `/purchase-orders/${id}/${name}`,
        { comment, rowVersion: po.rowVersion },
      )
      setPo(next)
      setDirty(false)
      setSuccess(`Purchase order ${name}d.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.")
    } finally {
      setBusy(false)
    }
  }
  const statusAction = (name: string, requiresComment = false) => {
    const comment = requiresComment
      ? prompt(`Reason for ${name}:`) || ""
      : undefined
    if (requiresComment && !comment) return
    void action(name, comment)
  }
  const editItem = (index: number) => {
    setDraftItem({ ...po.items![index] })
    setEditing(index)
  }
  const saveItem = () => {
    if (
      !draftItem.itemName.trim() ||
      draftItem.quantity <= 0 ||
      draftItem.unitPrice < 0
    ) {
      setError(
        "Item name, positive quantity, and non-negative unit price are required.",
      )
      return
    }
    const list = [...(po.items || [])]
    if (editing === -1)
      list.push({
        ...draftItem,
        lineNumber: list.length + 1,
        lineTotal: itemTotal(draftItem),
      })
    else
      list[editing!] = {
        ...draftItem,
        lineNumber: editing! + 1,
        lineTotal: itemTotal(draftItem),
      }
    set("items", list)
    setEditing(null)
  }
  const section = (key: string, title: string, content: React.ReactNode) => (
    <section className="po-card po-section">
      <button
        className="po-section-title"
        onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
      >
        <span>{title}</span>
        <span>{collapsed[key] ? "+" : "−"}</span>
      </button>
      {!collapsed[key] && <div className="po-grid">{content}</div>}
    </section>
  )
  const input = (
    label: string,
    key: keyof PurchaseOrder,
    type = "text",
    required = false,
  ) => (
    <label>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      <input
        type={type}
        value={String(po[key] ?? "").slice(0, 4000)}
        disabled={!editable}
        onChange={(e) => set(key, e.target.value)}
      />
    </label>
  )
  if (loading)
    return <div className="po-card po-loading">Loading purchase order…</div>
  return (
    <div className="po-page">
      <header className="po-sticky">
        <button
          onClick={() => {
            if (!dirty || confirm("Discard unsaved changes?")) back()
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div>
          <h1>{isNew ? "Create Purchase Order" : `PO ${po.poNumber}`}</h1>
          <span
            className={`po-status s-${(po.status || "draft").toLowerCase()}`}
          >
            {po.status || "DRAFT"}
          </span>
          {po.isLocked && <span> · Locked</span>}
          <small>
            {po.updatedAt &&
              ` Last saved ${new Date(po.updatedAt).toLocaleString()}`}
          </small>
        </div>
        <div className="po-actions">
          {editable &&
            hasPermission(
              isNew ? "purchase_orders.create" : "purchase_orders.edit",
            ) && (
              <button className="primary" disabled={busy} onClick={save}>
                <Save size={16} />
                Save Draft
              </button>
            )}
          {po.status === "DRAFT" && hasPermission("purchase_orders.submit") && (
            <button disabled={busy || dirty} onClick={() => action("submit")}>
              <Send size={16} />
              Submit
            </button>
          )}
          {po.status === "PENDING_APPROVAL" &&
            hasPermission("purchase_orders.approve") && (
              <button onClick={() => action("approve")}>
                <Check size={16} />
                Approve
              </button>
            )}
          {po.status === "PENDING_APPROVAL" &&
            hasPermission("purchase_orders.reject") && (
              <button onClick={() => statusAction("reject", true)}>
                <X size={16} />
                Reject
              </button>
            )}
          {po.id && hasPermission("purchase_orders.print") && (
            <button
              onClick={() =>
                downloadProtected(
                  `/purchase-orders/${po.id}/pdf`,
                  `PO-${po.poNumber}.pdf`,
                ).catch((reason) => setError(reason.message))
              }
            >
              <Download size={16} />
              PDF
            </button>
          )}
          {po.id &&
            (po.isLocked
              ? hasPermission("purchase_orders.unlock")
              : hasPermission("purchase_orders.lock")) && (
              <button onClick={() => action(po.isLocked ? "unlock" : "lock")}>
                {po.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              </button>
            )}
        </div>
      </header>
      {error && (
        <div className="po-alert" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="po-success" role="status">
          {success}
        </div>
      )}
      <div className="po-form-layout">
        <main>
          {section(
            "basic",
            "1. Basic PO Information",
            <>
              <label>
                <span>Commodity *</span>
                <select
                  disabled={!editable}
                  value={po.commodity}
                  onChange={(e) => set("commodity", e.target.value)}
                >
                  <option>Supplies</option>
                  <option>Equipment</option>
                  <option>Services</option>
                </select>
              </label>
              {input("PO Number", "poNumber", "text")}{" "}
              {input("PO Date", "poDate", "date", true)}
              <label>
                <span>PO Year</span>
                <input readOnly value={(po.poDate || today()).slice(0, 4)} />
              </label>
              {input("EFU Reference", "efuReference")}
              {input("PO For", "poFor", "text", true)}
              <label>
                <span>Currency *</span>
                <select
                  disabled={!editable}
                  value={po.currencyCode}
                  onChange={(e) => set("currencyCode", e.target.value)}
                >
                  <option>PKR</option>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
              </label>
              <label>
                <span>Commercial *</span>
                <select
                  disabled={!editable}
                  value={String(po.isCommercial)}
                  onChange={(e) =>
                    set("isCommercial", e.target.value === "true")
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
            </>,
          )}
          {section(
            "vendor",
            "2. Vendor and Quotation",
            <>
              <label>
                <span>Vendor *</span>
                <select
                  disabled={!editable}
                  value={po.vendorId || ""}
                  onChange={(e) => {
                    set("vendorId", e.target.value)
                    set(
                      "vendorEmailSnapshot",
                      masters.vendor?.find((v) => v.id === e.target.value)
                        ?.email || "",
                    )
                  }}
                >
                  <option value="">Select vendor</option>
                  {masters.vendor?.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              {input("Vendor Email", "vendorEmailSnapshot", "email")}
              {input("Quotation ID", "quotationId")}
              {input("Quotation Date", "quotationDate", "date")}
              {input("Payment Terms", "paymentTerms")}
              <label className="span-2">
                <span>Terms and Conditions</span>
                <textarea
                  disabled={!editable}
                  value={po.termsAndConditions || ""}
                  onChange={(e) => set("termsAndConditions", e.target.value)}
                />
              </label>
            </>,
          )}
          {section(
            "shipment",
            "3. Shipment and Delivery",
            <>
              {input("Shipment Time", "shipmentTime")}
              {input("Shipment Tag", "shipmentTag")}
              {input("Shipment Date", "shipmentDate", "date")}
              {input("Shipment Within", "shipmentWithin")}
              {input("Expected Delivery", "expectedDeliveryDate", "date")}
              <label>
                <span>Delivery Branch / Unit</span>
                <select
                  disabled={!editable}
                  value={po.deliveryLocationId || ""}
                  onChange={(e) => set("deliveryLocationId", e.target.value)}
                >
                  <option value="">Select location</option>
                  {masters.location?.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              {input("Delivery Address", "deliveryAddress")}
              {input("Contact Person", "contactPerson")}
              {input("Contact Number", "contactNumber")}
              <label className="span-2">
                <span>Delivery Instructions</span>
                <textarea
                  disabled={!editable}
                  value={po.deliveryInstructions || ""}
                  onChange={(e) => set("deliveryInstructions", e.target.value)}
                />
              </label>
            </>,
          )}
          <section className="po-card po-section">
            <div className="po-section-head">
              <h2>4. Purchase Order Items</h2>
              {editable && (
                <button
                  className="primary"
                  onClick={() => {
                    setDraftItem(emptyItem())
                    setEditing(-1)
                  }}
                >
                  <Plus size={16} />
                  Add Item
                </button>
              )}
            </div>
            <div className="po-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Make / Model</th>
                    <th>Branch</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Tax</th>
                    <th>Discount</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((i, index) => (
                    <tr key={i.id || index}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{i.itemName}</strong>
                        <small>{i.itemCode}</small>
                      </td>
                      <td>{i.model || "—"}</td>
                      <td>
                        {masters.location?.find((x) => x.id === i.branchUnitId)
                          ?.name || "—"}
                      </td>
                      <td>{i.quantity}</td>
                      <td>{i.unitPrice.toFixed(2)}</td>
                      <td>{i.taxRate}%</td>
                      <td>
                        {i.discountValue}
                        {i.discountType === "PERCENT" ? "%" : ""}
                      </td>
                      <td>{itemTotal(i).toFixed(2)}</td>
                      <td>
                        {editable && (
                          <>
                            <button
                              className="icon"
                              onClick={() => editItem(index)}
                            >
                              Edit
                            </button>
                            <button
                              className="icon"
                              onClick={() => {
                                if (!i.id || confirm("Delete this saved line?"))
                                  set(
                                    "items",
                                    po.items!.filter((_, x) => x !== index),
                                  )
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                            <button
                              className="icon"
                              onClick={() =>
                                set("items", [
                                  ...po.items!,
                                  {
                                    ...i,
                                    id: undefined,
                                    lineNumber: undefined,
                                  },
                                ])
                              }
                            >
                              <Copy size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!po.items?.length && (
                <div className="po-empty">No line items yet.</div>
              )}
            </div>
          </section>
          {section(
            "assignment",
            "5. Assignment Information",
            <>
              <label>
                <span>Default Branch / Unit</span>
                <select
                  disabled={!editable}
                  value={po.deliveryLocationId || ""}
                  onChange={(e) => set("deliveryLocationId", e.target.value)}
                >
                  <option value="">Select location</option>
                  {masters.location?.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              {input("Remarks", "remarks")}
              <p className="span-2 po-help">
                Intended users are recorded on individual lines. Assets remain
                available after receipt; no allocation is created automatically.
              </p>
            </>,
          )}
          {section(
            "notes",
            "6. Notes and Attachments",
            <>
              <label className="span-2">
                <span>Internal Notes</span>
                <textarea
                  disabled={!editable}
                  value={po.internalNotes || ""}
                  onChange={(e) => set("internalNotes", e.target.value)}
                />
              </label>
              <label className="span-2">
                <span>Vendor-facing Notes</span>
                <textarea
                  disabled={!editable}
                  value={po.vendorNotes || ""}
                  onChange={(e) => set("vendorNotes", e.target.value)}
                />
              </label>
              {po.id && hasPermission("purchase_orders.attachments.manage") && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const body = new FormData()
                      body.append("file", file)
                      body.append("category", "SUPPORTING")
                      try {
                        await api.upload(
                          `/purchase-orders/${po.id}/attachments`,
                          body,
                        )
                        setSuccess("Attachment uploaded.")
                      } catch (x) {
                        setError(
                          x instanceof Error ? x.message : "Upload failed",
                        )
                      }
                    }}
                  />
                  <button onClick={() => fileRef.current?.click()}>
                    Upload supporting document
                  </button>
                </>
              )}
              <div className="span-2">
                {po.attachments?.map((a) => (
                  <button
                    className="link"
                    key={a.id}
                    onClick={() =>
                      downloadProtected(
                        `/purchase-orders/${po.id}/attachments/${a.id}`,
                        a.originalFileName,
                      ).catch((reason) => setError(reason.message))
                    }
                  >
                    {a.originalFileName}
                  </button>
                ))}
              </div>
            </>,
          )}
          {section(
            "activity",
            "7. Approval and Activity",
            <div className="span-2 po-timeline">
              {po.activity?.map((a) => (
                <article key={a.id}>
                  <i />
                  <div>
                    <strong>{a.action.replaceAll("_", " ")}</strong>
                    <span>
                      {a.user} · {new Date(a.performedAt).toLocaleString()}
                    </span>
                    {a.comment && <p>{a.comment}</p>}
                  </div>
                </article>
              ))}
              {!po.activity?.length && (
                <p>Activity begins after the draft is saved.</p>
              )}
            </div>,
          )}
        </main>
        <aside className="po-card po-summary">
          <h2>PO Summary</h2>
          <dl>
            <dt>Lines</dt>
            <dd>{po.items?.length || 0}</dd>
            <dt>Ordered quantity</dt>
            <dd>{totals.quantity}</dd>
            <dt>Received quantity</dt>
            <dd>{totals.received}</dd>
            <dt>Remaining</dt>
            <dd>{totals.quantity - totals.received}</dd>
            <dt>Subtotal</dt>
            <dd>{totals.subtotal.toFixed(2)}</dd>
            <dt>Discount</dt>
            <dd>− {totals.discount.toFixed(2)}</dd>
            <dt>Tax</dt>
            <dd>{totals.tax.toFixed(2)}</dd>
            <dt>Other charges</dt>
            <dd>{Number(po.otherCharges || 0).toFixed(2)}</dd>
            <dt className="grand">Grand total</dt>
            <dd className="grand">
              {po.currencyCode} {totals.grand.toFixed(2)}
            </dd>
          </dl>
          <p>
            Status: <strong>{po.status || "DRAFT"}</strong>
          </p>
          <p>Created by: {po.createdBy || "Not saved"}</p>
          {["APPROVED", "PARTIALLY_RECEIVED"].includes(po.status || "") &&
            hasPermission("purchase_orders.receive") && (
              <button
                className="primary wide"
                onClick={() => {
                  history.pushState({}, "", `/purchase-orders/${po.id}/receive`)
                  dispatchEvent(new PopStateEvent("popstate"))
                }}
              >
                <PackageCheck size={16} />
                Receive Items
              </button>
            )}
        </aside>
      </div>
      {editing !== null && (
        <div
          className="po-modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div
            className="po-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-title"
          >
            <header>
              <h2 id="item-title">{editing === -1 ? "Add" : "Edit"} PO Item</h2>
              <button aria-label="Close" onClick={() => setEditing(null)}>
                <X />
              </button>
            </header>
            <div className="po-grid">
              <label>
                <span>Item Name *</span>
                <input
                  autoFocus
                  value={draftItem.itemName}
                  onChange={(e) =>
                    setDraftItem((i) => ({ ...i, itemName: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>Item Code</span>
                <input
                  value={draftItem.itemCode || ""}
                  onChange={(e) =>
                    setDraftItem((i) => ({ ...i, itemCode: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>Asset Type</span>
                <select
                  value={draftItem.assetTypeId || ""}
                  onChange={(e) =>
                    setDraftItem((i) => ({ ...i, assetTypeId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {masters["asset-type"]?.map((x) => (
                    <option value={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Make</span>
                <select
                  value={draftItem.assetMakeId || ""}
                  onChange={(e) =>
                    setDraftItem((i) => ({ ...i, assetMakeId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {masters["asset-make"]?.map((x) => (
                    <option value={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
              {([
                "model",
                "qualityType",
                "printerType",
                "productName",
              ] as const).map((k) => (
                <label key={k}>
                  <span>{k.replace(/([A-Z])/g, " $1")}</span>
                  <input
                    value={draftItem[k] || ""}
                    onChange={(e) =>
                      setDraftItem((i) => ({ ...i, [k]: e.target.value }))
                    }
                  />
                </label>
              ))}
              {([
                "unitPrice",
                "quantity",
                "taxRate",
                "discountValue",
              ] as const).map((k) => (
                <label key={k}>
                  <span>{k.replace(/([A-Z])/g, " $1")}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftItem[k]}
                    onChange={(e) =>
                      setDraftItem((i) => ({
                        ...i,
                        [k]: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
              <label>
                <span>Discount Type</span>
                <select
                  value={draftItem.discountType}
                  onChange={(e) =>
                    setDraftItem((i) => ({
                      ...i,
                      discountType: e.target.value as "AMOUNT" | "PERCENT",
                    }))
                  }
                >
                  <option>AMOUNT</option>
                  <option>PERCENT</option>
                </select>
              </label>
              <label>
                <span>Branch / Unit</span>
                <select
                  value={draftItem.branchUnitId || ""}
                  onChange={(e) =>
                    setDraftItem((i) => ({
                      ...i,
                      branchUnitId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select</option>
                  {masters.location?.map((x) => (
                    <option value={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
              <label className="span-2">
                <span>Description / Remarks</span>
                <textarea
                  value={draftItem.description || ""}
                  onChange={(e) =>
                    setDraftItem((i) => ({ ...i, description: e.target.value }))
                  }
                />
              </label>
            </div>
            <footer>
              <strong>
                Line total: {po.currencyCode} {itemTotal(draftItem).toFixed(2)}
              </strong>
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" onClick={saveItem}>
                Save item
              </button>
            </footer>
          </div>
        </div>
      )}
      {mode === "receive" && (
        <div className="po-modal-backdrop">
          <div className="po-modal" role="dialog" aria-modal="true">
            <header>
              <h2>Receive PO {po.poNumber}</h2>
              <button onClick={() => history.back()}>
                <X />
              </button>
            </header>
            <div className="po-receive-lines">
              {po.items?.map((i) => (
                <label key={i.id}>
                  <span>
                    {i.itemName} — remaining{" "}
                    {Number(i.quantity) - Number(i.receivedQuantity || 0)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={Number(i.quantity) - Number(i.receivedQuantity || 0)}
                    value={receipt[i.id!] || 0}
                    onChange={(e) =>
                      setReceipt((r) => ({
                        ...r,
                        [i.id!]: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <footer>
              <button onClick={() => history.back()}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  const locationId =
                    po.deliveryLocationId || masters.location?.[0]?.id
                  if (!locationId) {
                    setError("A receiving location is required.")
                    return
                  }
                  try {
                    await api.post(`/purchase-orders/${po.id}/receipts`, {
                      receivedDate: today(),
                      locationId,
                      items: Object.entries(receipt)
                        .filter(([, q]) => q > 0)
                        .map(([purchaseOrderItemId, quantityReceived]) => ({
                          purchaseOrderItemId,
                          quantityReceived,
                          condition: "GOOD",
                          units: [],
                        })),
                    })
                    setSuccess("Receipt saved.")
                    history.back()
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Receipt failed")
                  }
                }}
              >
                Save receipt
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
