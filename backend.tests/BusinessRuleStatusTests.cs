using EFU.Inventory.Services;
using Xunit;

namespace EFU.Inventory.Tests;

public sealed class BusinessRuleStatusTests
{
    [Theory]
    [InlineData("ACTIVE")]
    [InlineData("Active")]
    [InlineData("active")]
    [InlineData(" ACTIVE ")]
    public void Active_status_is_normalized(string value) =>
        Assert.True(BusinessRuleService.IsActiveStatus(value));

    [Theory]
    [InlineData("INACTIVE")]
    [InlineData("")]
    [InlineData(null)]
    public void Non_active_status_is_rejected(string? value) =>
        Assert.False(BusinessRuleService.IsActiveStatus(value));
}
