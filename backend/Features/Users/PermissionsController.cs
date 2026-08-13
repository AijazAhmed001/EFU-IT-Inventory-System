using EFU.Inventory.Authorization;
using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

[ApiController, Route("api"), Authorize(Roles = Roles.SuperAdmin)]
[HasPermission(Permissions.UserPermissionsManage)]
public class PermissionsController(AppDbContext db, AuditService audit) : ControllerBase
{
    [HttpGet("permissions")]
    public IActionResult Catalog() => Ok(new { success = true, data = Permissions.Catalog });

    [HttpGet("users/{userId:guid}/permissions")]
    public async Task<IActionResult> Get(Guid userId, CancellationToken ct)
    {
        var target = await GetItAdmin(userId, ct);
        if (target.Result is not null) return target.Result;
        var codes = await CurrentCodes(userId, ct);
        // Keep the primary permission endpoint independent of the optional
        // history table so an existing database can still be administered
        // while the newest migration is being applied.
        var last = await db.UserPermissions.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.RevokedAt ?? x.GrantedAt)
            .Select(x => new
            {
                ChangedAt = x.RevokedAt ?? x.GrantedAt,
                ChangedByUserId = x.RevokedByUserId ?? x.GrantedByUserId
            })
            .FirstOrDefaultAsync(ct);
        string? changedBy = null;
        if (last is not null)
            changedBy = await db.Users.AsNoTracking()
                .Where(x => x.Id == last.ChangedByUserId)
                .Select(x => x.Name)
                .FirstOrDefaultAsync(ct);
        return Ok(new { success = true, data = new { userId, permissions = codes, lastPermissionUpdate = last?.ChangedAt, lastChangedBy = changedBy } });
    }

    [HttpPut("users/{userId:guid}/permissions")]
    public Task<IActionResult> Replace(Guid userId, PermissionUpdateRequest request, CancellationToken ct) =>
        Apply(userId, request.Permissions ?? [], ct);

    [HttpPatch("users/{userId:guid}/permissions/{permissionCode}")]
    public async Task<IActionResult> Patch(Guid userId, string permissionCode, PermissionPatchRequest request, CancellationToken ct)
    {
        var current = (await CurrentCodes(userId, ct)).ToHashSet(StringComparer.Ordinal);
        if (request.IsGranted) current.Add(permissionCode); else current.Remove(permissionCode);
        return await Apply(userId, current, ct);
    }

    [HttpGet("users/{userId:guid}/permission-history")]
    public async Task<IActionResult> History(Guid userId, CancellationToken ct)
    {
        var target = await GetItAdmin(userId, ct);
        if (target.Result is not null) return target.Result;
        var rows = await db.PermissionHistories.AsNoTracking().Where(x => x.UserId == userId)
            .OrderByDescending(x => x.ChangedAt).Take(250)
            .Select(x => new { x.Id, PermissionCode = x.Permission!.Code, x.PreviousValue, x.NewValue,
                Change = x.NewValue ? "GRANTED" : "REVOKED", ChangedBy = x.ChangedByUser!.Name,
                x.ChangedByUserId, x.ChangedAt, x.CorrelationId }).ToListAsync(ct);
        return Ok(new { success = true, data = rows });
    }

    private async Task<IActionResult> Apply(Guid userId, IEnumerable<string> values, CancellationToken ct)
    {
        var target = await GetItAdmin(userId, ct);
        if (target.Result is not null) return target.Result;
        var requestedValues = values.ToArray();
        if (requestedValues.Length != requestedValues.Distinct(StringComparer.Ordinal).Count())
            return BadRequest(new { success = false, message = "Duplicate permission codes are not allowed." });
        var requested = requestedValues.ToHashSet(StringComparer.Ordinal);
        var unknown = requested.Except(Permissions.AllSet, StringComparer.Ordinal).OrderBy(x => x).ToArray();
        if (unknown.Length > 0)
            return BadRequest(new { success = false, message = "Unknown permission code(s).", errors = unknown });
        var dependencyErrors = Permissions.Catalog.Where(x => requested.Contains(x.Code) && x.Requires is not null && !requested.Contains(x.Requires))
            .Select(x => $"{x.Code} requires {x.Requires}.")
            .Concat(Permissions.AdditionalDependencies.SelectMany(pair => requested.Contains(pair.Key)
                ? pair.Value.Where(required => !requested.Contains(required)).Select(required => $"{pair.Key} requires {required}.") : [])).ToArray();
        if (dependencyErrors.Length > 0)
            return BadRequest(new { success = false, message = "Permission dependencies are not satisfied.", errors = dependencyErrors });

        var actorId = User.UserId();
        var now = DateTime.UtcNow;
        var correlationId = HttpContext.TraceIdentifier;
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // EF Core SQL Server translates Contains over a concrete array/list to
        // IN/OPENJSON. IReadOnlySet.Contains is not translatable and caused
        // permission saves to fail at runtime.
        var catalogCodes = Permissions.All.ToArray();
        var permissionRows = await db.Permissions
            .Where(x => catalogCodes.Contains(x.Code))
            .ToDictionaryAsync(x => x.Code, ct);
        var missingCatalogRows = requested.Except(permissionRows.Keys, StringComparer.Ordinal).OrderBy(x => x).ToArray();
        if (missingCatalogRows.Length > 0)
        {
            await transaction.RollbackAsync(ct);
            return Conflict(new
            {
                success = false,
                message = "The permission catalog is not synchronized with the database. Restart the backend to seed the latest permissions.",
                errors = missingCatalogRows
            });
        }
        var existing = await db.UserPermissions.Where(x => x.UserId == userId).ToDictionaryAsync(x => x.Permission!.Code, ct);
        var current = existing.Where(x => x.Value.IsGranted && x.Value.RevokedAt == null).Select(x => x.Key).ToHashSet(StringComparer.Ordinal);
        var changed = current.SymmetricExceptWithCopy(requested);

        foreach (var code in changed)
        {
            var grant = requested.Contains(code);
            if (!existing.TryGetValue(code, out var row))
            {
                row = new UserPermission { UserId = userId, PermissionId = permissionRows[code].Id };
                db.UserPermissions.Add(row);
            }
            row.IsGranted = grant;
            if (grant) { row.GrantedByUserId = actorId; row.GrantedAt = now; row.RevokedByUserId = null; row.RevokedAt = null; }
            else { row.RevokedByUserId = actorId; row.RevokedAt = now; }
            db.PermissionHistories.Add(new PermissionHistory { UserId = userId, PermissionId = permissionRows[code].Id,
                PreviousValue = !grant, NewValue = grant, ChangedByUserId = actorId, ChangedAt = now, CorrelationId = correlationId });
        }
        await db.SaveChangesAsync(ct);
        await audit.Log(actorId, "PERMISSIONS_CHANGED", "user", userId, new { Added = changed.Where(requested.Contains), Removed = changed.Where(code => !requested.Contains(code)), CorrelationId = correlationId });
        await transaction.CommitAsync(ct);
        return Ok(new { success = true, data = new { userId, permissions = requested.OrderBy(x => x), changedAt = now, changedBy = User.Identity?.Name } });
    }

    private async Task<(User? User, IActionResult? Result)> GetItAdmin(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) return (null, NotFound(new { success = false, message = "User not found." }));
        if (user.Role != Roles.ItAdmin) return (null, BadRequest(new { success = false, message = "Permissions can only be configured for an IT Admin." }));
        return (user, null);
    }

    private Task<List<string>> CurrentCodes(Guid userId, CancellationToken ct) => db.UserPermissions.AsNoTracking()
        .Where(x => x.UserId == userId && x.IsGranted && x.RevokedAt == null).Select(x => x.Permission!.Code).OrderBy(x => x).ToListAsync(ct);
}

internal static class SetExtensions
{
    public static HashSet<T> SymmetricExceptWithCopy<T>(this HashSet<T> source, IEnumerable<T> other)
    { var result = new HashSet<T>(source, source.Comparer); result.SymmetricExceptWith(other); return result; }
}

public sealed record PermissionUpdateRequest(IReadOnlyCollection<string>? Permissions);
public sealed record PermissionPatchRequest(bool IsGranted);
