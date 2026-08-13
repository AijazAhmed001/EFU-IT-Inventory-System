using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Middleware;
using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace EFU.Inventory.Services;

public class AssetService(AppDbContext db)
{
    public async Task ValidateLookups(CreateAssetRequest d, Asset? existing = null, CancellationToken ct = default)
    {
        await EnsureActive(db.AssetTypes, d.AssetTypeId, existing?.AssetTypeId, "asset type", ct);
        await EnsureActive(db.AssetMakes, d.AssetMakeId, existing?.AssetMakeId, "asset make", ct);
        await EnsureActive(db.Motherboards, d.MotherboardId, existing?.MotherboardId, "motherboard", ct);
        await EnsureActive(db.Memories, d.MemoryId, existing?.MemoryId, "memory", ct);
        await EnsureActive(db.Storages, d.StorageId, existing?.StorageId, "storage", ct);
        await EnsureActive(db.OperatingSystems, d.OperatingSystemId, existing?.OperatingSystemId, "operating system", ct);
        await EnsureActive(db.Vendors, d.VendorId, existing?.VendorId, "vendor", ct);
        await EnsureActive(db.Locations, d.LocationId, existing?.LocationId, "location", ct);
    }

    private static async Task EnsureActive<T>(IQueryable<T> query, Guid? selectedId, Guid? existingId, string label, CancellationToken ct)
        where T : BaseEntity
    {
        if (selectedId is null || selectedId == existingId) return;
        var record = await query.Where(item => item.Id == selectedId).Select(item => new { Status = EF.Property<string>(item, "Status") }).SingleOrDefaultAsync(ct);
        if (record is null) throw new KeyNotFoundException($"The selected {label} does not exist.");
        if (!string.Equals(record.Status, RecordStatuses.Active, StringComparison.OrdinalIgnoreCase))
            throw new InactiveLookupException($"The selected {label} is inactive.");
    }

    public async Task<Asset> Create(CreateAssetRequest d)
    {
        await ValidateLookups(d);
        var type = await db.AssetTypes.FindAsync(d.AssetTypeId) ?? throw new KeyNotFoundException("Asset type not found");
        var policy = await db.LifecyclePolicies.FirstOrDefaultAsync(x => x.AssetTypeId == d.AssetTypeId && x.Status == "ACTIVE");
        var prefix = NormalizeAssetPrefix(type.Prefix);
        var count = await db.Assets.IgnoreQueryFilters().CountAsync(x => x.AssetTypeId == d.AssetTypeId) + 1;
        var code = BuildAssetCode(prefix, count);
        while (await db.Assets.IgnoreQueryFilters().AnyAsync(x => x.AssetCode == code))
        {
            count++;
            code = BuildAssetCode(prefix, count);
        }

        var a = new Asset
        {
            AssetCode = code,
            AssetTypeId = d.AssetTypeId,
            AssetMakeId = d.AssetMakeId,
            Model = d.Model.Trim(),
            MotherboardId = d.MotherboardId,
            MemoryId = d.MemoryId,
            StorageId = d.StorageId,
            OperatingSystemId = d.OperatingSystemId,
            Accessories = d.Accessories,
            SerialNumber = d.SerialNumber.Trim(),
            VendorId = d.VendorId,
            PurchaseDate = d.PurchaseDate,
            PurchaseCost = d.PurchaseCost,
            AddingDate = d.AddingDate ?? DateTime.UtcNow,
            LocationId = d.LocationId,
            AssetTag = d.AssetTag,
            Condition = d.Condition,
            AdditionalNotes = d.AdditionalNotes,
            PurchaseOrderNumber = d.PurchaseOrderNumber,
            InvoiceNumber = d.InvoiceNumber,
            MacAddress = d.MacAddress,
            IpAddress = d.IpAddress,
            Hostname = d.Hostname,
            Domain = d.Domain,
            BiosVersion = d.BiosVersion,
            GpuModel = d.GpuModel,
            Status = AssetStatuses.InStock
        };
        if (policy != null)
        {
            a.WarrantyExpiryDate = d.PurchaseDate.AddYears(policy.WarrantyPeriodYears);
            a.ExpectedExpiryDate = d.PurchaseDate.AddYears(policy.ExpectedLifespanYears);
        }

        db.Assets.Add(a);
        db.AssetStatusHistories.Add(new AssetStatusHistory
        {
            AssetId = a.Id,
            FromStatus = "NEW",
            ToStatus = AssetStatuses.InStock,
            EventType = "CREATED",
            EffectiveAt = a.AddingDate
        });
        await db.SaveChangesAsync();
        return a;
    }

    private static string NormalizeAssetPrefix(string value)
    {
        var prefix = value.Trim().ToUpperInvariant();
        if (prefix.StartsWith("EFU-", StringComparison.Ordinal)) prefix = prefix[4..];
        prefix = Regex.Replace(prefix, "[^A-Z0-9]", "");
        if (string.IsNullOrWhiteSpace(prefix)) throw new InvalidOperationException("The selected asset type has no valid prefix.");
        return prefix;
    }

    private static string BuildAssetCode(string prefix, int sequence) =>
        $"EFU-{prefix}-{sequence.ToString(sequence < 10000 ? "0000" : "0")}";

    public decimal CurrentBookValue(Asset a, LifecyclePolicy? p)
    {
        if (p is null) return a.PurchaseCost;
        var years = (decimal)Math.Max(0, (DateTime.UtcNow - a.PurchaseDate).TotalDays / 365.25);
        var salvage = a.PurchaseCost * p.SalvageValuePercent / 100m;
        if (p.ExpectedLifespanYears <= 0) return a.PurchaseCost;
        var annual = (a.PurchaseCost - salvage) / p.ExpectedLifespanYears;
        return Math.Max(salvage, a.PurchaseCost - annual * years);
    }
}
