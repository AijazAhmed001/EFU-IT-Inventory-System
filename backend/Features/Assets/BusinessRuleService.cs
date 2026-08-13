using System.Reflection;
using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Middleware;
using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Services;

public sealed class BusinessRuleService(AppDbContext db)
{
    public void TrimStrings(object value)
    {
        foreach (var property in value.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!property.CanRead || !property.CanWrite || property.PropertyType != typeof(string)) continue;
            if (property.GetValue(value) is string text) property.SetValue(value, text.Trim());
        }
    }

    public async Task ValidateAssetUniqueness(CreateAssetRequest request, Guid? excludingId = null, CancellationToken ct = default)
    {
        var serial = request.SerialNumber.Trim();
        if (await db.Assets.AnyAsync(asset => asset.Id != excludingId && asset.SerialNumber == serial, ct))
            throw new DuplicateRecordException("An asset with this serial number already exists.");

        var tag = request.AssetTag?.Trim();
        if (!string.IsNullOrWhiteSpace(tag) && await db.Assets.AnyAsync(asset => asset.Id != excludingId && asset.AssetTag == tag, ct))
            throw new DuplicateRecordException("An asset with this asset tag already exists.");
    }

    public async Task ValidateMasterUniqueness(BaseEntity entity, Guid? excludingId = null, CancellationToken ct = default)
    {
        if (entity is not Employee employee) return;
        var employeeCode = employee.EmployeeId.Trim();
        var email = employee.Email.Trim().ToLowerInvariant();
        if (await db.Employees.AnyAsync(item => item.Id != excludingId && item.EmployeeId == employeeCode, ct))
            throw new DuplicateRecordException("An employee with this employee code already exists.");
        if (await db.Employees.AnyAsync(item => item.Id != excludingId && item.Email == email, ct))
            throw new DuplicateRecordException("An employee with this email address already exists.");
        employee.EmployeeId = employeeCode;
        employee.Email = email;
    }

    public async Task EnsureEmployeeActive(Guid employeeId, CancellationToken ct = default)
    {
        var status = await db.Employees.Where(item => item.Id == employeeId).Select(item => item.Status).SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("Employee not found.");
        if (status != RecordStatuses.Active) throw new InactiveLookupException("The selected employee is inactive.");
    }

    public async Task EnsureLocationActive(Guid? locationId, CancellationToken ct = default)
    {
        if (locationId is null) return;
        var status = await db.Locations.Where(item => item.Id == locationId).Select(item => item.Status).SingleOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException("Location not found.");
        if (status != RecordStatuses.Active) throw new InactiveLookupException("The selected location is inactive.");
    }
}
