using System.Text;
using EFU.Inventory.Authorization;
using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Features.PurchaseOrders;

[ApiController, Route("api/purchase-orders")]
public sealed class PurchaseOrdersController(AppDbContext db, PurchaseOrderService service, IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet, Authorize(Policy = Permissions.PurchaseOrdersView)]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] Guid? vendorId, [FromQuery] Guid? locationId, [FromQuery] string? status, [FromQuery] int? year, [FromQuery] bool? locked, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string sort = "poDate", [FromQuery] string order = "desc", [FromQuery] int page = 1, [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        page = Math.Max(page, 1); limit = Math.Clamp(limit, 1, 100);
        var query = db.PurchaseOrders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.PoNumber.Contains(search) || x.Vendor!.Name.Contains(search) || (x.EfuReference != null && x.EfuReference.Contains(search)));
        if (vendorId.HasValue) query = query.Where(x => x.VendorId == vendorId); if (locationId.HasValue) query = query.Where(x => x.DeliveryLocationId == locationId); if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status); if (year.HasValue) query = query.Where(x => x.PoYear == year); if (locked.HasValue) query = query.Where(x => x.IsLocked == locked); if (from.HasValue) query = query.Where(x => x.PoDate >= from.Value.Date); if (to.HasValue) query = query.Where(x => x.PoDate <= to.Value.Date);
        var total = await query.CountAsync(ct);
        query = (sort.ToLowerInvariant(), order.ToLowerInvariant()) switch { ("ponumber", "asc") => query.OrderBy(x => x.PoNumber), ("ponumber", _) => query.OrderByDescending(x => x.PoNumber), ("total", "asc") => query.OrderBy(x => x.GrandTotal), ("total", _) => query.OrderByDescending(x => x.GrandTotal), ("status", "asc") => query.OrderBy(x => x.Status), ("status", _) => query.OrderByDescending(x => x.Status), (_, "asc") => query.OrderBy(x => x.PoDate), _ => query.OrderByDescending(x => x.PoDate) };
        var items = await query.Skip((page - 1) * limit).Take(limit).Select(x => new PurchaseOrderListItem(x.Id, x.PoNumber, x.PoDate, x.PoYear, x.Vendor!.Name, x.PoFor, x.DeliveryLocation != null ? x.DeliveryLocation.Name : null, x.GrandTotal, x.CurrencyCode, x.Status, x.IsLocked, x.CreatedByUser!.Name)).ToListAsync(ct);
        return Ok(new { success = true, data = items, meta = new { page, limit, total, totalPages = (int)Math.Ceiling(total / (double)limit) } });
    }

    [HttpGet("{id:guid}"), Authorize(Policy = Permissions.PurchaseOrdersView)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => Ok(new { success = true, data = Shape(await service.Get(id, false, ct)) });

    [HttpPost, Authorize(Policy = Permissions.PurchaseOrdersCreate)]
    public async Task<IActionResult> Create(PurchaseOrderRequest request, CancellationToken ct) { var po = await service.Create(request, User.UserId(), ct); return CreatedAtAction(nameof(Get), new { id = po.Id }, new { success = true, data = Shape(po) }); }

    [HttpPut("{id:guid}"), Authorize(Policy = Permissions.PurchaseOrdersEdit)]
    public async Task<IActionResult> Update(Guid id, PurchaseOrderRequest request, CancellationToken ct) => Ok(new { success = true, data = Shape(await service.Update(id, request, User.UserId(), ct)) });

    [HttpDelete("{id:guid}"), Authorize(Policy = Permissions.PurchaseOrdersDeleteDraft)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { var po = await service.Get(id, true, ct); if (po.Status != PurchaseOrderStatuses.Draft || po.CreatedByUserId != User.UserId()) return Conflict(new { success = false, message = "Only a draft may be deleted by its creator." }); po.IsDeleted = true; po.DeletedAt = DateTime.UtcNow; await db.SaveChangesAsync(ct); return NoContent(); }

    [HttpPost("{id:guid}/submit"), Authorize(Policy = Permissions.PurchaseOrdersSubmit)] public Task<IActionResult> Submit(Guid id, StatusActionRequest r, CancellationToken ct) => Transition(id, "submit", r, ct);
    [HttpPost("{id:guid}/approve"), Authorize(Policy = Permissions.PurchaseOrdersApprove)] public Task<IActionResult> Approve(Guid id, StatusActionRequest r, CancellationToken ct) => Transition(id, "approve", r, ct);
    [HttpPost("{id:guid}/reject"), Authorize(Policy = Permissions.PurchaseOrdersReject)] public Task<IActionResult> Reject(Guid id, StatusActionRequest r, CancellationToken ct) => Transition(id, "reject", r, ct);
    [HttpPost("{id:guid}/cancel"), Authorize(Policy = Permissions.PurchaseOrdersCancel)] public Task<IActionResult> Cancel(Guid id, StatusActionRequest r, CancellationToken ct) => Transition(id, "cancel", r, ct);
    [HttpPost("{id:guid}/close"), Authorize(Policy = Permissions.PurchaseOrdersClose)] public Task<IActionResult> Close(Guid id, StatusActionRequest r, CancellationToken ct) => Transition(id, "close", r, ct);
    [HttpPost("{id:guid}/lock"), Authorize(Policy = Permissions.PurchaseOrdersLock)] public async Task<IActionResult> Lock(Guid id, CancellationToken ct) => Ok(new { success = true, data = Shape(await service.SetLock(id, true, User.UserId(), ct)) });
    [HttpPost("{id:guid}/unlock"), Authorize(Policy = Permissions.PurchaseOrdersUnlock)] public async Task<IActionResult> Unlock(Guid id, CancellationToken ct) => Ok(new { success = true, data = Shape(await service.SetLock(id, false, User.UserId(), ct)) });

    [HttpPost("{id:guid}/duplicate"), Authorize(Policy = Permissions.PurchaseOrdersDuplicate)]
    public async Task<IActionResult> Duplicate(Guid id, CancellationToken ct) { var source = await service.Get(id, false, ct); var request = ToRequest(source) with { EfuReference = source.EfuReference is null ? null : $"COPY-{source.EfuReference}", RowVersion = null }; var copy = await service.Create(request, User.UserId(), ct); return CreatedAtAction(nameof(Get), new { id = copy.Id }, new { success = true, data = Shape(copy) }); }

    [HttpPost("{id:guid}/receipts"), Authorize(Policy = Permissions.PurchaseOrdersReceive)]
    public async Task<IActionResult> Receive(Guid id, GoodsReceiptRequest request, CancellationToken ct) { var receipt = await service.Receive(id, request, User.UserId(), ct); return Ok(new { success = true, data = new { receipt.Id, receipt.ReceiptNumber, receipt.ReceivedDate } }); }

    [HttpGet("{id:guid}/receipts"), Authorize(Policy = Permissions.PurchaseOrdersView)]
    public async Task<IActionResult> Receipts(Guid id, CancellationToken ct) { var items = await db.GoodsReceipts.AsNoTracking().Where(x => x.PurchaseOrderId == id).Include(x => x.Items).ThenInclude(x => x.Units).OrderByDescending(x => x.ReceivedDate).ToListAsync(ct); return Ok(new { success = true, data = items.Select(x => new { x.Id, x.ReceiptNumber, x.ReceivedDate, x.DeliveryChallanNumber, x.InvoiceNumber, x.LocationId, x.Notes, items = x.Items.Select(i => new { i.Id, i.PurchaseOrderItemId, i.QuantityReceived, i.Condition, units = i.Units.Select(u => new { u.Id, u.SerialNumber, u.ManufacturerSerialNumber, u.WarrantyStartDate, u.WarrantyExpiryDate, u.AssetId }) }) }) }); }

    [HttpPost("{id:guid}/attachments"), Authorize(Policy = Permissions.PurchaseOrdersAttachmentsManage), RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> Upload(Guid id, IFormFile file, [FromForm] string category = "SUPPORTING", CancellationToken ct = default)
    {
        _ = await service.Get(id, false, ct); var allowed = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase) { ["application/pdf"] = [".pdf"], ["image/jpeg"] = [".jpg", ".jpeg"], ["image/png"] = [".png"] }; var ext = Path.GetExtension(file.FileName);
        if (file.Length is <= 0 or > 10_485_760 || !allowed.TryGetValue(file.ContentType, out var extensions) || !extensions.Contains(ext, StringComparer.OrdinalIgnoreCase)) return BadRequest(new { success = false, message = "Only PDF, JPG, and PNG files up to 10 MB are allowed." });
        var key = $"{Guid.NewGuid():N}{ext.ToLowerInvariant()}"; var directory = Path.Combine(environment.ContentRootPath, "App_Data", "purchase-orders", id.ToString("N")); Directory.CreateDirectory(directory); await using (var stream = System.IO.File.Create(Path.Combine(directory, key))) await file.CopyToAsync(stream, ct);
        var attachment = new PurchaseOrderAttachment { PurchaseOrderId = id, Category = category.Trim().ToUpperInvariant(), OriginalFileName = Path.GetFileName(file.FileName), StorageKey = key, MimeType = file.ContentType, FileSize = file.Length, UploadedByUserId = User.UserId() }; db.PurchaseOrderAttachments.Add(attachment); await db.SaveChangesAsync(ct); return Ok(new { success = true, data = new { attachment.Id, attachment.OriginalFileName, attachment.Category, attachment.MimeType, attachment.FileSize, attachment.UploadedAt } });
    }

    [HttpGet("{id:guid}/attachments/{attachmentId:guid}"), Authorize(Policy = Permissions.PurchaseOrdersView)]
    public async Task<IActionResult> Download(Guid id, Guid attachmentId, CancellationToken ct) { var a = await db.PurchaseOrderAttachments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == attachmentId && x.PurchaseOrderId == id, ct) ?? throw new KeyNotFoundException("Attachment not found."); var path = Path.Combine(environment.ContentRootPath, "App_Data", "purchase-orders", id.ToString("N"), a.StorageKey); if (!System.IO.File.Exists(path)) throw new KeyNotFoundException("Attachment content not found."); return PhysicalFile(path, a.MimeType, a.OriginalFileName); }

    [HttpDelete("{id:guid}/attachments/{attachmentId:guid}"), Authorize(Policy = Permissions.PurchaseOrdersAttachmentsManage)]
    public async Task<IActionResult> DeleteAttachment(Guid id, Guid attachmentId, CancellationToken ct) { var a = await db.PurchaseOrderAttachments.FirstOrDefaultAsync(x => x.Id == attachmentId && x.PurchaseOrderId == id, ct) ?? throw new KeyNotFoundException("Attachment not found."); a.IsDeleted = true; a.DeletedAt = DateTime.UtcNow; await db.SaveChangesAsync(ct); return NoContent(); }

    [HttpGet("{id:guid}/pdf"), Authorize(Policy = Permissions.PurchaseOrdersPrint)]
    public async Task<IActionResult> Pdf(Guid id, CancellationToken ct) { var po = await service.Get(id, false, ct); var lines = new List<string> { "EFU GENERAL INSURANCE LTD", $"PURCHASE ORDER {po.PoNumber}", $"Date: {po.PoDate:yyyy-MM-dd}    Vendor: {po.Vendor?.Name}", $"Delivery: {po.DeliveryLocation?.Name} {po.DeliveryAddress}", "", "Line  Item                         Qty      Unit Price     Total" }; lines.AddRange(po.Items.OrderBy(x => x.LineNumber).Select(x => $"{x.LineNumber,4}  {x.ItemName,-28} {x.Quantity,8:N2} {x.UnitPrice,14:N2} {x.LineTotal,12:N2}")); lines.AddRange(["", $"Subtotal: {po.Subtotal:N2} {po.CurrencyCode}", $"Discount: {po.DiscountTotal:N2}", $"Tax: {po.TaxTotal:N2}", $"Other charges: {po.OtherCharges:N2}", $"GRAND TOTAL: {po.GrandTotal:N2} {po.CurrencyCode}", "", $"Terms: {po.TermsAndConditions}", $"Approved by: {po.ApprovedByUserId} at {po.ApprovedAt:u}", "Authorized signature: ____________________", $"Generated: {DateTimeOffset.UtcNow:u}   Page 1 of 1"]); return File(SimplePdf(lines), "application/pdf", $"PO-{po.PoNumber}.pdf"); }

    private async Task<IActionResult> Transition(Guid id, string action, StatusActionRequest request, CancellationToken ct) => Ok(new { success = true, data = Shape(await service.Transition(id, action, request, User.UserId(), ct)) });
    private static object Shape(PurchaseOrder x) => new { x.Id, x.PoNumber, x.Commodity, x.PoDate, x.PoYear, x.EfuReference, x.PoFor, x.CurrencyCode, x.IsCommercial, x.VendorId, vendor = x.Vendor is null ? null : new { x.Vendor.Id, x.Vendor.Name, x.Vendor.Email }, x.VendorEmailSnapshot, x.QuotationId, x.QuotationDate, x.TermsAndConditions, x.PaymentTerms, x.ShipmentTime, x.ShipmentTag, x.ShipmentDate, x.ShipmentWithin, x.ExpectedDeliveryDate, x.DeliveryLocationId, deliveryLocation = x.DeliveryLocation?.Name, x.DeliveryAddress, x.ContactPerson, x.ContactNumber, x.DeliveryInstructions, x.InternalNotes, x.VendorNotes, x.Remarks, x.Subtotal, x.DiscountTotal, x.TaxTotal, x.OtherCharges, x.GrandTotal, x.Status, x.IsLocked, x.Source, x.CreatedByUserId, createdBy = x.CreatedByUser?.Name, x.ApprovedByUserId, x.ApprovedAt, x.CreatedAt, x.UpdatedAt, rowVersion = Convert.ToBase64String(x.RowVersion), items = x.Items.OrderBy(i => i.LineNumber).Select(i => new { i.Id, i.LineNumber, i.ItemCode, i.ItemName, i.AssetTypeId, i.AssetMakeId, make = i.AssetMake?.Name, i.Model, i.QualityType, i.PrinterType, i.ProductName, i.Description, i.UnitPrice, i.Quantity, i.ReceivedQuantity, i.TaxRate, i.DiscountType, i.DiscountValue, i.DiscountAmount, i.TaxAmount, i.LineTotal, i.BranchUnitId, branchUnit = i.BranchUnit?.Name, i.IntendedUserId, i.Remarks }), attachments = x.Attachments.Select(a => new { a.Id, a.Category, a.OriginalFileName, a.MimeType, a.FileSize, a.UploadedAt }), activity = x.StatusHistory.OrderByDescending(h => h.PerformedAt).Select(h => new { h.Id, h.FromStatus, h.ToStatus, h.Action, h.Comment, h.PerformedAt, user = h.PerformedByUser!.Name }) };
    private static PurchaseOrderRequest ToRequest(PurchaseOrder x) => new(x.Commodity, DateTime.UtcNow.Date, x.EfuReference, x.PoFor, x.CurrencyCode, x.IsCommercial, x.VendorId, x.QuotationId, x.QuotationDate, x.TermsAndConditions, x.PaymentTerms, x.ShipmentTime, x.ShipmentTag, x.ShipmentDate, x.ShipmentWithin, x.ExpectedDeliveryDate, x.DeliveryLocationId, x.DeliveryAddress, x.ContactPerson, x.ContactNumber, x.DeliveryInstructions, x.InternalNotes, x.VendorNotes, x.Remarks, x.OtherCharges, x.Items.Select(i => new PurchaseOrderItemRequest(null, i.ItemCode, i.ItemName, i.AssetTypeId, i.AssetMakeId, i.Model, i.QualityType, i.PrinterType, i.ProductName, i.Description, i.UnitPrice, i.Quantity, i.TaxRate, i.DiscountType, i.DiscountValue, i.BranchUnitId, i.IntendedUserId, i.Remarks)).ToList(), null);
    private static byte[] SimplePdf(IEnumerable<string> lines) { static string Escape(string s) => s.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)"); var content = "BT /F1 9 Tf 45 790 Td 12 TL " + string.Join(" T* ", lines.Take(55).Select(x => $"({Escape(x)}) Tj")) + " ET"; var objects = new[] { "<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", $"<< /Length {Encoding.ASCII.GetByteCount(content)} >>\nstream\n{content}\nendstream", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" }; var sb = new StringBuilder("%PDF-1.4\n"); var offsets = new List<int> { 0 }; for (var i = 0; i < objects.Length; i++) { offsets.Add(Encoding.ASCII.GetByteCount(sb.ToString())); sb.Append($"{i + 1} 0 obj\n{objects[i]}\nendobj\n"); } var xref = Encoding.ASCII.GetByteCount(sb.ToString()); sb.Append($"xref\n0 {objects.Length + 1}\n0000000000 65535 f \n"); foreach (var o in offsets.Skip(1)) sb.Append($"{o:0000000000} 00000 n \n"); sb.Append($"trailer << /Size {objects.Length + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF"); return Encoding.ASCII.GetBytes(sb.ToString()); }
}

[ApiController, Route("api/goods-receipts")]
public sealed class GoodsReceiptsController(PurchaseOrderService service) : ControllerBase
{
    [HttpPost("{receiptId:guid}/create-assets"), Authorize(Policy = Permissions.PurchaseOrdersCreateAssets)]
    public async Task<IActionResult> CreateAssets(Guid receiptId, CancellationToken ct) => Ok(new { success = true, data = new { assetCodes = await service.CreateAssets(receiptId, User.UserId(), ct) } });
}
