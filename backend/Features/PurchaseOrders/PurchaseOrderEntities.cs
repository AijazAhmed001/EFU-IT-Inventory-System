namespace EFU.Inventory.Models;

public static class PurchaseOrderStatuses
{
    public const string Draft = "DRAFT";
    public const string PendingApproval = "PENDING_APPROVAL";
    public const string Approved = "APPROVED";
    public const string Rejected = "REJECTED";
    public const string PartiallyReceived = "PARTIALLY_RECEIVED";
    public const string FullyReceived = "FULLY_RECEIVED";
    public const string Cancelled = "CANCELLED";
    public const string Closed = "CLOSED";
}

public class PurchaseOrder : BaseEntity
{
    public string PoNumber { get; set; } = "";
    public string Commodity { get; set; } = "Supplies";
    public DateTime PoDate { get; set; }
    public int PoYear { get; set; }
    public string? EfuReference { get; set; }
    public string PoFor { get; set; } = "";
    public string CurrencyCode { get; set; } = "PKR";
    public bool IsCommercial { get; set; }
    public Guid VendorId { get; set; }
    public string? VendorEmailSnapshot { get; set; }
    public string? QuotationId { get; set; }
    public DateTime? QuotationDate { get; set; }
    public string? TermsAndConditions { get; set; }
    public string? PaymentTerms { get; set; }
    public string? ShipmentTime { get; set; }
    public string? ShipmentTag { get; set; }
    public DateTime? ShipmentDate { get; set; }
    public string? ShipmentWithin { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public Guid? DeliveryLocationId { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? ContactPerson { get; set; }
    public string? ContactNumber { get; set; }
    public string? DeliveryInstructions { get; set; }
    public string? InternalNotes { get; set; }
    public string? VendorNotes { get; set; }
    public string? Remarks { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountTotal { get; set; }
    public decimal TaxTotal { get; set; }
    public decimal OtherCharges { get; set; }
    public decimal GrandTotal { get; set; }
    public string Status { get; set; } = PurchaseOrderStatuses.Draft;
    public bool IsLocked { get; set; }
    public string Source { get; set; } = "LOCAL";
    public string? ExternalReference { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public string? LastSyncResult { get; set; }
    public Guid CreatedByUserId { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? RejectedByUserId { get; set; }
    public DateTime? RejectedAt { get; set; }
    public string? RejectionReason { get; set; }
    public Guid? CancelledByUserId { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? ClosedAt { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public Vendor? Vendor { get; set; }
    public Location? DeliveryLocation { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    public ICollection<PurchaseOrderAttachment> Attachments { get; set; } = new List<PurchaseOrderAttachment>();
    public ICollection<PurchaseOrderStatusHistory> StatusHistory { get; set; } = new List<PurchaseOrderStatusHistory>();
    public ICollection<GoodsReceipt> Receipts { get; set; } = new List<GoodsReceipt>();
}

public class PurchaseOrderItem : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public int LineNumber { get; set; }
    public string? ItemCode { get; set; }
    public string ItemName { get; set; } = "";
    public Guid? AssetTypeId { get; set; }
    public Guid? AssetMakeId { get; set; }
    public string? Model { get; set; }
    public string? QualityType { get; set; }
    public string? PrinterType { get; set; }
    public string? ProductName { get; set; }
    public string? Description { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Quantity { get; set; }
    public decimal ReceivedQuantity { get; set; }
    public decimal TaxRate { get; set; }
    public string DiscountType { get; set; } = "AMOUNT";
    public decimal DiscountValue { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal LineTotal { get; set; }
    public Guid? BranchUnitId { get; set; }
    public Guid? IntendedUserId { get; set; }
    public string? Remarks { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public PurchaseOrder? PurchaseOrder { get; set; }
    public AssetType? AssetType { get; set; }
    public AssetMake? AssetMake { get; set; }
    public Location? BranchUnit { get; set; }
    public User? IntendedUser { get; set; }
}

public class PurchaseOrderAttachment : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public string Category { get; set; } = "SUPPORTING";
    public string OriginalFileName { get; set; } = "";
    public string StorageKey { get; set; } = "";
    public string MimeType { get; set; } = "application/octet-stream";
    public long FileSize { get; set; }
    public Guid UploadedByUserId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public PurchaseOrder? PurchaseOrder { get; set; }
}

public class PurchaseOrderStatusHistory : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = "";
    public string Action { get; set; } = "";
    public string? Comment { get; set; }
    public Guid PerformedByUserId { get; set; }
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
    public PurchaseOrder? PurchaseOrder { get; set; }
    public User? PerformedByUser { get; set; }
}

public class GoodsReceipt : BaseEntity
{
    public string ReceiptNumber { get; set; } = "";
    public Guid PurchaseOrderId { get; set; }
    public DateTime ReceivedDate { get; set; }
    public string? DeliveryChallanNumber { get; set; }
    public string? InvoiceNumber { get; set; }
    public Guid ReceivedByUserId { get; set; }
    public Guid LocationId { get; set; }
    public string? Notes { get; set; }
    public string? AttachmentStorageKey { get; set; }
    public byte[] RowVersion { get; set; } = [];
    public PurchaseOrder? PurchaseOrder { get; set; }
    public ICollection<GoodsReceiptItem> Items { get; set; } = new List<GoodsReceiptItem>();
}

public class GoodsReceiptItem : BaseEntity
{
    public Guid GoodsReceiptId { get; set; }
    public Guid PurchaseOrderItemId { get; set; }
    public decimal QuantityReceived { get; set; }
    public string Condition { get; set; } = "GOOD";
    public string? Notes { get; set; }
    public GoodsReceipt? GoodsReceipt { get; set; }
    public PurchaseOrderItem? PurchaseOrderItem { get; set; }
    public ICollection<GoodsReceiptUnit> Units { get; set; } = new List<GoodsReceiptUnit>();
}

public class GoodsReceiptUnit : BaseEntity
{
    public Guid GoodsReceiptItemId { get; set; }
    public string? SerialNumber { get; set; }
    public string? ManufacturerSerialNumber { get; set; }
    public DateTime? WarrantyStartDate { get; set; }
    public DateTime? WarrantyExpiryDate { get; set; }
    public Guid? AssetId { get; set; }
    public GoodsReceiptItem? GoodsReceiptItem { get; set; }
    public Asset? Asset { get; set; }
}

public interface IOraclePurchaseOrderGateway
{
    Task SyncAsync(Guid purchaseOrderId, CancellationToken cancellationToken);
}

public sealed class DisabledOraclePurchaseOrderGateway : IOraclePurchaseOrderGateway
{
    public Task SyncAsync(Guid purchaseOrderId, CancellationToken cancellationToken) =>
        throw new InvalidOperationException("Oracle purchase-order synchronization is not configured.");
}
