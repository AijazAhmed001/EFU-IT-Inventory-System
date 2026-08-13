using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/allocations")]
[Authorize(Roles = Roles.SuperAdmin + "," + Roles.ItAdmin)]
public sealed class AllocationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] string sort = "allocationDate",
        [FromQuery] string order = "desc",
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        // The UI's "All records" option remains bounded to protect the API.
        limit = Math.Clamp(limit, 1, 1000);
        search = search?.Trim();

        // Allocation history must retain the names of soft-deleted historical
        // assets/employees, while still excluding deleted allocation rows.
        var query = db.Allocations
            .IgnoreQueryFilters()
            .Where(item => !item.IsDeleted)
            .AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(item =>
                item.Asset!.AssetCode.Contains(search) || item.Asset.SerialNumber.Contains(search) ||
                item.Asset.Model.Contains(search) || item.Employee!.Name.Contains(search) ||
                (item.Employee.Department != null && item.Employee.Department.Name.Contains(search)));
        if (string.Equals(status, "ALLOCATED", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => item.ReturnedAt == null);
        else if (string.Equals(status, "RETURNED", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => item.ReturnedAt != null);

        var ascending = string.Equals(order, "asc", StringComparison.OrdinalIgnoreCase);
        query = sort.ToLowerInvariant() switch
        {
            "asset" => ascending ? query.OrderBy(item => item.Asset!.AssetCode) : query.OrderByDescending(item => item.Asset!.AssetCode),
            "employee" => ascending ? query.OrderBy(item => item.Employee!.Name) : query.OrderByDescending(item => item.Employee!.Name),
            "returndate" => ascending ? query.OrderBy(item => item.ReturnedAt) : query.OrderByDescending(item => item.ReturnedAt),
            _ => ascending ? query.OrderBy(item => item.AllocationDate) : query.OrderByDescending(item => item.AllocationDate)
        };

        var total = await query.CountAsync(cancellationToken);
        var data = await query.Skip((page - 1) * limit).Take(limit).Select(item => new
        {
            item.Id, item.AssetId, item.EmployeeId, item.AllocationDate, item.ReturnedAt,
            AssetCode = item.Asset!.AssetCode,
            SerialNumber = item.Asset.SerialNumber,
            Model = item.Asset.Model,
            EmployeeName = item.Employee!.Name,
            Department = item.Employee.Department == null ? null : item.Employee.Department.Name,
            Status = item.ReturnedAt == null ? "ALLOCATED" : "RETURNED"
        }).ToListAsync(cancellationToken);

        return Ok(new { success = true, data, meta = new { page, limit, total, totalPages = (int)Math.Ceiling(total / (double)limit) } });
    }
}
