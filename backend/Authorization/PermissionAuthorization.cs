using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace EFU.Inventory.Authorization;

public sealed record PermissionRequirement(string Code) : IAuthorizationRequirement;

public sealed class PermissionAuthorizationHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor, ILogger<PermissionAuthorizationHandler> logger)
    : AuthorizationHandler<PermissionRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var idValue = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(idValue, out var userId)) return;

        var currentUser = await db.Users.AsNoTracking().Where(x => x.Id == userId)
            .Select(x => new { x.Role, x.Status }).FirstOrDefaultAsync();
        if (currentUser is null || currentUser.Status != RecordStatuses.Active) return;
        if (currentUser.Role == Roles.SuperAdmin)
        {
            context.Succeed(requirement);
            return;
        }

        if (currentUser.Role == Roles.Viewer &&
            (requirement.Code is Permissions.DashboardView or Permissions.AssetsView or Permissions.ReportsInventoryView ||
             requirement.Code.StartsWith("master.", StringComparison.Ordinal) && requirement.Code.EndsWith(".view", StringComparison.Ordinal)))
        {
            context.Succeed(requirement);
            return;
        }

        var code = requirement.Code;
        if (code == Permissions.UserPermissionsManage) return;
        if (code is Permissions.MasterViewPolicy or Permissions.MasterManagePolicy)
        {
            var kind = Permissions.MasterKindFromRoute(httpContextAccessor.HttpContext?.Request.RouteValues["type"]?.ToString());
            if (kind is null) return;
            code = code == Permissions.MasterViewPolicy ? Permissions.MasterView(kind) : Permissions.MasterManage(kind);
        }
        var granted = await db.UserPermissions.AsNoTracking().AnyAsync(item =>
            item.UserId == userId && item.Permission!.Code == code &&
            item.IsGranted && item.RevokedAt == null);
        if (granted) context.Succeed(requirement);
        else logger.LogWarning("Permission denied for user {UserId}; permission {PermissionCode}; correlation {CorrelationId}", userId, code, httpContextAccessor.HttpContext?.TraceIdentifier);
    }
}

public sealed class HasPermissionAttribute : AuthorizeAttribute
{
    public const string Prefix = "Permission:";
    public HasPermissionAttribute(string permission) => Policy = Prefix + permission;
}

public sealed class PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    : DefaultAuthorizationPolicyProvider(options)
{
    public override Task<AuthorizationPolicy?> GetPolicyAsync(string name)
    {
        if (!name.StartsWith(HasPermissionAttribute.Prefix, StringComparison.Ordinal))
            return base.GetPolicyAsync(name);
        var code = name[HasPermissionAttribute.Prefix.Length..];
        return Task.FromResult<AuthorizationPolicy?>(new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(code)).Build());
    }
}
