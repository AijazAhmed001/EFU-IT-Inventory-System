using System.Text.Json;
using EFU.Inventory.Data;
using EFU.Inventory.Models;

namespace EFU.Inventory.Services;

/// <summary>
/// Stores a record of important user actions in ActivityLogs.
/// </summary>
public class AuditService(
    AppDbContext db,
    IHttpContextAccessor? httpContextAccessor = null)
{
    public async Task Log(
        Guid? userId,
        string action,
        string entity,
        Guid? entityId = null,
        object? metadata = null)
    {
        var logEntry = new ActivityLog
        {
            UserId = userId,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Metadata = metadata is null ? null : JsonSerializer.Serialize(metadata),
            IpAddress = httpContextAccessor?.HttpContext?
                .Connection.RemoteIpAddress?.ToString()
        };

        db.ActivityLogs.Add(logEntry);
        await db.SaveChangesAsync();
    }
}
