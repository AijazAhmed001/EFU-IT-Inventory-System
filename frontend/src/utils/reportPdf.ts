import { formatMoney, getCurrencyContext, type CurrencyCode } from './currency'

export interface CompleteReportExport {
  fileName: string
  generatedAt: string
  inventory: Array<Record<string, string | number | undefined>>
  assetHistory: Array<Record<string, string | undefined>>
  statusHistory?: Array<Record<string, string | undefined>>
  auditLog: Array<Record<string, string | undefined>>
}

export interface AssetHistoryPdfExport {
  asset: {
    assetCode?: string
    model?: string
    serialNumber?: string
    status?: string
    purchaseDate?: string
    purchaseCost?: number
    assetType?: string
    assetMake?: string
    vendor?: string
  }
  events: Array<{
    eventType?: string
    fromStatus?: string
    toStatus?: string
    effectiveAt?: string
    employeeName?: string
    employeeCode?: string
    department?: string
    location?: string
    performedBy?: string
    remarks?: string
  }>
}

const BRAND = {
  navy: [6, 30, 61] as [number, number, number],
  blue: [5, 88, 156] as [number, number, number],
  blueDark: [3, 63, 113] as [number, number, number],
  cyan: [14, 165, 233] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  violet: [124, 58, 237] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  blueSoft: [235, 245, 255] as [number, number, number],
  text: [25, 35, 52] as [number, number, number],
  muted: [93, 108, 126] as [number, number, number],
  border: [218, 226, 235] as [number, number, number],
  surface: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

const value = (input: unknown) =>
  input == null || input === '' ? '-' : String(input)

const date = (input?: string) => {
  if (!input) return '-'
  const parsed = new Date(input)
  if (Number.isNaN(parsed.getTime())) return '-'

  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

const money = (input: number | undefined, currency: CurrencyCode, rate: number) =>
  rate ? formatMoney(input, currency, rate) : 'Rate unavailable'

const statusLabel = (input?: string) =>
  value(input)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())

type JsPdfLike = import('jspdf').jsPDF

function createPreviewWindow() {
  const preview = window.open('', '_blank')
  if (preview) {
    preview.document.title = 'Preparing EFU report...'
    preview.document.body.innerHTML = '<div style="font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;background:#f4f8fc;color:#063f71"><div style="text-align:center"><strong style="font-size:20px">Preparing your report</strong><p style="color:#64748b">The professional PDF preview will open shortly.</p></div></div>'
  }
  return preview
}

function showPdfPreview(document: JsPdfLike, fileName: string, preview: Window | null) {
  document.setProperties({
    title: fileName.replace(/\.pdf$/i, ''),
    subject: 'EFU IT Hardware Inventory Management Report',
    author: 'EFU General Insurance - IT Department',
    creator: 'EFU IT Hardware Inventory Management System',
  })
  const file = new File([document.output('blob')], fileName, { type: 'application/pdf' })
  const url = URL.createObjectURL(file)
  if (preview) {
    preview.location.replace(url)
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000)
    return
  }
  document.save(fileName)
}

function drawHeader(
  document: JsPdfLike,
  title: string,
  subtitle: string,
  badge?: string,
) {
  const pageWidth = document.internal.pageSize.getWidth()

  document.setFillColor(...BRAND.navy)
  document.rect(0, 0, pageWidth, 78, 'F')

  document.setFillColor(...BRAND.cyan)
  document.rect(0, 0, pageWidth, 4, 'F')
  document.setFillColor(...BRAND.blue)
  document.rect(0, 4, 8, 74, 'F')

  document.setDrawColor(255, 255, 255)
  document.setLineWidth(1.2)
  document.roundedRect(20, 20, 28, 28, 7, 7, 'S')
  document.setTextColor(...BRAND.white)
  document.setFont('helvetica', 'bold')
  document.setFontSize(11)
  document.text('EFU', 34, 38, { align: 'center' })

  document.setTextColor(...BRAND.white)
  document.setFont('helvetica', 'bold')
  document.setFontSize(19)
  document.text(title, 60, 31)

  document.setFont('helvetica', 'normal')
  document.setFontSize(8.5)
  document.text(subtitle, 60, 50)

  if (badge) {
    const badgeWidth = Math.max(88, document.getTextWidth(badge) + 22)
    document.setFillColor(255, 255, 255)
    document.roundedRect(pageWidth - 34 - badgeWidth, 24, badgeWidth, 26, 6, 6, 'F')
    document.setTextColor(...BRAND.blueDark)
    document.setFont('helvetica', 'bold')
    document.setFontSize(8)
    document.text(badge, pageWidth - 34 - badgeWidth / 2, 41, { align: 'center' })
  }

  document.setTextColor(...BRAND.text)
}

function drawSectionTitle(
  document: JsPdfLike,
  title: string,
  subtitle: string,
  y: number,
) {
  document.setFillColor(...BRAND.blue)
  document.roundedRect(34, y, 5, 27, 2, 2, 'F')

  document.setTextColor(...BRAND.text)
  document.setFont('helvetica', 'bold')
  document.setFontSize(12)
  document.text(title, 48, y + 10)

  document.setFont('helvetica', 'normal')
  document.setTextColor(...BRAND.muted)
  document.setFontSize(8)
  document.text(subtitle, 48, y + 23)

  document.setTextColor(...BRAND.text)
}

function drawMetricCard(
  document: JsPdfLike,
  x: number,
  y: number,
  width: number,
  label: string,
  metric: string,
  accent: [number, number, number] = BRAND.blue,
) {
  document.setFillColor(...BRAND.white)
  document.setDrawColor(...BRAND.border)
  document.roundedRect(x, y, width, 58, 8, 8, 'FD')
  document.setFillColor(...accent)
  document.roundedRect(x, y, 5, 58, 2, 2, 'F')
  document.setFillColor(accent[0], accent[1], accent[2])
  document.circle(x + width - 16, y + 16, 5, 'F')

  document.setTextColor(...BRAND.muted)
  document.setFont('helvetica', 'normal')
  document.setFontSize(8)
  document.text(label, x + 13, y + 20)

  document.setTextColor(...BRAND.text)
  document.setFont('helvetica', 'bold')
  document.setFontSize(17)
  document.text(metric, x + 13, y + 43)
}

function drawFooter(
  document: JsPdfLike,
  leftText: string,
) {
  const pageCount = document.getNumberOfPages()

  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)

    const pageWidth = document.internal.pageSize.getWidth()
    const pageHeight = document.internal.pageSize.getHeight()

    document.setDrawColor(...BRAND.border)
    document.line(34, pageHeight - 28, pageWidth - 34, pageHeight - 28)

    document.setFont('helvetica', 'normal')
    document.setFontSize(7)
    document.setTextColor(...BRAND.muted)

    document.text(leftText, 34, pageHeight - 14)
    document.text(
      `EFU General Insurance  |  Page ${page} of ${pageCount}`,
      pageWidth - 34,
      pageHeight - 14,
      { align: 'right' },
    )
  }
}

export async function downloadCompleteReportPdf(report: CompleteReportExport) {
  const preview = createPreviewWindow()
  const currencyContext = await getCurrencyContext()
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  })

  const margin = 34
  const pageWidth = document.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2

  const makeTablePage = (
    title: string,
    subtitle: string,
    head: string[][],
    body: string[][],
    columnStyles?: Record<number, Record<string, unknown>>,
  ) => {
    document.addPage()
    drawHeader(
      document,
      `EFU IT Hardware Inventory - ${title}`,
      subtitle,
      'CONFIDENTIAL',
    )

    autoTable(document, {
      startY: 98,
      head,
      body,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.4,
        cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
        overflow: 'linebreak',
        textColor: BRAND.text,
        lineColor: BRAND.border,
        lineWidth: 0.35,
        valign: 'middle',
      },
      headStyles: {
        fillColor: BRAND.navy,
        textColor: BRAND.white,
        fontStyle: 'bold',
        halign: 'left',
        minCellHeight: 26,
      },
      alternateRowStyles: {
        fillColor: [246, 249, 252],
      },
      margin: {
        left: margin,
        right: margin,
        bottom: 42,
      },
      columnStyles,
      didDrawPage: data => {
        if (data.pageNumber > 1) {
          document.setFillColor(...BRAND.blueSoft)
          document.rect(0, 0, pageWidth, 22, 'F')
        }
      },
    })
  }

  drawHeader(
    document,
    'EFU IT Hardware Inventory',
    `Complete inventory report  |  Generated ${date(report.generatedAt)}`,
    'MANAGEMENT REPORT',
  )

  document.setTextColor(...BRAND.text)
  document.setFont('helvetica', 'bold')
  document.setFontSize(24)
  document.text('Executive Inventory Report', margin, 118)

  document.setFont('helvetica', 'normal')
  document.setFontSize(9)
  document.setTextColor(...BRAND.muted)
  document.text(
    'A consolidated management view of asset investment, movement, lifecycle and operational activity.',
    margin,
    137,
  )

  const cardGap = 12
  const cardWidth = (contentWidth - cardGap * 3) / 4
  const cardsY = 166

  drawMetricCard(document, margin, cardsY, cardWidth, 'Inventory assets', String(report.inventory.length), BRAND.blue)
  drawMetricCard(
    document,
    margin + (cardWidth + cardGap),
    cardsY,
    cardWidth,
    'Asset history records',
    String(report.assetHistory.length), BRAND.green,
  )
  drawMetricCard(
    document,
    margin + (cardWidth + cardGap) * 2,
    cardsY,
    cardWidth,
    'Lifecycle events',
    String(report.statusHistory?.length ?? 0), BRAND.violet,
  )
  drawMetricCard(
    document,
    margin + (cardWidth + cardGap) * 3,
    cardsY,
    cardWidth,
    'Audit records',
    String(report.auditLog.length), BRAND.amber,
  )

  drawSectionTitle(
    document,
    'Report scope',
    'This PDF contains all report sections available for the selected export.',
    252,
  )

  document.setFillColor(...BRAND.surface)
  document.setDrawColor(...BRAND.border)
  document.roundedRect(margin, 291, contentWidth, 118, 8, 8, 'FD')

  const scope = [
    ['Inventory', 'Asset identification, type, make, vendor, location, status and purchase cost.'],
    ['Asset History', 'Allocation, employee, department, location, return status and remarks.'],
    ['Lifecycle History', 'Status transitions and asset lifecycle events with timestamps.'],
    ['Audit Log', 'Recorded user and system actions for traceability and compliance.'],
  ]

  scope.forEach(([label, description], index) => {
    const y = 315 + index * 23
    document.setFont('helvetica', 'bold')
    document.setFontSize(8.5)
    document.setTextColor(...BRAND.blueDark)
    document.text(label, margin + 15, y)

    document.setFont('helvetica', 'normal')
    document.setTextColor(...BRAND.muted)
    document.text(description, margin + 105, y)
  })

  makeTablePage(
    'Inventory',
    `${report.inventory.length} asset records`,
    [['Asset ID', 'Model', 'Serial number', 'Type', 'Make', 'Vendor', 'Location', 'Status', `Cost (${currencyContext.currency})`]],
    report.inventory.map(row => [
      value(row.assetCode),
      value(row.model),
      value(row.serialNumber),
      value(row.assetType),
      value(row.assetMake),
      value(row.vendor),
      value(row.location),
      statusLabel(row.status as string),
      money(row.purchaseCost as number, currencyContext.currency, currencyContext.rate),
    ]),
    {
      0: { cellWidth: 70 },
      1: { cellWidth: 96 },
      2: { cellWidth: 92 },
      3: { cellWidth: 58 },
      4: { cellWidth: 78 },
      5: { cellWidth: 90 },
      6: { cellWidth: 95 },
      7: { cellWidth: 64 },
      8: { cellWidth: 78, halign: 'right' },
    },
  )

  makeTablePage(
    'Asset History',
    `${report.assetHistory.length} allocation and return records`,
    [['Asset', 'Employee', 'Department', 'Location', 'Allocated', 'Returned', 'Status', 'Remarks']],
    report.assetHistory.map(row => [
      `${value(row.assetCode)}\n${value(row.assetModel)}`,
      `${value(row.employee)}\n${value(row.employeeCode)}`,
      value(row.department),
      value(row.location),
      date(row.allocationDate),
      date(row.returnedAt),
      statusLabel(row.status),
      value(row.remarks),
    ]),
    {
      0: { cellWidth: 98 },
      1: { cellWidth: 105 },
      2: { cellWidth: 90 },
      3: { cellWidth: 95 },
      4: { cellWidth: 86 },
      5: { cellWidth: 86 },
      6: { cellWidth: 65 },
    },
  )

  makeTablePage(
    'Lifecycle History',
    `${report.statusHistory?.length ?? 0} lifecycle events`,
    [['Asset', 'Date and time', 'Event', 'Status change', 'Performed by', 'Remarks']],
    (report.statusHistory ?? []).map(row => [
      `${value(row.assetCode)}\n${value(row.assetModel)}`,
      date(row.effectiveAt),
      statusLabel(row.eventType),
      `${statusLabel(row.fromStatus)} -> ${statusLabel(row.toStatus)}`,
      value(row.performedBy),
      value(row.remarks),
    ]),
    {
      0: { cellWidth: 115 },
      1: { cellWidth: 95 },
      2: { cellWidth: 88 },
      3: { cellWidth: 110 },
      4: { cellWidth: 100 },
    },
  )

  makeTablePage(
    'Audit Log',
    `${report.auditLog.length} recorded system activities`,
    [['Date and time', 'User', 'Action', 'Entity', 'Entity ID', 'IP address']],
    report.auditLog.map(row => [
      date(row.createdAt),
      value(row.user),
      statusLabel(row.action),
      statusLabel(row.entity),
      value(row.entityId),
      value(row.ipAddress),
    ]),
    {
      0: { cellWidth: 110 },
      1: { cellWidth: 120 },
      2: { cellWidth: 85 },
      3: { cellWidth: 95 },
      4: { cellWidth: 165 },
      5: { cellWidth: 95 },
    },
  )

  drawFooter(document, report.fileName)
  showPdfPreview(document, report.fileName, preview)
}

export async function downloadAssetHistoryPdf(report: AssetHistoryPdfExport) {
  const preview = createPreviewWindow()
  const currencyContext = await getCurrencyContext()
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const document = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  })

  const margin = 34
  const pageWidth = document.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2
  const assetCode = value(report.asset.assetCode)

  const safeAssetCode =
    assetCode
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'asset'

  drawHeader(
    document,
    'EFU IT Hardware Inventory',
    `Individual asset report  |  Generated ${date(new Date().toISOString())}`,
    'ASSET HISTORY',
  )

  document.setFont('helvetica', 'bold')
  document.setFontSize(21)
  document.setTextColor(...BRAND.text)
  document.text(value(report.asset.model), margin, 116)

  document.setFont('helvetica', 'normal')
  document.setFontSize(9)
  document.setTextColor(...BRAND.muted)
  document.text(`Asset ID: ${assetCode}`, margin, 135)

  const statusText = statusLabel(report.asset.status)
  const badgeWidth = Math.max(78, document.getTextWidth(statusText) + 24)
  document.setFillColor(...BRAND.blueSoft)
  document.roundedRect(pageWidth - margin - badgeWidth, 105, badgeWidth, 27, 7, 7, 'F')
  document.setFont('helvetica', 'bold')
  document.setFontSize(8)
  document.setTextColor(...BRAND.blueDark)
  document.text(statusText, pageWidth - margin - badgeWidth / 2, 122, { align: 'center' })

  drawSectionTitle(
    document,
    'Asset details',
    'Core identification, ownership and acquisition information.',
    163,
  )

  autoTable(document, {
    startY: 202,
    head: [['Asset ID', 'Model', 'Serial number', 'Type', 'Make', 'Vendor', 'Status', 'Purchase date', `Cost (${currencyContext.currency})`]],
    body: [[
      assetCode,
      value(report.asset.model),
      value(report.asset.serialNumber),
      value(report.asset.assetType),
      value(report.asset.assetMake),
      value(report.asset.vendor),
      statusText,
      date(report.asset.purchaseDate),
      money(report.asset.purchaseCost, currencyContext.currency, currencyContext.rate),
    ]],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.35,
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND.navy,
      textColor: BRAND.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: BRAND.surface,
    },
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 94 },
      2: { cellWidth: 92 },
      3: { cellWidth: 60 },
      4: { cellWidth: 76 },
      5: { cellWidth: 90 },
      6: { cellWidth: 64 },
      7: { cellWidth: 88 },
      8: { cellWidth: 80, halign: 'right' },
    },
  })

  const finalY =
    (
      document as unknown as {
        lastAutoTable?: { finalY?: number }
      }
    ).lastAutoTable?.finalY ?? 255

  drawSectionTitle(
    document,
    `Lifecycle history (${report.events.length} events)`,
    'Chronological allocation, return and status-change history for this asset.',
    finalY + 25,
  )

  autoTable(document, {
    startY: finalY + 64,
    head: [['Date and time', 'Event', 'Status change', 'Employee', 'Department', 'Location', 'Performed by', 'Remarks']],
    body: report.events.map(event => [
      date(event.effectiveAt),
      statusLabel(event.eventType),
      `${statusLabel(event.fromStatus)} -> ${statusLabel(event.toStatus)}`,
      `${value(event.employeeName)}${event.employeeCode ? ` (${event.employeeCode})` : ''}`,
      value(event.department),
      value(event.location),
      value(event.performedBy),
      value(event.remarks),
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: BRAND.text,
      lineColor: BRAND.border,
      lineWidth: 0.35,
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND.navy,
      textColor: BRAND.white,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: BRAND.surface,
    },
    margin: {
      left: margin,
      right: margin,
      bottom: 42,
    },
    columnStyles: {
      0: { cellWidth: 92 },
      1: { cellWidth: 76 },
      2: { cellWidth: 105 },
      3: { cellWidth: 112 },
      4: { cellWidth: 85 },
      5: { cellWidth: 88 },
      6: { cellWidth: 90 },
    },
  })

  document.setPage(1)
  document.setFillColor(...BRAND.surface)
  document.setDrawColor(...BRAND.border)
  document.roundedRect(margin, 319, contentWidth, 58, 8, 8, 'FD')

  document.setFont('helvetica', 'bold')
  document.setFontSize(9)
  document.setTextColor(...BRAND.blueDark)
  document.text('Asset report note', margin + 14, 341)

  document.setFont('helvetica', 'normal')
  document.setFontSize(8)
  document.setTextColor(...BRAND.muted)
  document.text(
    'This report is generated from the EFU IT Hardware Inventory Management System and reflects the recorded asset lifecycle at the time of export.',
    margin + 14,
    359,
  )

  drawFooter(document, `${assetCode} asset history`)
  showPdfPreview(document, `${safeAssetCode}-asset-history.pdf`, preview)
}
