using EFU.Inventory.Services;
using Microsoft.Data.SqlClient;
using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Features.Notifications;

public sealed class AssetExpiryReminderJob(IServiceScopeFactory scopes, IConfiguration configuration, ILogger<AssetExpiryReminderJob> logger) : BackgroundService
{
    public const string JobId = "asset-expiry-daily-reminders";
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RunWithDistributedLockAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception ex) { logger.LogError(ex, "{JobId} failed", JobId); }
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task RunWithDistributedLockAsync(CancellationToken ct)
    {
        await using var connection = new SqlConnection(configuration.GetConnectionString("DefaultConnection"));
        await connection.OpenAsync(ct);
        await using var command = new SqlCommand("DECLARE @r int; EXEC @r=sp_getapplock @Resource=@resource,@LockMode='Exclusive',@LockOwner='Session',@LockTimeout=0; SELECT @r", connection);
        command.Parameters.AddWithValue("@resource", JobId);
        var acquired = Convert.ToInt32(await command.ExecuteScalarAsync(ct)) >= 0;
        if (!acquired) { logger.LogInformation("{JobId} skipped because another instance owns the lock", JobId); return; }
        await using var scope = scopes.CreateAsyncScope();
        var setting = await scope.ServiceProvider.GetRequiredService<AssetExpiryReminderSettingsStore>().GetAsync(ct);
        if (!setting.Enabled) return;
        var zone = AssetExpiryReminderService.ResolveTimeZone(setting.TimeZone); var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone);
        if (!TimeOnly.TryParse(setting.ExecutionTime, out var scheduled)) scheduled = new TimeOnly(9, 0);
        if (TimeOnly.FromDateTime(localNow.DateTime) < scheduled) return;
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); const string key = "assetExpiryReminders.lastCompletedLocalDate";
        var row = await db.SystemSettings.FirstOrDefaultAsync(x => x.Key == key, ct); var today = DateOnly.FromDateTime(localNow.DateTime).ToString("yyyy-MM-dd");
        if (row?.Value.Trim('"') == today) return;
        await scope.ServiceProvider.GetRequiredService<IAssetExpiryReminderService>().RunAsync(ct);
        if (row is null) db.SystemSettings.Add(new SystemSetting { Key = key, Value = $"\"{today}\"", Category = "NOTIFICATIONS" }); else { row.Value = $"\"{today}\""; row.UpdatedAt = DateTime.UtcNow; }
        await db.SaveChangesAsync(ct);
    }

    internal static TimeSpan DelayUntilNextRun(AssetExpiryReminderOptions setting)
    {
        var zone = AssetExpiryReminderService.ResolveTimeZone(setting.TimeZone);
        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone);
        if (!TimeOnly.TryParse(setting.ExecutionTime, out var time)) time = new TimeOnly(9, 0);
        var nextLocal = now.Date.Add(time.ToTimeSpan()); if (nextLocal <= now.DateTime) nextLocal = nextLocal.AddDays(1);
        var next = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(nextLocal, DateTimeKind.Unspecified), zone);
        var delay = next - DateTime.UtcNow; return delay < TimeSpan.FromSeconds(1) ? TimeSpan.FromSeconds(1) : delay;
    }
}
