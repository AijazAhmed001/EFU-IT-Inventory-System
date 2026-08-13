using System.Text.Json;
using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EFU.Inventory.Authorization;

namespace EFU.Inventory.Controllers;

/// <summary>
/// Handles all master/setup tables through one common endpoint.
/// Examples: asset-type, asset-make, vendor, department and location.
/// </summary>
[ApiController]
[Route("api/master")]
[Authorize]
public class MasterController(
    AppDbContext db,
    BusinessRuleService businessRules,
    AuditService auditService) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [HttpGet("{type}")]
    [HasPermission(Permissions.MasterViewPolicy)]
    public async Task<IActionResult> List(
        string type,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? search = null,
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = GetQuery(type).AsNoTracking();
        if (activeOnly)
            query = query.Where(row => EF.Property<string>(row, "Status") == RecordStatuses.Active);

        var rows = await query
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(search))
        {
            rows = rows
                .Where(row => MatchesSearch(row, search))
                .ToList();
        }

        var total = rows.Count;
        var data = rows
            .Skip((page - 1) * limit)
            .Take(limit)
            .Select(row => (object)row)
            .ToList();

        return Ok(new
        {
            success = true,
            data,
            meta = new { page, limit, total }
        });
    }

    [HttpPost("{type}")]
    [HasPermission(Permissions.MasterManagePolicy)]
    public async Task<IActionResult> Create(
        string type,
        [FromBody] JsonElement body)
    {
        var entity = DeserializeEntity(type, body);
        businessRules.TrimStrings(entity);
        await businessRules.ValidateMasterUniqueness(entity);

        db.Add(entity);
        await db.SaveChangesAsync();

        await auditService.Log(
            User.UserId(),
            "CREATE",
            type,
            entity.Id,
            entity);

        return StatusCode(
            StatusCodes.Status201Created,
            new { success = true, data = (object)entity });
    }

    [HttpPut("{type}/{id:guid}")]
    [HasPermission(Permissions.MasterManagePolicy)]
    public async Task<IActionResult> Update(
        string type,
        Guid id,
        [FromBody] JsonElement body)
    {
        var existingEntity = await GetQuery(type)
            .FirstOrDefaultAsync(entity => entity.Id == id)
            ?? throw new KeyNotFoundException("Record not found");

        var incomingEntity = DeserializeEntity(type, body);
        businessRules.TrimStrings(incomingEntity);
        await businessRules.ValidateMasterUniqueness(incomingEntity, id);
        var previousStatus = existingEntity.GetType().GetProperty("Status")?.GetValue(existingEntity)?.ToString();
        CopyEditableProperties(type, incomingEntity, existingEntity);

        await db.SaveChangesAsync();
        var nextStatus = existingEntity.GetType().GetProperty("Status")?.GetValue(existingEntity)?.ToString();
        var action = previousStatus != nextStatus
            ? nextStatus == RecordStatuses.Active ? "ACTIVATE" : "DEACTIVATE"
            : "UPDATE";
        await auditService.Log(User.UserId(), action, type, id, body);

        return Ok(new
        {
            success = true,
            data = (object)existingEntity
        });
    }

    [HttpDelete("{type}/{id:guid}")]
    [HasPermission(Permissions.MasterManagePolicy)]
    public async Task<IActionResult> Delete(string type, Guid id)
    {
        var entity = await GetQuery(type)
            .FirstOrDefaultAsync(item => item.Id == id)
            ?? throw new KeyNotFoundException("Record not found");

        // Soft delete: the database record is kept, but hidden from normal use.
        entity.IsDeleted = true;

        await db.SaveChangesAsync();
        await auditService.Log(User.UserId(), "DELETE", type, id);

        return NoContent();
    }

    private IQueryable<BaseEntity> GetQuery(string type)
    {
        return type switch
        {
            "asset-type" => db.AssetTypes,
            "asset-make" => db.AssetMakes,
            "motherboard" => db.Motherboards,
            "memory" => db.Memories,
            "storage" => db.Storages,
            "operating-system" => db.OperatingSystems,
            "vendor" => db.Vendors,
            "province" => db.Provinces,
            "city" => db.Cities,
            "location" => db.Locations,
            "department" => db.Departments,
            "office" => db.Offices,
            "employee" => db.Employees,
            "lifecycle-policy" => db.LifecyclePolicies,
            _ => throw new KeyNotFoundException("Unknown setup type")
        };
    }

    private static Type GetEntityType(string type)
    {
        return type switch
        {
            "asset-type" => typeof(AssetType),
            "asset-make" => typeof(AssetMake),
            "motherboard" => typeof(Motherboard),
            "memory" => typeof(Memory),
            "storage" => typeof(Storage),
            "operating-system" => typeof(Models.OperatingSystem),
            "vendor" => typeof(Vendor),
            "province" => typeof(Province),
            "city" => typeof(City),
            "location" => typeof(Location),
            "department" => typeof(Department),
            "office" => typeof(Office),
            "employee" => typeof(Employee),
            "lifecycle-policy" => typeof(LifecyclePolicy),
            _ => throw new KeyNotFoundException("Unknown setup type")
        };
    }

    private static BaseEntity DeserializeEntity(
        string type,
        JsonElement body)
    {
        var entityType = GetEntityType(type);

        var entity = (BaseEntity?)JsonSerializer.Deserialize(
            body.GetRawText(),
            entityType,
            JsonOptions)
            ?? throw new ArgumentException("Invalid request body");

        ValidateStringLengths(entity);
        return entity;
    }

    private static void ValidateStringLengths(BaseEntity entity)
    {
        foreach (var property in entity.GetType().GetProperties().Where(item => item.PropertyType == typeof(string)))
        {
            if (property.GetValue(entity) is not string value) continue;
            var maximum = StringLengthFor(property.Name);
            if (value.Length > maximum)
                throw new ArgumentException($"{property.Name} cannot exceed {maximum} characters.");
        }
    }

    private static int StringLengthFor(string propertyName)
    {
        if (propertyName.Contains("Email", StringComparison.OrdinalIgnoreCase)) return 254;
        if (propertyName.Contains("Phone", StringComparison.OrdinalIgnoreCase)) return 30;
        if (propertyName is "Description" or "Address") return 2000;
        if (propertyName is "Prefix" or "EmployeeId" or "Ntn" or "Generation" or "Capacity" or "Version") return 100;
        return 200;
    }

    private static void CopyEditableProperties(
        string type,
        BaseEntity source,
        BaseEntity destination)
    {
        var protectedProperties = new HashSet<string>
        {
            "Id",
            "CreatedAt",
            "UpdatedAt",
            "IsDeleted"
        };

        var properties = GetEntityType(type)
            .GetProperties()
            .Where(property =>
                property.CanRead &&
                property.CanWrite &&
                !protectedProperties.Contains(property.Name));

        foreach (var property in properties)
        {
            var value = property.GetValue(source);

            if (value is not null)
            {
                property.SetValue(destination, value);
            }
        }
    }

    private static bool MatchesSearch(BaseEntity entity, string search)
    {
        var json = JsonSerializer.Serialize(entity, entity.GetType());
        return json.Contains(search, StringComparison.OrdinalIgnoreCase);
    }
}
