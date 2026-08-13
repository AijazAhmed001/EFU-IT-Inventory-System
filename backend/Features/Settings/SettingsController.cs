using System.Text.Json;
using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EFU.Inventory.Authorization;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/settings")]
[Authorize]
public class SettingsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    [HasPermission(Permissions.SettingsView)]
    public async Task<IActionResult> Get()
    {
        var settings = await db.SystemSettings.ToListAsync();

        var data = settings.ToDictionary(
            setting => setting.Key,
            setting => (object?)JsonSerializer.Deserialize<object>(setting.Value));

        return Ok(new { success = true, data });
    }

    [HttpPut]
    [HasPermission(Permissions.SettingsUpdate)]
    public async Task<IActionResult> Put(
        [FromBody] Dictionary<string, JsonElement> body)
    {
        foreach (var item in body)
        {
            if (item.Key.Length > 150)
                return BadRequest(new { success = false, message = "Setting keys cannot exceed 150 characters." });
            if (item.Value.GetRawText().Length > 4000)
                return BadRequest(new { success = false, message = $"The value for {item.Key} cannot exceed 4000 characters." });

            var setting = await db.SystemSettings.FindAsync(item.Key);

            if (setting is null)
            {
                db.SystemSettings.Add(new SystemSetting
                {
                    Key = item.Key,
                    Value = item.Value.GetRawText()
                });
            }
            else
            {
                setting.Value = item.Value.GetRawText();
                setting.UpdatedAt = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = body });
    }
}
