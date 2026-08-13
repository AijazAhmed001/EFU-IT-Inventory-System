using EFU.Inventory.Authorization;
using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

/// <summary>
/// Read-only reference data required to perform an assigned task. These
/// endpoints do not grant access to Master Data pages or mutation endpoints.
/// </summary>
[ApiController, Route("api/task-lookups"), Authorize]
public sealed class TaskLookupsController(AppDbContext db) : ControllerBase
{
    [HttpGet("asset-create")]
    [HasPermission(Permissions.AssetsCreate)]
    public async Task<IActionResult> AssetCreate(CancellationToken ct) => Ok(new
    {
        success = true,
        data = new Dictionary<string, object>
        {
            ["asset-type"] = await Active(db.AssetTypes).Select(x => new { x.Id, x.Name, x.Prefix }).ToListAsync(ct),
            ["asset-make"] = await Active(db.AssetMakes).Select(x => new { x.Id, x.Name }).ToListAsync(ct),
            ["motherboard"] = await Active(db.Motherboards).Select(x => new { x.Id, x.Name, x.Generation }).ToListAsync(ct),
            ["memory"] = await Active(db.Memories).Select(x => new { x.Id, x.Size, x.Type }).ToListAsync(ct),
            ["storage"] = await Active(db.Storages).Select(x => new { x.Id, x.Type, x.Capacity }).ToListAsync(ct),
            ["operating-system"] = await Active(db.OperatingSystems).Select(x => new { x.Id, x.Name, x.Version }).ToListAsync(ct),
            ["vendor"] = await Active(db.Vendors).Select(x => new { x.Id, x.Name }).ToListAsync(ct),
            ["location"] = await Active(db.Locations).Select(x => new { x.Id, x.Name }).ToListAsync(ct)
        }
    });

    [HttpGet("allocate")]
    [HasPermission(Permissions.AllocationsCreate)]
    public Task<IActionResult> Allocate(CancellationToken ct) => TransactionOptions(AssetStatuses.InStock, true, ct);

    [HttpGet("revoke")]
    [HasPermission(Permissions.AllocationsRevoke)]
    public Task<IActionResult> Revoke(CancellationToken ct) => TransactionOptions(AssetStatuses.Allocated, true, ct);

    [HttpGet("retire")]
    [HasPermission(Permissions.AssetsRetire)]
    public Task<IActionResult> Retire(CancellationToken ct) => TransactionOptions(null, false, ct);

    private async Task<IActionResult> TransactionOptions(string? status, bool includePeople, CancellationToken ct)
    {
        var assets = db.Assets.AsNoTracking().Where(x => x.AssetType!.Status == RecordStatuses.Active && x.Status != AssetStatuses.Retired);
        if (status is not null) assets = assets.Where(x => x.Status == status);
        var assetRows = await assets.OrderBy(x => x.AssetCode).Select(x => new
        { x.Id, x.Model, x.AssetCode, x.SerialNumber, x.Status }).Take(100).ToListAsync(ct);
        var employees = includePeople
            ? await Active(db.Employees).OrderBy(x => x.Name).Select(x => new { x.Id, x.Name, x.EmployeeId }).Take(100).ToListAsync(ct)
            : [];
        var locations = includePeople
            ? await Active(db.Locations).OrderBy(x => x.Name).Select(x => new { x.Id, x.Name }).Take(100).ToListAsync(ct)
            : [];
        return Ok(new { success = true, data = new { assets = assetRows, employees, locations } });
    }

    private static IQueryable<T> Active<T>(IQueryable<T> query) where T : BaseEntity =>
        query.Where(row => EF.Property<string>(row, "Status") == RecordStatuses.Active).AsNoTracking();
}
