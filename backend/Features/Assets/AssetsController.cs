using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EFU.Inventory.Authorization;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize]
public class AssetsController(
    AppDbContext db,
    AssetService assetService,
    BusinessRuleService businessRules,
    AuditService auditService,
    IWebHostEnvironment environment) : ControllerBase
{
    [HttpGet]
    [HasPermission(Permissions.AssetsView)]
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
    [HasPermission(Permissions.AssetsView)]
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
    [HasPermission(Permissions.AssetsCreate)]
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
    [HasPermission(Permissions.AssetsUpdate)]
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
    [HasPermission(Permissions.AssetsDelete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var asset = await db.Assets.FindAsync(id)
            ?? throw new KeyNotFoundException("Asset not found");

        asset.IsDeleted = true;
        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "DELETE", "asset", id);

        return NoContent();
    }

    [HttpPost("{id:guid}/attachments")]
    [HasPermission(Permissions.AttachmentsUpload)]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> UploadAttachments(Guid id, [FromForm] List<IFormFile> files)
    {
        if (!await db.Assets.AnyAsync(asset => asset.Id == id))
            return NotFound(new { success = false, message = "Asset not found" });
        if (files.Count == 0)
            return BadRequest(new { success = false, message = "Select at least one file." });

        var allowed = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = ["application/pdf"], [".jpg"] = ["image/jpeg"],
            [".jpeg"] = ["image/jpeg"], [".png"] = ["image/png"]
        };
        const long maximumSize = 10 * 1024 * 1024;
        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName);
            if (file.Length <= 0 || file.Length > maximumSize || !allowed.TryGetValue(extension, out var types) || !types.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
                return BadRequest(new { success = false, message = $"{Path.GetFileName(file.FileName)} must be a PDF, JPG, or PNG file no larger than 10 MB." });
        }

        var relativeDirectory = Path.Combine("App_Data", "uploads", "assets", id.ToString("N"));
        var absoluteDirectory = Path.Combine(environment.ContentRootPath, relativeDirectory);
        Directory.CreateDirectory(absoluteDirectory);
        var storedFiles = new List<StoredFile>();
        foreach (var file in files)
        {
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid():N}{extension}";
            var relativePath = Path.Combine(relativeDirectory, storedName).Replace('\\', '/');
            await using (var stream = System.IO.File.Create(Path.Combine(absoluteDirectory, storedName)))
                await file.CopyToAsync(stream);
            storedFiles.Add(new StoredFile
            {
                UploadedByUserId = User.UserId(), OriginalFileName = Path.GetFileName(file.FileName),
                StoredFileName = storedName, ContentType = file.ContentType, SizeBytes = file.Length,
                StoragePath = relativePath, EntityType = "asset", EntityId = id
            });
        }

        db.StoredFiles.AddRange(storedFiles);
        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "UPLOAD", "asset", id, new { Count = storedFiles.Count });
        return Ok(new { success = true, data = storedFiles.Select(file => new { file.Id, file.OriginalFileName, file.ContentType, file.SizeBytes }) });
    }

    [HttpGet("{id:guid}/attachments")]
    [HasPermission(Permissions.AttachmentsDownload)]
    public async Task<IActionResult> ListAttachments(Guid id) => Ok(new { success = true, data = await db.StoredFiles.AsNoTracking()
        .Where(file => file.EntityType == "asset" && file.EntityId == id)
        .Select(file => new { file.Id, file.OriginalFileName, file.ContentType, file.SizeBytes, file.CreatedAt }).ToListAsync() });

    [HttpGet("{id:guid}/attachments/{fileId:guid}")]
    [HasPermission(Permissions.AttachmentsDownload)]
    public async Task<IActionResult> DownloadAttachment(Guid id, Guid fileId)
    {
        var file = await db.StoredFiles.AsNoTracking().FirstOrDefaultAsync(item => item.Id == fileId && item.EntityType == "asset" && item.EntityId == id)
            ?? throw new KeyNotFoundException("Attachment not found");
        var root = Path.GetFullPath(environment.ContentRootPath);
        var path = Path.GetFullPath(Path.Combine(root, file.StoragePath));
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(path))
            throw new KeyNotFoundException("Attachment file not found");
        return PhysicalFile(path, file.ContentType, file.OriginalFileName);
    }

    [HttpDelete("{id:guid}/attachments/{fileId:guid}")]
    [HasPermission(Permissions.AttachmentsDelete)]
    public async Task<IActionResult> DeleteAttachment(Guid id, Guid fileId)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(item => item.Id == fileId && item.EntityType == "asset" && item.EntityId == id)
            ?? throw new KeyNotFoundException("Attachment not found");
        file.IsDeleted = true;
        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "DELETE_ATTACHMENT", "asset", id, new { FileId = fileId, file.OriginalFileName });
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
