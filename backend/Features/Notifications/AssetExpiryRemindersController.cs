using System.ComponentModel.DataAnnotations;
using EFU.Inventory.Authorization;
using EFU.Inventory.Data;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Controllers;

[ApiController, Route("api/asset-expiry-reminders"), Authorize]
public sealed class AssetExpiryRemindersController(AppDbContext db, IAssetExpiryReminderService reminders, IEmailService email, AssetExpiryReminderSettingsStore settingsStore, AuditService audit) : ControllerBase
{
    [HttpGet("settings"), HasPermission(Permissions.NotificationsView)]
    public async Task<IActionResult> Settings(CancellationToken ct) => Ok(new { success = true, data = await settingsStore.GetAsync(ct) });

    [HttpPut("settings"), HasPermission(Permissions.NotificationsManage), EnableRateLimiting("email-actions")]
    public async Task<IActionResult> UpdateSettings([FromBody] AssetExpiryReminderOptions input, CancellationToken ct)
    {
        var validation = new List<ValidationResult>(); if (!Validator.TryValidateObject(input, new ValidationContext(input), validation, true)) return BadRequest(new { success = false, message = "Validation failed.", errors = validation.ToDictionary(x => x.MemberNames.FirstOrDefault() ?? "settings", x => new[] { x.ErrorMessage ?? "Invalid value" }) });
        var values = System.Text.Json.JsonSerializer.Serialize(input); var row = await db.SystemSettings.FindAsync(["assetExpiryReminders"], ct);
        if (row is null) db.SystemSettings.Add(new SystemSetting { Key = "assetExpiryReminders", Category = "NOTIFICATIONS", Value = values, UpdatedByUserId = User.UserId() }); else { row.Value = values; row.UpdatedAt = DateTime.UtcNow; row.UpdatedByUserId = User.UserId(); }
        await db.SaveChangesAsync(ct); await audit.Log(User.UserId(), "ASSET_EXPIRY_REMINDER_SETTINGS_UPDATED", "SystemSetting", null, new { input.Enabled, input.ReminderWindowDays, input.ExecutionTime, input.TimeZone, CorrelationId = HttpContext.TraceIdentifier });
        return Ok(new { success = true, data = input, message = "Settings saved." });
    }

    [HttpGet("history"), HasPermission(Permissions.NotificationsView)]
    public async Task<IActionResult> History(int page = 1, int limit = 25, string? status = null, string? search = null, string? expiryType = null, DateTime? from = null, DateTime? to = null, Guid? assetId = null, CancellationToken ct = default)
    {
        page = Math.Max(1, page); limit = Math.Clamp(limit, 1, 100); var q = db.AssetExpiryReminderLogs.AsNoTracking().Include(x => x.Asset).AsQueryable();
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status.ToUpper()); if (!string.IsNullOrWhiteSpace(expiryType)) q = q.Where(x => x.ExpiryType == expiryType); if (assetId.HasValue) q = q.Where(x => x.AssetId == assetId);
        if (from.HasValue) q = q.Where(x => x.ReminderDate >= from.Value.Date); if (to.HasValue) q = q.Where(x => x.ReminderDate < to.Value.Date.AddDays(1));
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(x => x.RecipientName.Contains(search) || x.RecipientEmail.Contains(search) || x.Asset!.AssetCode.Contains(search) || x.Asset.Model.Contains(search));
        var total = await q.CountAsync(ct); var data = await q.OrderByDescending(x => x.CreatedAt).Skip((page - 1) * limit).Take(limit).Select(x => new { x.Id, x.AssetId, AssetCode = x.Asset!.AssetCode, AssetName = x.Asset.Model, x.RecipientName, x.RecipientEmail, x.ExpiryType, x.ExpiryDate, x.DaysRemaining, x.Status, x.AttemptCount, x.SentAtUtc, x.ErrorMessage, x.CorrelationId, x.CreatedAt }).ToListAsync(ct);
        return Ok(new { success = true, data, meta = new { page, limit, total, totalPages = (int)Math.Ceiling(total / (double)limit) } });
    }

    [HttpGet("history/{id:guid}"), HasPermission(Permissions.NotificationsView)] public async Task<IActionResult> Details(Guid id, CancellationToken ct) => Ok(new { success = true, data = await db.AssetExpiryReminderLogs.AsNoTracking().Include(x => x.Asset).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new KeyNotFoundException("Reminder not found.") });
    [HttpPost("run"), HasPermission(Permissions.NotificationsManage), EnableRateLimiting("email-actions")]
    public async Task<IActionResult> Run(CancellationToken ct)
    {
        if (!email.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Email delivery is not configured. Set SMTP host and sender address before running the scan." });
        await audit.Log(User.UserId(), "ASSET_EXPIRY_SCAN_TRIGGERED", "AssetExpiryReminder", metadata: new { CorrelationId = HttpContext.TraceIdentifier });
        return Ok(new { success = true, data = await reminders.RunAsync(ct) });
    }
    [HttpPost("history/{id:guid}/retry"), HasPermission(Permissions.NotificationsManage), EnableRateLimiting("email-actions")] public async Task<IActionResult> Retry(Guid id, CancellationToken ct) { var sent = await reminders.RetryAsync(id, ct); await audit.Log(User.UserId(), "ASSET_EXPIRY_REMINDER_RETRIED", "AssetExpiryReminder", id, new { sent, CorrelationId = HttpContext.TraceIdentifier }); return Ok(new { success = true, data = new { sent } }); }

    public sealed record TestRequest([EmailAddress, Required] string Email);
    [HttpPost("test-email"), HasPermission(Permissions.NotificationsManage), EnableRateLimiting("email-actions")]
    public async Task<IActionResult> Test(TestRequest request, CancellationToken ct)
    {
        if (!email.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Email delivery is not configured. Set SMTP host and sender address before sending a test email." });
        var p = reminders.Render("Test Employee", "Test Laptop", "TEST-0001", "TEST-SERIAL", "Laptop", "Warranty", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(15)), 15, "IT", "Head Office");
        await email.SendAsync(new(request.Email, "[TEST] " + p.Subject, p.HtmlBody, p.TextBody), ct);
        await audit.Log(User.UserId(), "ASSET_EXPIRY_TEST_EMAIL_SENT", "AssetExpiryReminder", metadata: new { Domain = new System.Net.Mail.MailAddress(request.Email).Host, CorrelationId = HttpContext.TraceIdentifier });
        return Ok(new { success = true, message = "Test email sent." });
    }
    [HttpGet("preview"), HasPermission(Permissions.NotificationsManage)] public IActionResult Preview() => Ok(new { success = true, data = reminders.Render("Example Employee", "Dell Latitude", "LAP-0001", "EXAMPLE", "Laptop", "Warranty", DateOnly.FromDateTime(DateTime.UtcNow.AddDays(15)), 15, "IT", "Head Office") });
    [HttpGet("summary"), HasPermission(Permissions.NotificationsView)]
    public async Task<IActionResult> Summary(CancellationToken ct)
    {
        var setting = await settingsStore.GetAsync(ct);
        var zone = AssetExpiryReminderService.ResolveTimeZone(setting.TimeZone);
        var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone);
        var today = DateOnly.FromDateTime(localNow.DateTime);
        var todayStartUtc = TimeZoneInfo.ConvertTimeToUtc(today.ToDateTime(TimeOnly.MinValue), zone);
        var tomorrowStartUtc = TimeZoneInfo.ConvertTimeToUtc(today.AddDays(1).ToDateTime(TimeOnly.MinValue), zone);
        var q = db.AssetExpiryReminderLogs.AsNoTracking().Where(x => x.CreatedAt >= todayStartUtc && x.CreatedAt < tomorrowStartUtc);
        var scanEnd = today.AddDays(setting.ReminderWindowDays + 1).ToDateTime(TimeOnly.MinValue);
        var scanStart = today.ToDateTime(TimeOnly.MinValue);
        var expiring = await db.Assets.AsNoTracking().CountAsync(a =>
            a.Status == AssetStatuses.Allocated && a.AssetType!.Status == RecordStatuses.Active &&
            ((a.WarrantyExpiryDate >= scanStart && a.WarrantyExpiryDate < scanEnd) ||
             (a.ExpectedExpiryDate >= scanStart && a.ExpectedExpiryDate < scanEnd)), ct);
        if (!TimeOnly.TryParse(setting.ExecutionTime, out var executionTime)) executionTime = new TimeOnly(9, 0);
        var nextLocal = today.ToDateTime(executionTime);
        if (nextLocal <= localNow.DateTime) nextLocal = nextLocal.AddDays(1);
        return Ok(new { success = true, data = new {
            sentToday = await q.CountAsync(x => x.Status == AssetExpiryReminderStatuses.Sent, ct),
            failedToday = await q.CountAsync(x => x.Status == AssetExpiryReminderStatuses.Failed, ct),
            skippedToday = await q.CountAsync(x => x.Status == AssetExpiryReminderStatuses.Skipped, ct),
            missingRecipientEmailCount = await q.CountAsync(x => x.Status == AssetExpiryReminderStatuses.Skipped && x.ErrorMessage != null && x.ErrorMessage.Contains("email"), ct),
            assetsExpiringCount = expiring,
            nextScheduledRun = new DateTimeOffset(nextLocal, zone.GetUtcOffset(nextLocal)),
            smtpConfigured = email.IsConfigured,
            automationReady = setting.Enabled && email.IsConfigured
        }});
    }
}
