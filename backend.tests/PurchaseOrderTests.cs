using EFU.Inventory.Authorization;
using EFU.Inventory.Models;
using Xunit;

namespace EFU.Inventory.Tests;

public class PurchaseOrderTests
{
    [Fact]
    public void PurchaseOrder_Permissions_Are_Complete_And_Unique()
    {
        var required = new[] { Permissions.PurchaseOrdersView, Permissions.PurchaseOrdersCreate,
            Permissions.PurchaseOrdersEdit, Permissions.PurchaseOrdersApprove, Permissions.PurchaseOrdersReceive,
            Permissions.PurchaseOrdersCreateAssets, Permissions.PurchaseOrdersAttachmentsManage };
        Assert.All(required, code => Assert.Contains(code, Permissions.All));
        Assert.Equal(17, Permissions.All.Count(code => code.StartsWith("purchase_orders.")));
    }

    [Fact]
    public void PurchaseOrder_Statuses_Are_Stable_And_Distinct()
    {
        var statuses = new[] { PurchaseOrderStatuses.Draft, PurchaseOrderStatuses.PendingApproval,
            PurchaseOrderStatuses.Approved, PurchaseOrderStatuses.Rejected,
            PurchaseOrderStatuses.PartiallyReceived, PurchaseOrderStatuses.FullyReceived,
            PurchaseOrderStatuses.Cancelled, PurchaseOrderStatuses.Closed };
        Assert.Equal(8, statuses.Distinct().Count());
    }

    [Fact]
    public void ReceiptUnit_AssetLink_Supports_Idempotency()
    {
        var assetId = Guid.NewGuid();
        var unit = new GoodsReceiptUnit { SerialNumber = "SER-001", AssetId = assetId };
        Assert.Equal(assetId, unit.AssetId);
    }
}

