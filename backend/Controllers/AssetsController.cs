using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize(Roles = Roles.SuperAdmin + "," + Roles.ItAdmin)]
public class AssetsController(
    AppDbContext db,
    AssetService assetService,
    BusinessRuleService businessRules,
    AuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] Guid? assetTypeId = null,
        [FromQuery] Guid? vendorId = null,
        [FromQuery] bool activeOnly = false,
        [FromQuery] string sort = "createdAt",
        [FromQuery] string order = "desc")
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);

        var query = db.Assets
            .Include(asset => asset.AssetType)
            .Include(asset => asset.AssetMake)
            .Include(asset => asset.Vendor)
            .Include(asset => asset.Location)
            .AsQueryable();

        if (activeOnly)
            query = query.Where(asset => asset.AssetType!.Status == RecordStatuses.Active && asset.Status != AssetStatuses.Retired);

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(asset =>
                asset.AssetCode.Contains(search) ||
                asset.SerialNumber.Contains(search) ||
                asset.Model.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(asset => asset.Status == status);
        }

        if (assetTypeId is not null)
        {
            query = query.Where(asset => asset.AssetTypeId == assetTypeId);
        }

        if (vendorId is not null)
        {
            query = query.Where(asset => asset.VendorId == vendorId);
        }

        query = ApplySorting(query, sort, order);

        var total = await query.CountAsync();
        var assets = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = assets,
            meta = new
            {
                page,
                limit,
                total,
                totalPages = (int)Math.Ceiling(total / (double)limit)
            }
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var asset = await db.Assets
            .Include(item => item.AssetType)
            .Include(item => item.AssetMake)
            .Include(item => item.Motherboard)
            .Include(item => item.Memory)
            .Include(item => item.Storage)
            .Include(item => item.OperatingSystem)
            .Include(item => item.Vendor)
            .Include(item => item.Location)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (asset is null)
        {
            return NotFound(new { success = false, message = "Asset not found" });
        }

        return Ok(new { success = true, data = asset });
    }

    [HttpPost]
    [Authorize(Roles = Roles.SuperAdmin + "," + Roles.ItAdmin)]
    public async Task<IActionResult> Create(CreateAssetRequest request)
    {
        businessRules.TrimStrings(request);
        await businessRules.ValidateAssetUniqueness(request);

        var asset = await assetService.Create(request);

        await auditService.Log(
            User.UserId(),
            "CREATE",
            "asset",
            asset.Id,
            asset);

        return CreatedAtAction(
            nameof(Get),
            new { id = asset.Id },
            new { success = true, data = asset });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = Roles.SuperAdmin + "," + Roles.ItAdmin)]
    public async Task<IActionResult> Update(Guid id, CreateAssetRequest request)
    {
        var asset = await db.Assets.FindAsync(id)
            ?? throw new KeyNotFoundException("Asset not found");

        businessRules.TrimStrings(request);
        await businessRules.ValidateAssetUniqueness(request, id);
        await assetService.ValidateLookups(request, asset);

        CopyRequestToAsset(request, asset);

        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "UPDATE", "asset", id, request);

        return Ok(new { success = true, data = asset });
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = Roles.SuperAdmin)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var asset = await db.Assets.FindAsync(id)
            ?? throw new KeyNotFoundException("Asset not found");

        asset.IsDeleted = true;
        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "DELETE", "asset", id);

        return NoContent();
    }

    private static IQueryable<Asset> ApplySorting(
        IQueryable<Asset> query,
        string sort,
        string order)
    {
        return (sort.ToLowerInvariant(), order.ToLowerInvariant()) switch
        {
            ("assetcode", "asc") => query.OrderBy(asset => asset.AssetCode),
            ("assetcode", _) => query.OrderByDescending(asset => asset.AssetCode),
            ("purchasedate", "asc") => query.OrderBy(asset => asset.PurchaseDate),
            ("purchasedate", _) => query.OrderByDescending(asset => asset.PurchaseDate),
            (_, "asc") => query.OrderBy(asset => asset.CreatedAt),
            _ => query.OrderByDescending(asset => asset.CreatedAt)
        };
    }

    private static void CopyRequestToAsset(
        CreateAssetRequest request,
        Asset asset)
    {
        asset.AssetTypeId = request.AssetTypeId;
        asset.AssetMakeId = request.AssetMakeId;
        asset.Model = request.Model;
        asset.MotherboardId = request.MotherboardId;
        asset.MemoryId = request.MemoryId;
        asset.StorageId = request.StorageId;
        asset.OperatingSystemId = request.OperatingSystemId;
        asset.Accessories = request.Accessories;
        asset.SerialNumber = request.SerialNumber;
        asset.VendorId = request.VendorId;
        asset.PurchaseDate = request.PurchaseDate;
        asset.PurchaseCost = request.PurchaseCost;
        asset.LocationId = request.LocationId;
        asset.AssetTag = request.AssetTag;
        asset.Condition = request.Condition;
        asset.AdditionalNotes = request.AdditionalNotes;
        asset.PurchaseOrderNumber = request.PurchaseOrderNumber;
        asset.InvoiceNumber = request.InvoiceNumber;
        asset.MacAddress = request.MacAddress;
        asset.IpAddress = request.IpAddress;
        asset.Hostname = request.Hostname;
        asset.Domain = request.Domain;
        asset.BiosVersion = request.BiosVersion;
        asset.GpuModel = request.GpuModel;
    }
}
