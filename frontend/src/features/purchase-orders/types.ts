export const PO_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CANCELLED",
  "CLOSED",
] as const
export type PoStatus = typeof PO_STATUSES[number]
export interface Lookup {
  id: string
  name?: string
  email?: string
  prefix?: string
}
export interface PoItem {
  id?: string
  lineNumber?: number
  itemCode?: string
  itemName: string
  assetTypeId?: string
  assetMakeId?: string
  model?: string
  qualityType?: string
  printerType?: string
  productName?: string
  description?: string
  unitPrice: number
  quantity: number
  receivedQuantity?: number
  taxRate: number
  discountType: "AMOUNT" | "PERCENT"
  discountValue: number
  discountAmount?: number
  taxAmount?: number
  lineTotal?: number
  branchUnitId?: string
  intendedUserId?: string
  remarks?: string
}
export interface PurchaseOrder {
  id: string
  poNumber: string
  commodity: string
  poDate: string
  poYear: number
  efuReference?: string
  poFor: string
  currencyCode: string
  isCommercial: boolean
  vendorId: string
  vendor?: Lookup
  vendorEmailSnapshot?: string
  quotationId?: string
  quotationDate?: string
  termsAndConditions?: string
  paymentTerms?: string
  shipmentTime?: string
  shipmentTag?: string
  shipmentDate?: string
  shipmentWithin?: string
  expectedDeliveryDate?: string
  deliveryLocationId?: string
  deliveryLocation?: string
  deliveryAddress?: string
  contactPerson?: string
  contactNumber?: string
  deliveryInstructions?: string
  internalNotes?: string
  vendorNotes?: string
  remarks?: string
  subtotal: number
  discountTotal: number
  taxTotal: number
  otherCharges: number
  grandTotal: number
  status: PoStatus
  isLocked: boolean
  source: string
  createdBy?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  rowVersion: string
  items: PoItem[]
  attachments: {
    id: string
    originalFileName: string
    category: string
    mimeType: string
    fileSize: number
    uploadedAt: string
  }[]
  activity: {
    id: string
    action: string
    fromStatus?: string
    toStatus: string
    comment?: string
    performedAt: string
    user: string
  }[]
}
export const money = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100
export const itemTotal = (i: PoItem) => {
  const base = money(Number(i.unitPrice) * Number(i.quantity))
  const discount =
    i.discountType === "PERCENT"
      ? money((base * Number(i.discountValue)) / 100)
      : money(Number(i.discountValue))
  const taxable = base - discount
  return money(taxable + money((taxable * Number(i.taxRate)) / 100))
}
