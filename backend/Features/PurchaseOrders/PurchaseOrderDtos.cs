using System.ComponentModel.DataAnnotations;

namespace EFU.Inventory.Features.PurchaseOrders;

public sealed record PurchaseOrderItemRequest(
    Guid? Id, string? ItemCode, [Required, MaxLength(200)] string ItemName, Guid? AssetTypeId,
    Guid? AssetMakeId, string? Model, string? QualityType, string? PrinterType, string? ProductName,
    string? Description, decimal UnitPrice, decimal Quantity, decimal TaxRate, string? DiscountType,
    decimal DiscountValue, Guid? BranchUnitId, Guid? IntendedUserId, string? Remarks);

public sealed record PurchaseOrderRequest(
    [Required, MaxLength(100)] string Commodity, DateTime PoDate, [MaxLength(100)] string? EfuReference,
    [Required, MaxLength(100)] string PoFor, [Required, StringLength(3, MinimumLength = 3)] string CurrencyCode,
    bool IsCommercial, Guid VendorId, [MaxLength(100)] string? QuotationId, DateTime? QuotationDate,
    string? TermsAndConditions, [MaxLength(100)] string? PaymentTerms, [MaxLength(100)] string? ShipmentTime,
    [MaxLength(100)] string? ShipmentTag, DateTime? ShipmentDate, [MaxLength(100)] string? ShipmentWithin,
    DateTime? ExpectedDeliveryDate, Guid? DeliveryLocationId, [MaxLength(500)] string? DeliveryAddress,
    [MaxLength(150)] string? ContactPerson, [MaxLength(50)] string? ContactNumber,
    [MaxLength(2000)] string? DeliveryInstructions, [MaxLength(4000)] string? InternalNotes,
    [MaxLength(4000)] string? VendorNotes, [MaxLength(2000)] string? Remarks, decimal OtherCharges,
    IReadOnlyList<PurchaseOrderItemRequest> Items, string? RowVersion);

public sealed record StatusActionRequest([MaxLength(2000)] string? Comment, string? RowVersion);
public sealed record ReceiptUnitRequest(string? SerialNumber, string? ManufacturerSerialNumber, DateTime? WarrantyStartDate, DateTime? WarrantyExpiryDate);
public sealed record ReceiptItemRequest(Guid PurchaseOrderItemId, decimal QuantityReceived, string Condition, string? Notes, IReadOnlyList<ReceiptUnitRequest> Units);
public sealed record GoodsReceiptRequest(string? ReceiptNumber, DateTime ReceivedDate, string? DeliveryChallanNumber, string? InvoiceNumber, Guid LocationId, string? Notes, IReadOnlyList<ReceiptItemRequest> Items);

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int Limit, int Total);
public sealed record PurchaseOrderListItem(Guid Id, string PoNumber, DateTime PoDate, int PoYear, string Vendor, string PoFor, string? BranchUnit, decimal GrandTotal, string CurrencyCode, string Status, bool IsLocked, string CreatedBy);

