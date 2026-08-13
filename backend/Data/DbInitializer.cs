using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider sp)
    {
        var db = sp.GetRequiredService<AppDbContext>();
        var configuration = sp.GetRequiredService<IConfiguration>();

        // -----------------------------
        // 1. Roles
        // -----------------------------
        var roleDefinitions = new[]
        {
            new
            {
                Name = Roles.SuperAdmin,
                Description = "Full system administration and security management"
            },
            new
            {
                Name = Roles.ItAdmin,
                Description = "IT inventory operations, setup and reporting"
            },
            new
            {
                Name = Roles.Viewer,
                Description = "Read-only inventory and reporting access"
            }
        };

        foreach (var definition in roleDefinitions)
        {
            if (!await db.Roles.AnyAsync(x => x.Name == definition.Name))
            {
                db.Roles.Add(new AppRole
                {
                    Name = definition.Name,
                    Description = definition.Description
                });
            }
        }

        await db.SaveChangesAsync();

        // -----------------------------
        // 2. Permissions
        // -----------------------------
        var permissionDefinitions = new (string Code, string Name)[]
        {
            ("dashboard.view", "View dashboard"),

            ("assets.view", "View assets"),
            ("assets.create", "Create assets"),
            ("assets.update", "Update assets"),
            ("assets.delete", "Delete assets"),

            ("transactions.allocate", "Allocate assets"),
            ("transactions.revoke", "Revoke assets"),
            ("transactions.retire", "Retire assets"),

            ("master.view", "View master data"),
            ("master.manage", "Manage master data"),

            ("reports.view", "View reports"),
            ("reports.export", "Export reports"),

            ("users.manage", "Manage users and roles"),
            ("settings.manage", "Manage system settings"),

            ("audit.view", "View audit logs"),
            ("backup.manage", "Manage backups")
        };

        foreach (var (code, name) in permissionDefinitions)
        {
            if (!await db.Permissions.AnyAsync(x => x.Code == code))
            {
                db.Permissions.Add(new Permission
                {
                    Code = code,
                    Name = name
                });
            }
        }

        await db.SaveChangesAsync();

        // -----------------------------
        // 3. Role permissions
        // -----------------------------
        var permissions = await db.Permissions.ToListAsync();
        var roles = await db.Roles.ToDictionaryAsync(x => x.Name);

        var superAdminRole = roles[Roles.SuperAdmin];
        var itAdminRole = roles[Roles.ItAdmin];
        var viewerRole = roles[Roles.Viewer];

        foreach (var permission in permissions)
        {
            if (!await db.RolePermissions.AnyAsync(x =>
                    x.RoleId == superAdminRole.Id &&
                    x.PermissionId == permission.Id))
            {
                db.RolePermissions.Add(new RolePermission
                {
                    RoleId = superAdminRole.Id,
                    PermissionId = permission.Id
                });
            }
        }

        var itAdminCodes = new HashSet<string>
        {
            "dashboard.view",
            "assets.view",
            "assets.create",
            "assets.update",
            "transactions.allocate",
            "transactions.revoke",
            "transactions.retire",
            "master.view",
            "master.manage",
            "reports.view",
            "reports.export",
            "audit.view",
            "settings.manage"
        };

        foreach (var permission in permissions.Where(x => itAdminCodes.Contains(x.Code)))
        {
            if (!await db.RolePermissions.AnyAsync(x =>
                    x.RoleId == itAdminRole.Id &&
                    x.PermissionId == permission.Id))
            {
                db.RolePermissions.Add(new RolePermission
                {
                    RoleId = itAdminRole.Id,
                    PermissionId = permission.Id
                });
            }
        }

        var viewerCodes = new HashSet<string>
        {
            "dashboard.view",
            "assets.view",
            "master.view",
            "reports.view"
        };

        foreach (var permission in permissions.Where(x => viewerCodes.Contains(x.Code)))
        {
            if (!await db.RolePermissions.AnyAsync(x =>
                    x.RoleId == viewerRole.Id &&
                    x.PermissionId == permission.Id))
            {
                db.RolePermissions.Add(new RolePermission
                {
                    RoleId = viewerRole.Id,
                    PermissionId = permission.Id
                });
            }
        }

        await db.SaveChangesAsync();

        // -----------------------------
        // 4. Essential organization records only
        // -----------------------------
        var itDepartment = await db.Departments
            .FirstOrDefaultAsync(x => x.Name == "Information Technology");

        if (itDepartment is null)
        {
            itDepartment = new Department
            {
                Name = "Information Technology"
            };

            db.Departments.Add(itDepartment);
            await db.SaveChangesAsync();
        }

        var sindh = await db.Provinces
            .FirstOrDefaultAsync(x => x.Name == "Sindh");

        if (sindh is null)
        {
            sindh = new Province
            {
                Name = "Sindh"
            };

            db.Provinces.Add(sindh);
            await db.SaveChangesAsync();
        }

        var karachi = await db.Cities
            .FirstOrDefaultAsync(x =>
                x.Name == "Karachi" &&
                x.ProvinceId == sindh.Id);

        if (karachi is null)
        {
            karachi = new City
            {
                Name = "Karachi",
                ProvinceId = sindh.Id
            };

            db.Cities.Add(karachi);
            await db.SaveChangesAsync();
        }

        var mainLocation = await db.Locations
            .FirstOrDefaultAsync(x => x.Name == "EFU House, Clifton");

        if (mainLocation is null)
        {
            mainLocation = new Location
            {
                Name = "EFU House, Clifton",
                ProvinceId = sindh.Id,
                CityId = karachi.Id
            };

            db.Locations.Add(mainLocation);
            await db.SaveChangesAsync();
        }

        var headOffice = await db.Offices
            .FirstOrDefaultAsync(x => x.Name == "Head Office");

        if (headOffice is null)
        {
            headOffice = new Office
            {
                Name = "Head Office",
                LocationId = mainLocation.Id
            };

            db.Offices.Add(headOffice);
            await db.SaveChangesAsync();
        }

        // -----------------------------
        // 5. Bootstrap Super Admin
        // -----------------------------
        var bootstrapEmail = configuration["BootstrapAdmin:Email"];
        var bootstrapPassword = configuration["BootstrapAdmin:Password"];

        var admin = !string.IsNullOrWhiteSpace(bootstrapEmail)
            ? await db.Users.FirstOrDefaultAsync(x => x.Email == bootstrapEmail)
            : await db.Users.FirstOrDefaultAsync(x => x.Role == Roles.SuperAdmin);

        if (admin is null)
        {
            if (string.IsNullOrWhiteSpace(bootstrapEmail) ||
                string.IsNullOrWhiteSpace(bootstrapPassword))
            {
                throw new InvalidOperationException(
                    "A new database requires BootstrapAdmin:Email and BootstrapAdmin:Password configuration.");
            }

            admin = new User
            {
                Name = "System Administrator",
                Email = bootstrapEmail.Trim().ToLowerInvariant(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(bootstrapPassword),
                Role = Roles.SuperAdmin,
                Status = "ACTIVE",
                EmployeeCode = "EFU-ADM-0001",
                DepartmentId = itDepartment.Id,
                LocationId = mainLocation.Id,
                EmailVerified = true,
                PasswordChangedAt = DateTime.UtcNow
            };

            db.Users.Add(admin);
            await db.SaveChangesAsync();
        }

        if (!await db.UserRoles.AnyAsync(x =>
                x.UserId == admin.Id &&
                x.RoleId == superAdminRole.Id))
        {
            db.UserRoles.Add(new UserRole
            {
                UserId = admin.Id,
                RoleId = superAdminRole.Id
            });
        }

        if (!await db.UserNotificationPreferences.AnyAsync(x =>
                x.UserId == admin.Id))
        {
            db.UserNotificationPreferences.Add(
                new UserNotificationPreference
                {
                    UserId = admin.Id
                });
        }

        await db.SaveChangesAsync();

        // -----------------------------
        // 6. System settings
        // -----------------------------
        var defaultSettings = new Dictionary<string, (object Value, string Category)>
        {
            ["companyName"] = ("EFU General Insurance", "GENERAL"),
            ["systemName"] = ("IT Hardware Inventory Management System", "GENERAL"),
            ["timezone"] = ("Asia/Karachi", "REGIONAL"),
            ["dateFormat"] = ("dd MMM yyyy", "REGIONAL"),
            ["currency"] = ("PKR", "REGIONAL"),

            ["twoFactorAuthentication"] = (false, "SECURITY"),
            ["sessionTimeoutMinutes"] = (30, "SECURITY"),
            ["passwordExpiryDays"] = (0, "SECURITY"),
            ["passwordRequireUppercase"] = (true, "SECURITY"),
            ["passwordRequireNumber"] = (true, "SECURITY"),
            ["passwordRequireSpecial"] = (true, "SECURITY"),

            ["automaticBackup"] = (true, "BACKUP")
        };

        foreach (var (key, item) in defaultSettings)
        {
            if (await db.SystemSettings.AnyAsync(x => x.Key == key))
            {
                continue;
            }

            db.SystemSettings.Add(new SystemSetting
            {
                Key = key,
                Value = System.Text.Json.JsonSerializer.Serialize(item.Value),
                Category = item.Category,
                UpdatedByUserId = admin.Id
            });
        }

        await db.SaveChangesAsync();

        // No demo employees.
        // No demo assets.
        // No demo allocations.
        // No demo vendors.
        // No demo asset makes/types.
        // No demo activity logs.
        // No demo notifications.
    }
}