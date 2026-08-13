using System.Security.Claims;
using EFU.Inventory.Authorization;
using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EFU.Inventory.Tests;

public class PermissionAuthorizationTests
{
    [Fact]
    public async Task SuperAdmin_Automatically_Has_Every_Permission()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.SuperAdmin);
        foreach (var code in Permissions.All) Assert.True(await IsAllowed(db, user, code));
    }

    [Fact]
    public async Task ItAdmin_With_AssetsView_Can_View_But_Cannot_Create()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.ItAdmin);
        await Grant(db, user.Id, Permissions.AssetsView);
        Assert.True(await IsAllowed(db, user, Permissions.AssetsView));
        Assert.False(await IsAllowed(db, user, Permissions.AssetsCreate));
    }

    [Fact]
    public async Task ItAdmin_Create_Does_Not_Grant_Delete()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.ItAdmin);
        await Grant(db, user.Id, Permissions.AssetsCreate);
        Assert.True(await IsAllowed(db, user, Permissions.AssetsCreate));
        Assert.False(await IsAllowed(db, user, Permissions.AssetsDelete));
    }

    [Fact]
    public async Task Permission_Revocation_Takes_Effect_On_Next_Check()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.ItAdmin);
        var grant = await Grant(db, user.Id, Permissions.AssetsView);
        Assert.True(await IsAllowed(db, user, Permissions.AssetsView));
        grant.IsGranted = false; grant.RevokedAt = DateTime.UtcNow; await db.SaveChangesAsync();
        Assert.False(await IsAllowed(db, user, Permissions.AssetsView));
    }

    [Fact]
    public async Task Viewer_Cannot_Mutate_Data()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.Viewer);
        Assert.True(await IsAllowed(db, user, Permissions.AssetsView));
        Assert.False(await IsAllowed(db, user, Permissions.AssetsCreate));
        Assert.False(await IsAllowed(db, user, Permissions.AllocationsCreate));
    }

    [Fact]
    public async Task Disabled_User_Is_Denied_Even_With_A_Grant()
    {
        await using var db = Database(); var user = await AddUser(db, Roles.ItAdmin, RecordStatuses.Inactive);
        await Grant(db, user.Id, Permissions.AssetsView);
        Assert.False(await IsAllowed(db, user, Permissions.AssetsView));
    }

    [Fact]
    public void Permission_Codes_Are_Unique_And_Dependencies_Exist()
    {
        Assert.Equal(Permissions.All.Count, Permissions.All.Distinct(StringComparer.Ordinal).Count());
        Assert.All(Permissions.Catalog.Where(x => x.Requires is not null), x => Assert.Contains(x.Requires!, Permissions.All));
        Assert.DoesNotContain("unknown.permission", Permissions.All);
    }

    [Fact]
    public void Permission_Catalog_Query_Is_Translatable_By_SqlServer()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=TranslationOnly;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var db = new AppDbContext(options);
        var codes = Permissions.All.ToArray();
        var sql = db.Permissions.Where(permission => codes.Contains(permission.Code)).ToQueryString();
        Assert.Contains("Permissions", sql);
    }

    private static AppDbContext Database() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static async Task<User> AddUser(AppDbContext db, string role, string status = RecordStatuses.Active)
    { var user = new User { Name="Test", Email=$"{Guid.NewGuid()}@test.local", Role=role, Status=status, PasswordHash="test" }; db.Users.Add(user); await db.SaveChangesAsync(); return user; }
    private static async Task<UserPermission> Grant(AppDbContext db, Guid userId, string code)
    { var p=new Permission{Code=code,Name=code}; db.Permissions.Add(p); var g=new UserPermission{UserId=userId,Permission=p,PermissionId=p.Id,GrantedByUserId=userId}; db.UserPermissions.Add(g); await db.SaveChangesAsync(); return g; }
    private static async Task<bool> IsAllowed(AppDbContext db, User user, string code)
    {
        var principal=new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,user.Id.ToString()),new Claim(ClaimTypes.Role,user.Role)],"test"));
        var requirement=new PermissionRequirement(code); var context=new AuthorizationHandlerContext([requirement],principal,null);
        var accessor=new HttpContextAccessor{HttpContext=new DefaultHttpContext()};
        await new PermissionAuthorizationHandler(db,accessor,NullLogger<PermissionAuthorizationHandler>.Instance).HandleAsync(context);
        return context.HasSucceeded;
    }
}
