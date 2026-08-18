using EFU.Inventory.Services;
using Xunit;

namespace EFU.Inventory.Tests;

public sealed class AssetExpiryReminderTests
{
    private static AssetExpiryReminderOptions Defaults() => new() { Enabled = true, ReminderWindowDays = 15, SendEveryDay = true, SendOnExpiryDate = true };

    [Theory]
    [InlineData(0, 0)] [InlineData(1, 1)] [InlineData(15, 15)] [InlineData(16, 16)] [InlineData(-1, -1)]
    public void Calendar_day_calculation_is_date_only(int offset, int expected) => Assert.Equal(expected, AssetExpiryReminderService.CalculateDaysRemaining(new DateOnly(2026, 8, 17), new DateOnly(2026, 8, 17).AddDays(offset)));

    [Theory]
    [InlineData(15, true)] [InlineData(1, true)] [InlineData(0, true)] [InlineData(16, false)] [InlineData(-1, false)]
    public void Default_window_boundaries(int days, bool expected) => Assert.Equal(expected, AssetExpiryReminderService.ShouldSend(days, Defaults()));

    [Fact] public void Disabled_feature_never_sends() { var o = Defaults(); o.Enabled = false; Assert.False(AssetExpiryReminderService.ShouldSend(5, o)); }
    [Fact] public void Expiry_date_can_be_disabled() { var o = Defaults(); o.SendOnExpiryDate = false; Assert.False(AssetExpiryReminderService.ShouldSend(0, o)); }
    [Fact] public void Post_expiry_is_bounded() { var o = Defaults(); o.SendAfterExpiry = true; o.PostExpiryDays = 2; Assert.True(AssetExpiryReminderService.ShouldSend(-2, o)); Assert.False(AssetExpiryReminderService.ShouldSend(-3, o)); }
    [Fact] public void Non_daily_mode_sends_window_start_and_expiry_only() { var o = Defaults(); o.SendEveryDay = false; Assert.True(AssetExpiryReminderService.ShouldSend(15, o)); Assert.False(AssetExpiryReminderService.ShouldSend(14, o)); Assert.True(AssetExpiryReminderService.ShouldSend(0, o)); }
}
