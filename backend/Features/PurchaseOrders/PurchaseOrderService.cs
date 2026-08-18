using System.Text;
using EFU.Inventory.Data;
using EFU.Inventory.Middleware;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Features.PurchaseOrders;

public sealed class PurchaseOrderService(AppDbContext db, AuditService audit)
{
    public async Task<PurchaseOrder> Get(Guid id, bool tracking, CancellationToken ct)
    {
        var query = db.PurchaseOrders
            .Include(x => x.Vendor).Include(x => x.DeliveryLocation).Include(x => x.CreatedByUser)
            .Include(x => x.Items).ThenInclude(x => x.AssetMake)
            .Include(x => x.Items).ThenInclude(x => x.BranchUnit)
            .Include(x => x.StatusHistory).ThenInclude(x => x.PerformedByUser)
            .Include(x => x.Attachments).AsSplitQuery();
        if (!tracking) query = query.AsNoTracking();
        return await query.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException("Purchase order not found.");
    }

    public async Task<PurchaseOrder> Create(PurchaseOrderRequest request, Guid userId, CancellationToken ct)
    {
        Validate(request, requireItems: false);
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var po = new PurchaseOrder { PoNumber = await NextNumber(ct), CreatedByUserId = userId };
        await Apply(po, request, ct);
        db.PurchaseOrders.Add(po);
        AddHistory(po, null, PurchaseOrderStatuses.Draft, "CREATED", userId, null);
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, "PO_CREATED", "PurchaseOrder", po.Id, new { po.PoNumber, po.GrandTotal });
        await tx.CommitAsync(ct);
        return await Get(po.Id, false, ct);
    }

    public async Task<PurchaseOrder> Update(Guid id, PurchaseOrderRequest request, Guid userId, CancellationToken ct)
    {
        Validate(request, false);
        var po = await Get(id, true, ct);
        EnsureEditable(po);
        CheckVersion(po.RowVersion, request.RowVersion);
        await Apply(po, request, ct);
        AddHistory(po, po.Status, po.Status, "DRAFT_UPDATED", userId, null);
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, "PO_UPDATED", "PurchaseOrder", po.Id, new { po.PoNumber, po.GrandTotal });
        return await Get(id, false, ct);
    }

    public async Task<PurchaseOrder> Transition(Guid id, string action, StatusActionRequest request, Guid userId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var po = await Get(id, true, ct);
        CheckVersion(po.RowVersion, request.RowVersion);
        var from = po.Status;
        var to = action switch
        {
            "submit" when from == PurchaseOrderStatuses.Draft && po.Items.Count > 0 => PurchaseOrderStatuses.PendingApproval,
            "approve" when from == PurchaseOrderStatuses.PendingApproval && po.CreatedByUserId != userId => PurchaseOrderStatuses.Approved,
            "reject" when from == PurchaseOrderStatuses.PendingApproval && !string.IsNullOrWhiteSpace(request.Comment) => PurchaseOrderStatuses.Rejected,
            "reopen" when from == PurchaseOrderStatuses.Rejected => PurchaseOrderStatuses.Draft,
            "cancel" when from is not PurchaseOrderStatuses.Cancelled and not PurchaseOrderStatuses.Closed && !string.IsNullOrWhiteSpace(request.Comment) => PurchaseOrderStatuses.Cancelled,
            "close" when from == PurchaseOrderStatuses.FullyReceived => PurchaseOrderStatuses.Closed,
            _ => throw new ArgumentException("The requested purchase-order status transition is not allowed.")
        };
        po.Status = to; po.UpdatedAt = DateTime.UtcNow;
        if (to == PurchaseOrderStatuses.Approved) { po.ApprovedByUserId = userId; po.ApprovedAt = DateTime.UtcNow; }
        if (to == PurchaseOrderStatuses.Rejected) { po.RejectedByUserId = userId; po.RejectedAt = DateTime.UtcNow; po.RejectionReason = request.Comment; }
        if (to == PurchaseOrderStatuses.Cancelled) { po.CancelledByUserId = userId; po.CancelledAt = DateTime.UtcNow; po.CancellationReason = request.Comment; }
        if (to == PurchaseOrderStatuses.Closed) po.ClosedAt = DateTime.UtcNow;
        AddHistory(po, from, to, action.ToUpperInvariant(), userId, request.Comment);
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, $"PO_{action.ToUpperInvariant()}", "PurchaseOrder", po.Id, new { po.PoNumber, From = from, To = to });
        await tx.CommitAsync(ct);
        return await Get(id, false, ct);
    }

    public async Task<PurchaseOrder> SetLock(Guid id, bool locked, Guid userId, CancellationToken ct)
    {
        var po = await Get(id, true, ct);
        if (po.Status is PurchaseOrderStatuses.Cancelled or PurchaseOrderStatuses.Closed) throw new ArgumentException("Final purchase orders cannot be locked or unlocked.");
        po.IsLocked = locked; po.UpdatedAt = DateTime.UtcNow;
        AddHistory(po, po.Status, po.Status, locked ? "LOCKED" : "UNLOCKED", userId, null);
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, locked ? "PO_LOCKED" : "PO_UNLOCKED", "PurchaseOrder", id, new { po.PoNumber });
        return await Get(id, false, ct);
    }

    public async Task<GoodsReceipt> Receive(Guid id, GoodsReceiptRequest request, Guid userId, CancellationToken ct)
    {
        if (request.Items.Count == 0 || request.ReceivedDate == default) throw new ArgumentException("A receipt date and at least one receipt line are required.");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var po = await Get(id, true, ct);
        if (po.IsLocked || po.Status is not (PurchaseOrderStatuses.Approved or PurchaseOrderStatuses.PartiallyReceived)) throw new ArgumentException("Only unlocked approved or partially received purchase orders can be received.");
        var receipt = new GoodsReceipt { PurchaseOrderId = id, ReceiptNumber = string.IsNullOrWhiteSpace(request.ReceiptNumber) ? $"GR-{DateTime.UtcNow:yyyyMMddHHmmssfff}" : request.ReceiptNumber.Trim(), ReceivedDate = request.ReceivedDate.Date, DeliveryChallanNumber = request.DeliveryChallanNumber?.Trim(), InvoiceNumber = request.InvoiceNumber?.Trim(), ReceivedByUserId = userId, LocationId = request.LocationId, Notes = request.Notes?.Trim() };
        foreach (var line in request.Items)
        {
            var poItem = po.Items.SingleOrDefault(x => x.Id == line.PurchaseOrderItemId) ?? throw new ArgumentException("Receipt line does not belong to this purchase order.");
            if (line.QuantityReceived <= 0 || line.QuantityReceived > poItem.Quantity - poItem.ReceivedQuantity) throw new DuplicateRecordException("Received quantity exceeds the remaining ordered quantity.");
            if (line.Units.Count > 0 && line.Units.Count != decimal.ToInt32(line.QuantityReceived)) throw new ArgumentException("Serialized items require one serial record per received unit.");
            var ri = new GoodsReceiptItem { PurchaseOrderItemId = poItem.Id, QuantityReceived = line.QuantityReceived, Condition = line.Condition.Trim(), Notes = line.Notes?.Trim() };
            foreach (var unit in line.Units)
            {
                if (unit.WarrantyExpiryDate < unit.WarrantyStartDate) throw new ArgumentException("Warranty expiry cannot precede warranty start.");
                ri.Units.Add(new GoodsReceiptUnit { SerialNumber = unit.SerialNumber?.Trim(), ManufacturerSerialNumber = unit.ManufacturerSerialNumber?.Trim(), WarrantyStartDate = unit.WarrantyStartDate, WarrantyExpiryDate = unit.WarrantyExpiryDate });
            }
            receipt.Items.Add(ri); poItem.ReceivedQuantity += line.QuantityReceived;
        }
        db.GoodsReceipts.Add(receipt);
        var from = po.Status;
        po.Status = po.Items.All(x => x.ReceivedQuantity == x.Quantity) ? PurchaseOrderStatuses.FullyReceived : PurchaseOrderStatuses.PartiallyReceived;
        AddHistory(po, from, po.Status, "ITEMS_RECEIVED", userId, receipt.ReceiptNumber);
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, "PO_RECEIPT_CREATED", "PurchaseOrder", po.Id, new { po.PoNumber, receipt.ReceiptNumber });
        await tx.CommitAsync(ct);
        return receipt;
    }

    public async Task<IReadOnlyList<string>> CreateAssets(Guid receiptId, Guid userId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var receipt = await db.GoodsReceipts.Include(x => x.PurchaseOrder).ThenInclude(x => x!.Vendor).Include(x => x.Items).ThenInclude(x => x.PurchaseOrderItem).ThenInclude(x => x!.AssetType).Include(x => x.Items).ThenInclude(x => x.Units).FirstOrDefaultAsync(x => x.Id == receiptId, ct) ?? throw new KeyNotFoundException("Goods receipt not found.");
        var created = new List<string>();
        foreach (var ri in receipt.Items)
        foreach (var unit in ri.Units.Where(x => x.AssetId == null))
        {
            var item = ri.PurchaseOrderItem!;
            if (item.AssetTypeId is null || string.IsNullOrWhiteSpace(unit.SerialNumber)) throw new ArgumentException("Asset type and serial number are required to create serialized assets.");
            var prefix = new string(item.AssetType!.Prefix.ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
            var sequence = await db.Assets.IgnoreQueryFilters().CountAsync(x => x.AssetTypeId == item.AssetTypeId, ct) + 1;
            string code; do { code = $"EFU-{prefix}-{sequence:0000}"; sequence++; } while (await db.Assets.IgnoreQueryFilters().AnyAsync(x => x.AssetCode == code, ct));
            var asset = new Asset { AssetCode = code, SerialNumber = unit.SerialNumber, Model = item.Model ?? item.ItemName, PurchaseDate = receipt.PurchaseOrder!.PoDate, PurchaseCost = item.UnitPrice, AddingDate = receipt.ReceivedDate, WarrantyExpiryDate = unit.WarrantyExpiryDate, Status = AssetStatuses.InStock, AssetTypeId = item.AssetTypeId.Value, AssetMakeId = item.AssetMakeId, VendorId = receipt.PurchaseOrder.VendorId, LocationId = item.BranchUnitId ?? receipt.LocationId, PurchaseOrderNumber = receipt.PurchaseOrder.PoNumber, PurchaseOrderId = receipt.PurchaseOrderId, PurchaseOrderItemId = item.Id, GoodsReceiptId = receipt.Id, GoodsReceiptItemId = ri.Id, GoodsReceiptUnitId = unit.Id };
            db.Assets.Add(asset); unit.Asset = asset; created.Add(code);
        }
        await db.SaveChangesAsync(ct);
        await audit.Log(userId, "PO_ASSETS_CREATED", "GoodsReceipt", receipt.Id, new { Codes = created });
        await tx.CommitAsync(ct);
        return created;
    }

    private async Task Apply(PurchaseOrder po, PurchaseOrderRequest r, CancellationToken ct)
    {
        var vendor = await db.Vendors.FirstOrDefaultAsync(x => x.Id == r.VendorId && x.Status == RecordStatuses.Active, ct) ?? throw new ArgumentException("An active vendor is required.");
        po.Commodity = r.Commodity.Trim(); po.PoDate = r.PoDate.Date; po.PoYear = r.PoDate.Year; po.EfuReference = r.EfuReference?.Trim(); po.PoFor = r.PoFor.Trim(); po.CurrencyCode = r.CurrencyCode.Trim().ToUpperInvariant(); po.IsCommercial = r.IsCommercial; po.VendorId = vendor.Id; po.VendorEmailSnapshot = vendor.Email; po.QuotationId = r.QuotationId?.Trim(); po.QuotationDate = r.QuotationDate?.Date; po.TermsAndConditions = r.TermsAndConditions?.Trim(); po.PaymentTerms = r.PaymentTerms?.Trim(); po.ShipmentTime = r.ShipmentTime?.Trim(); po.ShipmentTag = r.ShipmentTag?.Trim(); po.ShipmentDate = r.ShipmentDate?.Date; po.ShipmentWithin = r.ShipmentWithin?.Trim(); po.ExpectedDeliveryDate = r.ExpectedDeliveryDate?.Date; po.DeliveryLocationId = r.DeliveryLocationId; po.DeliveryAddress = r.DeliveryAddress?.Trim(); po.ContactPerson = r.ContactPerson?.Trim(); po.ContactNumber = r.ContactNumber?.Trim(); po.DeliveryInstructions = r.DeliveryInstructions?.Trim(); po.InternalNotes = r.InternalNotes?.Trim(); po.VendorNotes = r.VendorNotes?.Trim(); po.Remarks = r.Remarks?.Trim(); po.OtherCharges = Round(r.OtherCharges); po.UpdatedAt = DateTime.UtcNow;
        db.PurchaseOrderItems.RemoveRange(po.Items); po.Items.Clear();
        var line = 1;
        foreach (var x in r.Items) { var baseAmount = Round(x.UnitPrice * x.Quantity); var discount = x.DiscountType?.Equals("PERCENT", StringComparison.OrdinalIgnoreCase) == true ? Round(baseAmount * x.DiscountValue / 100m) : Round(x.DiscountValue); if (discount > baseAmount) throw new ArgumentException("Line discount cannot exceed line base amount."); var taxable = baseAmount - discount; var tax = Round(taxable * x.TaxRate / 100m); po.Items.Add(new PurchaseOrderItem { LineNumber = line++, ItemCode = x.ItemCode?.Trim(), ItemName = x.ItemName.Trim(), AssetTypeId = x.AssetTypeId, AssetMakeId = x.AssetMakeId, Model = x.Model?.Trim(), QualityType = x.QualityType?.Trim(), PrinterType = x.PrinterType?.Trim(), ProductName = x.ProductName?.Trim(), Description = x.Description?.Trim(), UnitPrice = Round(x.UnitPrice), Quantity = Round(x.Quantity), TaxRate = Round(x.TaxRate), DiscountType = x.DiscountType?.ToUpperInvariant() == "PERCENT" ? "PERCENT" : "AMOUNT", DiscountValue = Round(x.DiscountValue), DiscountAmount = discount, TaxAmount = tax, LineTotal = taxable + tax, BranchUnitId = x.BranchUnitId, IntendedUserId = x.IntendedUserId, Remarks = x.Remarks?.Trim() }); }
        po.Subtotal = po.Items.Sum(x => Round(x.UnitPrice * x.Quantity)); po.DiscountTotal = po.Items.Sum(x => x.DiscountAmount); po.TaxTotal = po.Items.Sum(x => x.TaxAmount); po.GrandTotal = Round(po.Subtotal - po.DiscountTotal + po.TaxTotal + po.OtherCharges);
    }
    private static void Validate(PurchaseOrderRequest r, bool requireItems) { if (r.PoDate == default || r.PoDate.Year is < 2000 or > 2200) throw new ArgumentException("A valid PO date is required."); if (r.QuotationDate > r.PoDate) throw new ArgumentException("Quotation date cannot be later than PO date."); if (r.ExpectedDeliveryDate < r.PoDate) throw new ArgumentException("Expected delivery date cannot precede PO date."); if (r.OtherCharges < 0 || (requireItems && r.Items.Count == 0)) throw new ArgumentException("Invalid purchase-order values."); foreach (var x in r.Items) if (x.Quantity <= 0 || x.UnitPrice < 0 || x.TaxRate is < 0 or > 100 || x.DiscountValue < 0) throw new ArgumentException("Quantity, price, tax, or discount is invalid."); }
    private static void EnsureEditable(PurchaseOrder po) { if (po.IsLocked || po.Status is not (PurchaseOrderStatuses.Draft or PurchaseOrderStatuses.Rejected)) throw new ArgumentException("This purchase order cannot be edited in its current state."); }
    private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    private static void CheckVersion(byte[] current, string? supplied) { if (!string.IsNullOrWhiteSpace(supplied) && !current.SequenceEqual(Convert.FromBase64String(supplied))) throw new DuplicateRecordException("The purchase order changed since it was loaded. Refresh and try again."); }
    private static void AddHistory(PurchaseOrder po, string? from, string to, string action, Guid userId, string? comment) => po.StatusHistory.Add(new PurchaseOrderStatusHistory { FromStatus = from, ToStatus = to, Action = action, PerformedByUserId = userId, Comment = comment });
    private async Task<string> NextNumber(CancellationToken ct) => (await db.Database.SqlQueryRaw<long>("SELECT NEXT VALUE FOR dbo.PurchaseOrderNumberSequence AS [Value]").SingleAsync(ct)).ToString();
}
