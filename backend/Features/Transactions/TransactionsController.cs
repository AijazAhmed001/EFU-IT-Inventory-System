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

[ApiController, Route("api/transactions"), Authorize]
public class TransactionsController(AppDbContext db, BusinessRuleService businessRules, AuditService audit) : ControllerBase
{
    [HttpPost("allocate")]
    [HasPermission(Permissions.AllocationsCreate)]
    public async Task<IActionResult> Allocate(AllocateRequest d)
    {
        businessRules.TrimStrings(d);
        await using var tx = await db.Database.BeginTransactionAsync();
        var a = await db.Assets.FindAsync(d.AssetId) ?? throw new KeyNotFoundException("Asset not found");
        if (a.Status != AssetStatuses.InStock)
            return Conflict(new { success = false, message = "Only assets in IT stock can be allocated" });
        await businessRules.EnsureEmployeeActive(d.EmployeeId);
        await businessRules.EnsureLocationActive(d.LocationId);

        var oldStatus = a.Status;
        var al = new Allocation { AssetId = d.AssetId, EmployeeId = d.EmployeeId, AllocationDate = d.AllocationDate, LocationId = d.LocationId, Remarks = d.Remarks };
        db.Allocations.Add(al);
        a.Status = AssetStatuses.Allocated;
        a.LocationId = d.LocationId ?? a.LocationId;
        db.AssetStatusHistories.Add(new AssetStatusHistory
        {
            AssetId = a.Id, FromStatus = oldStatus, ToStatus = AssetStatuses.Allocated,
            EventType = "ALLOCATED", PerformedByUserId = User.UserId(), Remarks = d.Remarks, EffectiveAt = d.AllocationDate
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await audit.Log(User.UserId(), "ALLOCATE", "asset", a.Id, d);
        return StatusCode(201, new { success = true, data = al });
    }

    [HttpPost("revoke")]
    [HasPermission(Permissions.AllocationsRevoke)]
    public async Task<IActionResult> Revoke(RevokeRequest d)
    {
        businessRules.TrimStrings(d);
        await using var tx = await db.Database.BeginTransactionAsync();
        var a = await db.Assets.FindAsync(d.AssetId) ?? throw new KeyNotFoundException("Asset not found");
        var active = await db.Allocations.Where(x => x.AssetId == d.AssetId && x.ReturnedAt == null).OrderByDescending(x => x.AllocationDate).FirstOrDefaultAsync();
        if (active == null) return Conflict(new { success = false, message = "Asset is not currently allocated" });

        var oldStatus = a.Status;
        active.ReturnedAt = d.RevocationDate;
        var rv = new Revocation { AssetId = d.AssetId, EmployeeId = active.EmployeeId, Reason = d.Reason, Condition = d.Condition, Remarks = d.Remarks, RevocationDate = d.RevocationDate };
        db.Revocations.Add(rv);
        a.Status = AssetStatuses.InStock;
        db.AssetStatusHistories.Add(new AssetStatusHistory
        {
            AssetId = a.Id, FromStatus = oldStatus, ToStatus = AssetStatuses.InStock,
            EventType = "REVOKED", PerformedByUserId = User.UserId(), Remarks = d.Remarks, EffectiveAt = d.RevocationDate
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await audit.Log(User.UserId(), "REVOKE", "asset", a.Id, d);
        return StatusCode(201, new { success = true, data = rv });
    }

    [HttpPost("retire")]
    [HasPermission(Permissions.AssetsRetire)]
    public async Task<IActionResult> Retire(RetireRequest d)
    {
        businessRules.TrimStrings(d);
        await using var tx = await db.Database.BeginTransactionAsync();
        var a = await db.Assets.FindAsync(d.AssetId) ?? throw new KeyNotFoundException("Asset not found");
        if (a.Status == AssetStatuses.Retired)
            return Conflict(new { success = false, message = "Asset is already retired" });

        var oldStatus = a.Status;
        var active = await db.Allocations.Where(x => x.AssetId == d.AssetId && x.ReturnedAt == null).ToListAsync();
        foreach (var x in active) x.ReturnedAt = d.ExpirationDate;
        var r = new Retirement { AssetId = d.AssetId, CurrentOwner = d.CurrentOwner, Reason = d.Reason, Condition = d.Condition, EndOfLifeAction = d.EndOfLifeAction, SalvageValue = d.SalvageValue, DisposalLocation = d.DisposalLocation, Remarks = d.Remarks, ExpirationDate = d.ExpirationDate };
        db.Retirements.Add(r);
        a.Status = AssetStatuses.Retired;
        db.AssetStatusHistories.Add(new AssetStatusHistory
        {
            AssetId = a.Id, FromStatus = oldStatus, ToStatus = AssetStatuses.Retired,
            EventType = "RETIRED", PerformedByUserId = User.UserId(), Remarks = d.Remarks, EffectiveAt = d.ExpirationDate
        });
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        await audit.Log(User.UserId(), "RETIRE", "asset", a.Id, d);
        return StatusCode(201, new { success = true, data = r });
    }
}
