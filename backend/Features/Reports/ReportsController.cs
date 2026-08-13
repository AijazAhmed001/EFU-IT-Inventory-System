using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EFU.Inventory.Authorization;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController(AppDbContext db) : ControllerBase
{
    public sealed record CompleteExportRequest(Guid? AssetId);

    [HttpPost("complete-export")]
    [HasPermission(Permissions.ReportsExportPdf)]
    public async Task<IActionResult> CompleteExport(
        [FromBody] CompleteExportRequest? request,
        CancellationToken cancellationToken)
    {
        var assetId = request?.AssetId;
        var inventoryQuery = db.Assets.AsNoTracking();
        var allocationQuery = db.Allocations.AsNoTracking();
        var statusHistoryQuery = db.AssetStatusHistories.AsNoTracking();
        var auditQuery = db.ActivityLogs.AsNoTracking();

        if (assetId.HasValue)
        {
            var assetExists = await inventoryQuery.AnyAsync(item => item.Id == assetId.Value, cancellationToken);
            if (!assetExists)
            {
                return NotFound(new { success = false, message = "Asset not found" });
            }

            var assetIdText = assetId.Value.ToString();
            inventoryQuery = inventoryQuery.Where(item => item.Id == assetId.Value);
            allocationQuery = allocationQuery.Where(item => item.AssetId == assetId.Value);
            statusHistoryQuery = statusHistoryQuery.Where(item => item.AssetId == assetId.Value);
            auditQuery = auditQuery.Where(item =>
                item.EntityId == assetId.Value ||
                (item.Metadata != null && item.Metadata.Contains(assetIdText)));
        }

        var inventory = await inventoryQuery
            .AsNoTracking()
            .OrderBy(item => item.AssetCode)
            .Select(item => new
            {
                item.AssetCode,
                item.Model,
                item.SerialNumber,
                AssetType = item.AssetType == null ? null : item.AssetType.Name,
                AssetMake = item.AssetMake == null ? null : item.AssetMake.Name,
                Vendor = item.Vendor == null ? null : item.Vendor.Name,
                Location = item.Location == null ? null : item.Location.Name,
                item.Status,
                item.PurchaseDate,
                item.PurchaseCost,
                item.WarrantyExpiryDate
            })
            .ToListAsync(cancellationToken);

        var assetHistory = await allocationQuery
            .OrderByDescending(item => item.AllocationDate)
            .Select(item => new
            {
                AssetCode = item.Asset == null ? null : item.Asset.AssetCode,
                AssetModel = item.Asset == null ? null : item.Asset.Model,
                Employee = item.Employee == null ? null : item.Employee.Name,
                EmployeeCode = item.Employee == null ? null : item.Employee.EmployeeId,
                Department = item.Employee == null || item.Employee.Department == null
                    ? null
                    : item.Employee.Department.Name,
                Location = item.Location == null ? null : item.Location.Name,
                item.AllocationDate,
                item.ReturnedAt,
                Status = item.ReturnedAt == null ? "ALLOCATED" : "RETURNED",
                item.Remarks
            })
            .ToListAsync(cancellationToken);

        var auditLog = await auditQuery
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new
            {
                item.CreatedAt,
                User = item.User == null ? "System" : item.User.Name,
                item.Action,
                item.Entity,
                item.EntityId,
                item.IpAddress
            })
            .ToListAsync(cancellationToken);

        var statusHistory = await statusHistoryQuery
            .OrderByDescending(item => item.EffectiveAt)
            .Select(item => new
            {
                AssetCode = item.Asset == null ? null : item.Asset.AssetCode,
                AssetModel = item.Asset == null ? null : item.Asset.Model,
                item.EventType,
                item.FromStatus,
                item.ToStatus,
                item.EffectiveAt,
                PerformedBy = item.PerformedByUser == null ? null : item.PerformedByUser.Name,
                item.Remarks
            })
            .ToListAsync(cancellationToken);

        await using var transaction = await db.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        const string sequenceKey = "REPORT_PDF_SEQUENCE";
        var sequenceSetting = await db.SystemSettings
            .SingleOrDefaultAsync(item => item.Key == sequenceKey, cancellationToken);
        var currentSequence = sequenceSetting is not null &&
            int.TryParse(sequenceSetting.Value, out var storedSequence)
                ? storedSequence
                : 0;
        var nextSequence = checked(currentSequence + 1);

        if (sequenceSetting is null)
        {
            sequenceSetting = new SystemSetting
            {
                Key = sequenceKey,
                Value = nextSequence.ToString(),
                Category = "REPORTING",
                UpdatedByUserId = User.UserId()
            };
            db.SystemSettings.Add(sequenceSetting);
        }
        else
        {
            sequenceSetting.Value = nextSequence.ToString();
            sequenceSetting.UpdatedAt = DateTime.UtcNow;
            sequenceSetting.UpdatedByUserId = User.UserId();
        }

        var fileName = assetId.HasValue
            ? $"EFU-ASSET-REPORT-{nextSequence:0000}.pdf"
            : $"EFU-REPORT-{nextSequence:0000}.pdf";
        db.ReportRuns.Add(new ReportRun
        {
            UserId = User.UserId(),
            ReportType = assetId.HasValue ? "ASSET_COMPLETE" : "COMPLETE",
            Format = "PDF",
            ResultCount = inventory.Count + assetHistory.Count + statusHistory.Count + auditLog.Count,
            Status = "COMPLETED",
            OutputPath = fileName,
            FiltersJson = assetId.HasValue ? $"{{\"assetId\":\"{assetId}\"}}" : null
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            data = new
            {
                fileName,
                generatedAt = DateTime.UtcNow,
                inventory,
                assetHistory,
                statusHistory,
                auditLog
            }
        });
    }

    [HttpGet("asset-history/{id:guid}")]
    [HasPermission(Permissions.ReportsAssetHistoryView)]
    public async Task<IActionResult> AssetHistory(Guid id)
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

        var allocations = await db.Allocations
            .AsNoTracking()
            .Where(item => item.AssetId == id)
            .OrderBy(item => item.AllocationDate)
            .Select(item => new
            {
                item.Id,
                item.AllocationDate,
                item.ReturnedAt,
                item.Remarks,
                EmployeeName = item.Employee == null ? null : item.Employee.Name,
                EmployeeCode = item.Employee == null ? null : item.Employee.EmployeeId,
                Department = item.Employee == null || item.Employee.Department == null ? null : item.Employee.Department.Name,
                Location = item.Location == null ? null : item.Location.Name
            })
            .ToListAsync();

        var revocations = await db.Revocations
            .Where(item => item.AssetId == id)
            .OrderBy(item => item.RevocationDate)
            .ToListAsync();

        var retirements = await db.Retirements
            .Where(item => item.AssetId == id)
            .OrderBy(item => item.ExpirationDate)
            .ToListAsync();

        var statusHistory = await db.AssetStatusHistories
            .AsNoTracking()
            .Where(item => item.AssetId == id)
            .OrderBy(item => item.EffectiveAt)
            .Select(item => new
            {
                item.Id,
                item.FromStatus,
                item.ToStatus,
                item.EventType,
                item.EffectiveAt,
                item.Remarks,
                PerformedBy = item.PerformedByUser == null ? null : item.PerformedByUser.Name
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                asset,
                allocations,
                revocations,
                retirements,
                statusHistory
            }
        });
    }

    [HttpGet("inventory")]
    [HasPermission(Permissions.ReportsInventoryView)]
    public async Task<IActionResult> Inventory()
    {
        var assets = await db.Assets
            .AsNoTracking()
            .Where(item => item.AssetType!.Status == RecordStatuses.Active && item.Status != AssetStatuses.Retired)
            .Include(item => item.AssetType)
            .Include(item => item.AssetMake)
            .Include(item => item.Vendor)
            .ToListAsync();

        return Ok(new { success = true, data = assets });
    }

    [HttpGet("audit")]
    [HasPermission(Permissions.ReportsAuditView)]
    public async Task<IActionResult> Audit(int page = 1, int limit = 50)
    {
        page = Math.Max(page, 1);
        limit = Math.Clamp(limit, 1, 100);

        var query = db.ActivityLogs
            .Include(item => item.User)
            .OrderByDescending(item => item.CreatedAt);

        var total = await query.CountAsync();
        var logs = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = logs,
            meta = new { page, limit, total }
        });
    }
}
