using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize(Roles = Roles.SuperAdmin + "," + Roles.ItAdmin)]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = User.UserId();

        var notifications = await db.Notifications
            .Where(notification =>
                notification.UserId == userId || notification.UserId == null)
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(new { success = true, data = notifications });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = User.UserId();

        var unreadNotifications = await db.Notifications
            .Where(notification =>
                (notification.UserId == userId || notification.UserId == null) &&
                notification.ReadAt == null)
            .ToListAsync();

        unreadNotifications.ForEach(notification =>
            notification.ReadAt = DateTime.UtcNow);

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkOneAsRead(Guid id)
    {
        var userId = User.UserId();

        var notification = await db.Notifications.FirstOrDefaultAsync(item =>
            item.Id == id &&
            (item.UserId == userId || item.UserId == null))
            ?? throw new KeyNotFoundException("Notification not found");

        notification.ReadAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new { success = true, data = notification });
    }
}
