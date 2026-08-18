using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EFU.Inventory.Services;

public sealed class AssetExpiryReminderOptions
{
    public bool Enabled { get; set; } = true;
    public string ExecutionTime { get; set; } = "09:00";
    public string TimeZone { get; set; } = "Asia/Karachi";
    [Range(1, 365)] public int ReminderWindowDays { get; set; } = 15;
    public bool SendEveryDay { get; set; } = true;
    public bool SendOnExpiryDate { get; set; } = true;
    public bool SendAfterExpiry { get; set; }
    [Range(0, 365)] public int PostExpiryDays { get; set; }
    [EmailAddress] public string? CcItSupport { get; set; }
    [EmailAddress] public string? Bcc { get; set; }
    [Range(1, 10)] public int MaximumRetryCount { get; set; } = 3;
    public string SenderName { get; set; } = "EFU IT Department";
    public string SubjectPrefix { get; set; } = "[EFU IT Inventory]";
    public bool NotifyAdminOnMissingEmail { get; set; }
    [Range(1, 1000)] public int BatchSize { get; set; } = 100;
}

public sealed record ReminderRunResult(int Sent, int Failed, int Skipped, int Duplicates, long DurationMilliseconds);
public sealed record ReminderPreview(string Subject, string HtmlBody, string TextBody);
public sealed class AssetExpiryReminderSettingsStore(AppDbContext db, IOptionsMonitor<AssetExpiryReminderOptions> configured)
{
    public async Task<AssetExpiryReminderOptions> GetAsync(CancellationToken ct = default)
    {
        var json = await db.SystemSettings.AsNoTracking().Where(x => x.Key == "assetExpiryReminders").Select(x => x.Value).FirstOrDefaultAsync(ct);
        if (string.IsNullOrWhiteSpace(json)) return configured.CurrentValue;
        try { return JsonSerializer.Deserialize<AssetExpiryReminderOptions>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? configured.CurrentValue; }
        catch (JsonException) { return configured.CurrentValue; }
    }
}
public interface IAssetExpiryReminderService
{
    Task<ReminderRunResult> RunAsync(CancellationToken cancellationToken = default);
    Task<bool> RetryAsync(Guid id, CancellationToken cancellationToken = default);
    ReminderPreview Render(string employee, string assetName, string assetCode, string serial, string category, string expiryType, DateOnly expiryDate, int days, string department, string location);
}

public sealed class AssetExpiryReminderService(AppDbContext db, IEmailService email, IOptionsMonitor<AssetExpiryReminderOptions> options, AssetExpiryReminderSettingsStore settingsStore, ILogger<AssetExpiryReminderService> logger) : IAssetExpiryReminderService
{
    public async Task<ReminderRunResult> RunAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew(); var sent = 0; var failed = 0; var skipped = 0; var duplicates = 0;
        var setting = await settingsStore.GetAsync(ct);
        if (!setting.Enabled) return new(0, 0, 0, 0, 0);
        var zone = ResolveTimeZone(setting.TimeZone);
        var localToday = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone).DateTime);
        var min = localToday.AddDays(setting.SendAfterExpiry ? -setting.PostExpiryDays : 0);
        var max = localToday.AddDays(setting.ReminderWindowDays);
        logger.LogInformation("Asset expiry scan started for {BusinessDate} ({TimeZone})", localToday, zone.Id);

        var candidates = await db.Assets.AsNoTracking()
            .Where(a => a.Status == AssetStatuses.Allocated && a.AssetType!.Status == RecordStatuses.Active &&
                ((a.WarrantyExpiryDate != null && a.WarrantyExpiryDate >= min.ToDateTime(TimeOnly.MinValue) && a.WarrantyExpiryDate < max.AddDays(1).ToDateTime(TimeOnly.MinValue)) ||
                 (a.ExpectedExpiryDate != null && a.ExpectedExpiryDate >= min.ToDateTime(TimeOnly.MinValue) && a.ExpectedExpiryDate < max.AddDays(1).ToDateTime(TimeOnly.MinValue))))
            .Select(a => new { a.Id, a.AssetCode, a.Model, a.SerialNumber, Category = a.AssetType!.Name, Location = a.Location != null ? a.Location.Name : "", a.WarrantyExpiryDate, a.ExpectedExpiryDate })
            .Take(setting.BatchSize).ToListAsync(ct);

        foreach (var asset in candidates)
        {
            foreach (var expiry in new[] { (Type: "Warranty", Date: asset.WarrantyExpiryDate), (Type: "Expected lifecycle", Date: asset.ExpectedExpiryDate) }.Where(x => x.Date != null))
            {
                ct.ThrowIfCancellationRequested();
                var expiryDate = DateOnly.FromDateTime(expiry.Date!.Value); var days = CalculateDaysRemaining(localToday, expiryDate);
                if (!ShouldSend(days, setting)) continue;
                var allocation = await db.Allocations.AsNoTracking().Where(a => a.AssetId == asset.Id && a.ReturnedAt == null && a.Employee!.Status == RecordStatuses.Active)
                    .OrderByDescending(a => a.AllocationDate).Select(a => new { a.Id, a.EmployeeId, Name = a.Employee!.Name, a.Employee.Email, Department = a.Employee.Department != null ? a.Employee.Department.Name : "", Location = a.Location != null ? a.Location.Name : asset.Location }).FirstOrDefaultAsync(ct);
                var recipientKey = allocation?.EmployeeId.ToString("N") ?? "unassigned";
                var preview = Render(allocation?.Name ?? "Unknown employee", asset.Model, asset.AssetCode, asset.SerialNumber, asset.Category, expiry.Type, expiryDate, days, allocation?.Department ?? "", allocation?.Location ?? asset.Location);
                var log = new AssetExpiryReminderLog { AssetId = asset.Id, AllocationId = allocation?.Id, EmployeeId = allocation?.EmployeeId, RecipientName = allocation?.Name ?? "", RecipientEmail = allocation?.Email?.Trim().ToLowerInvariant() ?? "", RecipientKey = recipientKey, ExpiryType = expiry.Type, ExpiryDate = expiryDate.ToDateTime(TimeOnly.MinValue), ReminderDate = localToday.ToDateTime(TimeOnly.MinValue), DaysRemaining = days, Subject = preview.Subject, CorrelationId = Guid.NewGuid().ToString("N") };
                if (allocation is null || !IsValidEmail(allocation.Email)) { log.Status = AssetExpiryReminderStatuses.Skipped; log.ErrorMessage = allocation is null ? "No current active allocation." : "Recipient email is missing or invalid."; skipped++; }
                try { db.AssetExpiryReminderLogs.Add(log); await db.SaveChangesAsync(ct); }
                catch (DbUpdateException ex) when (IsUniqueViolation(ex)) { db.Entry(log).State = EntityState.Detached; duplicates++; continue; }
                if (log.Status == AssetExpiryReminderStatuses.Skipped) continue;
                await DeliverAsync(log, preview, setting, ct);
                if (log.Status == AssetExpiryReminderStatuses.Sent) sent++; else failed++;
            }
        }
        sw.Stop(); logger.LogInformation("Asset expiry scan completed in {DurationMs}ms. Sent={Sent} Failed={Failed} Skipped={Skipped} Duplicates={Duplicates}", sw.ElapsedMilliseconds, sent, failed, skipped, duplicates);
        return new(sent, failed, skipped, duplicates, sw.ElapsedMilliseconds);
    }

    public async Task<bool> RetryAsync(Guid id, CancellationToken ct = default)
    {
        var log = await db.AssetExpiryReminderLogs.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (log is null || log.Status != AssetExpiryReminderStatuses.Failed || log.AttemptCount >= options.CurrentValue.MaximumRetryCount) return false;
        var asset = await db.Assets.AsNoTracking().Include(x => x.AssetType).Include(x => x.Location).FirstAsync(x => x.Id == log.AssetId, ct);
        var preview = Render(log.RecipientName, asset.Model, asset.AssetCode, asset.SerialNumber, asset.AssetType?.Name ?? "", log.ExpiryType, DateOnly.FromDateTime(log.ExpiryDate), log.DaysRemaining, "", asset.Location?.Name ?? "");
        await DeliverAsync(log, preview, options.CurrentValue, ct); return log.Status == AssetExpiryReminderStatuses.Sent;
    }

    private async Task DeliverAsync(AssetExpiryReminderLog log, ReminderPreview preview, AssetExpiryReminderOptions setting, CancellationToken ct)
    {
        log.Status = AssetExpiryReminderStatuses.Processing; log.AttemptCount++; await db.SaveChangesAsync(ct);
        try { await email.SendAsync(new(log.RecipientEmail, preview.Subject, preview.HtmlBody, preview.TextBody, setting.CcItSupport, setting.Bcc), ct); log.Status = AssetExpiryReminderStatuses.Sent; log.SentAtUtc = DateTime.UtcNow; log.ErrorMessage = null; }
        catch (Exception ex) { log.Status = AssetExpiryReminderStatuses.Failed; log.ErrorMessage = SafeError(ex); logger.LogError(ex, "Expiry reminder delivery failed. CorrelationId={CorrelationId}", log.CorrelationId); }
        await db.SaveChangesAsync(ct);
    }

    public ReminderPreview Render(string employee, string assetName, string assetCode, string serial, string category, string expiryType, DateOnly expiryDate, int days, string department, string location)
    {
        var prefix = options.CurrentValue.SubjectPrefix; var timing = days == 0 ? "expires today" : days > 0 ? $"expires in {days} day{(days == 1 ? "" : "s")}" : $"expired {-days} day{(days == -1 ? "" : "s")} ago";
        var subject = $"{prefix} Asset {assetCode} {timing}"; string E(string value) => WebUtility.HtmlEncode(value ?? "");
        var text = $"Hello {employee},\n\nThis is an automated reminder that the asset currently assigned to you {timing}.\n\nAsset: {assetName}\nAsset Code: {assetCode}\nSerial Number: {serial}\nCategory: {category}\nExpiry Type: {expiryType}\nExpiry Date: {expiryDate:dd MMM yyyy}\nDepartment: {department}\nLocation: {location}\n\nPlease contact the IT department before the expiry date for renewal, return, replacement or further instructions.\n\nRegards,\nEFU IT Department\n\nThis is an automated email.";
        var html = $"""<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,sans-serif;color:#17233c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px"><table role="presentation" width="600" style="max-width:100%;background:#fff;border-radius:12px;overflow:hidden"><tr><td style="background:#005bac;color:#fff;padding:22px 28px;font-size:22px;font-weight:bold">EFU IT Inventory</td></tr><tr><td style="padding:28px"><p>Hello {E(employee)},</p><p>This is an automated reminder that the following asset currently assigned to you {E(timing)}.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="background:#f7f9fc;border:1px solid #dde5ef"><tr><td><b>Asset</b></td><td>{E(assetName)}</td></tr><tr><td><b>Asset Code</b></td><td>{E(assetCode)}</td></tr><tr><td><b>Serial Number</b></td><td>{E(serial)}</td></tr><tr><td><b>Category</b></td><td>{E(category)}</td></tr><tr><td><b>Expiry Type</b></td><td>{E(expiryType)}</td></tr><tr><td><b>Expiry Date</b></td><td>{expiryDate:dd MMM yyyy}</td></tr><tr><td><b>Days remaining</b></td><td>{days}</td></tr><tr><td><b>Department</b></td><td>{E(department)}</td></tr><tr><td><b>Location</b></td><td>{E(location)}</td></tr></table><p style="margin-top:22px">Please contact the IT department before the expiry date for renewal, return, replacement or further instructions.</p><p>Regards,<br><b>EFU IT Department</b></p></td></tr><tr><td style="padding:16px 28px;background:#edf2f7;color:#64748b;font-size:12px">This is an automated email. Please do not reply.</td></tr></table></td></tr></table></body></html>""";
        return new(subject, html, text);
    }

    public static TimeZoneInfo ResolveTimeZone(string id) { foreach (var candidate in new[] { id, id == "Asia/Karachi" ? "Pakistan Standard Time" : id }) try { return TimeZoneInfo.FindSystemTimeZoneById(candidate); } catch (TimeZoneNotFoundException) { } return TimeZoneInfo.Utc; }
    public static int CalculateDaysRemaining(DateOnly currentLocalDate, DateOnly expiryLocalDate) => expiryLocalDate.DayNumber - currentLocalDate.DayNumber;
    public static bool ShouldSend(int days, AssetExpiryReminderOptions setting) => setting.Enabled && days <= setting.ReminderWindowDays && days >= (setting.SendAfterExpiry ? -setting.PostExpiryDays : 0) && (days != 0 || setting.SendOnExpiryDate) && (setting.SendEveryDay || days == setting.ReminderWindowDays || days == 0);
    private static bool IsValidEmail(string? value) { try { return !string.IsNullOrWhiteSpace(value) && new MailAddress(value).Address.Equals(value.Trim(), StringComparison.OrdinalIgnoreCase); } catch { return false; } }
    private static bool IsUniqueViolation(DbUpdateException ex) => ex.InnerException?.Message.Contains("duplicate", StringComparison.OrdinalIgnoreCase) == true || ex.InnerException?.Message.Contains("2601", StringComparison.OrdinalIgnoreCase) == true || ex.InnerException?.Message.Contains("2627", StringComparison.OrdinalIgnoreCase) == true;
    private static string SafeError(Exception ex) => ex.GetType().Name + ": " + (ex.Message.Length > 800 ? ex.Message[..800] : ex.Message);
}
