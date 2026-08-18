using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;
using OperatingSystemEntity = EFU.Inventory.Models.OperatingSystem;

namespace EFU.Inventory.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppRole> Roles => Set<AppRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();
    public DbSet<PermissionHistory> PermissionHistories => Set<PermissionHistory>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<EmailVerificationToken> EmailVerificationTokens => Set<EmailVerificationToken>();
    public DbSet<LoginActivity> LoginActivities => Set<LoginActivity>();

    public DbSet<AssetType> AssetTypes => Set<AssetType>();
    public DbSet<AssetMake> AssetMakes => Set<AssetMake>();
    public DbSet<Motherboard> Motherboards => Set<Motherboard>();
    public DbSet<Memory> Memories => Set<Memory>();
    public DbSet<Storage> Storages => Set<Storage>();
    public DbSet<OperatingSystemEntity> OperatingSystems => Set<OperatingSystemEntity>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<Province> Provinces => Set<Province>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<Office> Offices => Set<Office>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<LifecyclePolicy> LifecyclePolicies => Set<LifecyclePolicy>();

    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Allocation> Allocations => Set<Allocation>();
    public DbSet<Revocation> Revocations => Set<Revocation>();
    public DbSet<Retirement> Retirements => Set<Retirement>();
    public DbSet<AssetStatusHistory> AssetStatusHistories => Set<AssetStatusHistory>();

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserNotificationPreference> UserNotificationPreferences => Set<UserNotificationPreference>();
    public DbSet<AssetExpiryReminderLog> AssetExpiryReminderLogs => Set<AssetExpiryReminderLog>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<ReportRun> ReportRuns => Set<ReportRun>();
    public DbSet<BackupRun> BackupRuns => Set<BackupRun>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<PurchaseOrderAttachment> PurchaseOrderAttachments => Set<PurchaseOrderAttachment>();
    public DbSet<PurchaseOrderStatusHistory> PurchaseOrderStatusHistory => Set<PurchaseOrderStatusHistory>();
    public DbSet<GoodsReceipt> GoodsReceipts => Set<GoodsReceipt>();
    public DbSet<GoodsReceiptItem> GoodsReceiptItems => Set<GoodsReceiptItem>();
    public DbSet<GoodsReceiptUnit> GoodsReceiptUnits => Set<GoodsReceiptUnit>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // Table naming is explicit so SQL migrations and EF mappings remain stable.
        b.Entity<AppRole>().ToTable("Roles");
        b.Entity<Permission>().ToTable("Permissions");
        b.Entity<UserRole>().ToTable("UserRoles");
        b.Entity<RolePermission>().ToTable("RolePermissions");
        b.Entity<UserPermission>().ToTable("UserPermissions");
        b.Entity<PermissionHistory>().ToTable("PermissionHistory");

        b.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        b.Entity<RolePermission>().HasKey(x => new { x.RoleId, x.PermissionId });
        b.Entity<UserPermission>().HasKey(x => new { x.UserId, x.PermissionId });
        b.Entity<UserRole>().HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<UserRole>().HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<RolePermission>().HasOne(x => x.Role).WithMany(x => x.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<RolePermission>().HasOne(x => x.Permission).WithMany(x => x.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<UserPermission>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<UserPermission>().HasOne(x => x.Permission).WithMany(x => x.UserPermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<PermissionHistory>().HasKey(x => x.Id);
        b.Entity<PermissionHistory>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PermissionHistory>().HasOne(x => x.Permission).WithMany().HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PermissionHistory>().HasOne(x => x.ChangedByUser).WithMany().HasForeignKey(x => x.ChangedByUserId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PermissionHistory>().HasIndex(x => new { x.UserId, x.ChangedAt });
        // Match the soft-delete filters on required principals so join queries
        // cannot surface orphaned role or permission memberships.
        b.Entity<UserRole>().HasQueryFilter(x => !x.User!.IsDeleted && !x.Role!.IsDeleted);
        b.Entity<RolePermission>().HasQueryFilter(x => !x.Role!.IsDeleted && !x.Permission!.IsDeleted);

        b.Entity<AppRole>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Permission>().HasIndex(x => x.Code).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<User>().HasIndex(x => x.Email).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<User>().HasIndex(x => x.EmployeeCode).IsUnique().HasFilter("[EmployeeCode] IS NOT NULL AND [IsDeleted] = 0");
        b.Entity<User>().HasIndex(x => new { x.Status, x.Role });
        b.Entity<RefreshToken>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<RefreshToken>().HasIndex(x => new { x.UserId, x.ExpiresAt });
        b.Entity<PasswordResetToken>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<EmailVerificationToken>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<LoginActivity>().HasIndex(x => new { x.EmailAttempted, x.CreatedAt });

        b.Entity<AssetType>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<AssetType>().HasIndex(x => x.Prefix).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<AssetMake>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Motherboard>().HasIndex(x => new { x.Name, x.Generation }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Memory>().HasIndex(x => new { x.Size, x.Type }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Storage>().HasIndex(x => new { x.Type, x.Capacity }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<OperatingSystemEntity>().HasIndex(x => new { x.Name, x.Version }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Vendor>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Vendor>().HasIndex(x => x.Ntn).IsUnique().HasFilter("[Ntn] IS NOT NULL AND [IsDeleted] = 0");
        b.Entity<Province>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<City>().HasIndex(x => new { x.ProvinceId, x.Name }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Location>().HasIndex(x => new { x.CityId, x.Name }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Department>().HasIndex(x => x.Name).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Office>().HasIndex(x => new { x.LocationId, x.Name }).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Employee>().HasIndex(x => x.EmployeeId).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Employee>().HasIndex(x => x.Email).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Employee>().HasIndex(x => new { x.DepartmentId, x.Status });
        b.Entity<LifecyclePolicy>().HasIndex(x => x.AssetTypeId).IsUnique().HasFilter("[IsDeleted] = 0");

        b.Entity<Asset>().HasIndex(x => x.AssetCode).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Asset>().HasIndex(x => x.SerialNumber).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<Asset>().HasIndex(x => x.AssetTag).IsUnique().HasFilter("[AssetTag] IS NOT NULL AND [IsDeleted] = 0");
        b.Entity<Asset>().HasIndex(x => x.Status);
        b.Entity<Asset>().HasIndex(x => new { x.AssetTypeId, x.Status });
        b.Entity<Asset>().HasIndex(x => new { x.LocationId, x.Status });
        b.Entity<Asset>().HasIndex(x => x.PurchaseDate);
        b.Entity<Asset>().HasIndex(x => x.WarrantyExpiryDate);
        b.Entity<Asset>().HasIndex(x => x.ExpectedExpiryDate);
        b.Entity<Allocation>().HasIndex(x => new { x.AssetId, x.ReturnedAt });
        b.Entity<Allocation>().HasIndex(x => new { x.EmployeeId, x.ReturnedAt });
        b.Entity<Revocation>().HasIndex(x => new { x.AssetId, x.RevocationDate });
        b.Entity<Retirement>().HasIndex(x => new { x.AssetId, x.ExpirationDate });
        b.Entity<AssetStatusHistory>().HasIndex(x => new { x.AssetId, x.EffectiveAt });

        b.Entity<Notification>().HasIndex(x => new { x.UserId, x.ReadAt, x.CreatedAt });
        b.Entity<UserNotificationPreference>().HasIndex(x => x.UserId).IsUnique().HasFilter("[IsDeleted] = 0");
        b.Entity<ActivityLog>().HasIndex(x => new { x.Entity, x.EntityId, x.CreatedAt });
        b.Entity<ActivityLog>().HasIndex(x => new { x.UserId, x.CreatedAt });
        b.Entity<AssetExpiryReminderLog>().ToTable("AssetExpiryReminderLogs");
        b.Entity<AssetExpiryReminderLog>().HasIndex(x => new { x.AssetId, x.ExpiryType, x.ExpiryDate, x.RecipientKey, x.DaysRemaining }).IsUnique();
        b.Entity<AssetExpiryReminderLog>().HasIndex(x => new { x.ReminderDate, x.Status });
        b.Entity<AssetExpiryReminderLog>().HasIndex(x => new { x.RecipientEmail, x.CreatedAt });
        b.Entity<ReportRun>().HasIndex(x => new { x.UserId, x.CreatedAt });
        b.Entity<BackupRun>().HasIndex(x => new { x.Status, x.CreatedAt });
        b.Entity<StoredFile>().HasIndex(x => new { x.EntityType, x.EntityId });

        b.Entity<PurchaseOrder>().HasIndex(x => x.PoNumber).IsUnique();
        b.Entity<PurchaseOrder>().HasIndex(x => new { x.Status, x.PoDate });
        b.Entity<PurchaseOrder>().HasIndex(x => new { x.PoYear, x.VendorId });
        b.Entity<PurchaseOrder>().HasIndex(x => x.DeliveryLocationId);
        b.Entity<PurchaseOrderItem>().HasIndex(x => new { x.PurchaseOrderId, x.LineNumber }).IsUnique();
        b.Entity<PurchaseOrderItem>().HasIndex(x => x.BranchUnitId);
        b.Entity<PurchaseOrderAttachment>().HasIndex(x => x.PurchaseOrderId);
        b.Entity<PurchaseOrderStatusHistory>().HasIndex(x => new { x.PurchaseOrderId, x.PerformedAt });
        b.Entity<GoodsReceipt>().HasIndex(x => x.ReceiptNumber).IsUnique();
        b.Entity<GoodsReceipt>().HasIndex(x => x.PurchaseOrderId);
        b.Entity<GoodsReceiptItem>().HasIndex(x => new { x.GoodsReceiptId, x.PurchaseOrderItemId }).IsUnique();
        b.Entity<GoodsReceiptUnit>().HasIndex(x => x.SerialNumber).IsUnique().HasFilter("[SerialNumber] IS NOT NULL");
        b.Entity<GoodsReceiptUnit>().HasIndex(x => x.AssetId).IsUnique().HasFilter("[AssetId] IS NOT NULL");

        b.Entity<Asset>().Property(x => x.PurchaseCost).HasPrecision(18, 2);
        b.Entity<Retirement>().Property(x => x.SalvageValue).HasPrecision(18, 2);
        b.Entity<LifecyclePolicy>().Property(x => x.SalvageValuePercent).HasPrecision(5, 2);
        foreach (var property in new[] { "Subtotal", "DiscountTotal", "TaxTotal", "OtherCharges", "GrandTotal" })
            b.Entity<PurchaseOrder>().Property(property).HasPrecision(18, 2);
        foreach (var property in new[] { "UnitPrice", "Quantity", "ReceivedQuantity", "DiscountValue", "DiscountAmount", "TaxAmount", "LineTotal" })
            b.Entity<PurchaseOrderItem>().Property(property).HasPrecision(18, 2);
        b.Entity<PurchaseOrderItem>().Property(x => x.TaxRate).HasPrecision(5, 2);
        b.Entity<GoodsReceiptItem>().Property(x => x.QuantityReceived).HasPrecision(18, 2);
        b.Entity<PurchaseOrder>().Property(x => x.RowVersion).IsRowVersion();
        b.Entity<PurchaseOrderItem>().Property(x => x.RowVersion).IsRowVersion();
        b.Entity<GoodsReceipt>().Property(x => x.RowVersion).IsRowVersion();

        b.Entity<SystemSetting>().HasKey(x => x.Key);
        b.Entity<SystemSetting>().Property(x => x.Key).HasMaxLength(150);

        // Central enterprise-safe string limits. DTO and master-data validation
        // use the same categories so the API, EF model, and UI stay aligned.
        foreach (var entityType in b.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties().Where(property => property.ClrType == typeof(string)))
            {
                var name = property.Name;
                var maximum = name switch
                {
                    "PasswordHash" or "TokenHash" or "ReplacedByTokenHash" => 500,
                    "Value" or "Metadata" or "FiltersJson" or "ErrorMessage" => 4000,
                    "StoragePath" or "OutputPath" => 1000,
                    "Description" or "Address" or "AdditionalNotes" or "Accessories" or "Remarks" or "Reason" or "Message" => 2000,
                    "Email" or "EmailAttempted" => 254,
                    "Phone" => 30,
                    "SerialNumber" or "AssetCode" or "AssetTag" or "EmployeeCode" or "EmployeeId" or "Prefix" or "Ntn" or "MacAddress" or "IpAddress" or "Hostname" or "BiosVersion" or "PurchaseOrderNumber" or "InvoiceNumber" => 100,
                    "OriginalFileName" or "StoredFileName" => 255,
                    _ => 200
                };
                property.SetMaxLength(maximum);
            }
        }

        b.Entity<User>().HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<User>().HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<City>().HasOne(x => x.Province).WithMany().HasForeignKey(x => x.ProvinceId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Location>().HasOne(x => x.Province).WithMany().HasForeignKey(x => x.ProvinceId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Location>().HasOne(x => x.City).WithMany().HasForeignKey(x => x.CityId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Office>().HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Employee>().HasOne(x => x.Department).WithMany().HasForeignKey(x => x.DepartmentId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Employee>().HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Employee>().HasOne(x => x.Office).WithMany().HasForeignKey(x => x.OfficeId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<LifecyclePolicy>().HasOne(x => x.AssetType).WithMany().HasForeignKey(x => x.AssetTypeId).OnDelete(DeleteBehavior.Restrict);

        b.Entity<Asset>().HasOne(x => x.AssetType).WithMany().HasForeignKey(x => x.AssetTypeId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Asset>().HasOne(x => x.AssetMake).WithMany().HasForeignKey(x => x.AssetMakeId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.Motherboard).WithMany().HasForeignKey(x => x.MotherboardId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.Memory).WithMany().HasForeignKey(x => x.MemoryId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.Storage).WithMany().HasForeignKey(x => x.StorageId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.OperatingSystem).WithMany().HasForeignKey(x => x.OperatingSystemId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.Vendor).WithMany().HasForeignKey(x => x.VendorId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Asset>().HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Allocation>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Allocation>().HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Allocation>().HasOne(x => x.Location).WithMany().HasForeignKey(x => x.LocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Revocation>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Revocation>().HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Retirement>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Retirement>().HasOne(x => x.DisposalVendor).WithMany().HasForeignKey(x => x.DisposalVendorId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<AssetStatusHistory>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<AssetStatusHistory>().HasOne(x => x.PerformedByUser).WithMany().HasForeignKey(x => x.PerformedByUserId).OnDelete(DeleteBehavior.SetNull);

        b.Entity<RefreshToken>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<PasswordResetToken>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<EmailVerificationToken>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<LoginActivity>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<Notification>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<UserNotificationPreference>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<AssetExpiryReminderLog>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<AssetExpiryReminderLog>().HasOne(x => x.Allocation).WithMany().HasForeignKey(x => x.AllocationId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<AssetExpiryReminderLog>().HasOne(x => x.Employee).WithMany().HasForeignKey(x => x.EmployeeId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<ActivityLog>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<ReportRun>().HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<BackupRun>().HasOne(x => x.RequestedByUser).WithMany().HasForeignKey(x => x.RequestedByUserId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<StoredFile>().HasOne(x => x.UploadedByUser).WithMany().HasForeignKey(x => x.UploadedByUserId).OnDelete(DeleteBehavior.SetNull);
        b.Entity<PurchaseOrder>().HasOne(x => x.Vendor).WithMany().HasForeignKey(x => x.VendorId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrder>().HasOne(x => x.DeliveryLocation).WithMany().HasForeignKey(x => x.DeliveryLocationId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrder>().HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderItem>().HasOne(x => x.PurchaseOrder).WithMany(x => x.Items).HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderItem>().HasOne(x => x.AssetType).WithMany().HasForeignKey(x => x.AssetTypeId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderItem>().HasOne(x => x.AssetMake).WithMany().HasForeignKey(x => x.AssetMakeId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderItem>().HasOne(x => x.BranchUnit).WithMany().HasForeignKey(x => x.BranchUnitId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderItem>().HasOne(x => x.IntendedUser).WithMany().HasForeignKey(x => x.IntendedUserId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderAttachment>().HasOne(x => x.PurchaseOrder).WithMany(x => x.Attachments).HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderStatusHistory>().HasOne(x => x.PurchaseOrder).WithMany(x => x.StatusHistory).HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<PurchaseOrderStatusHistory>().HasOne(x => x.PerformedByUser).WithMany().HasForeignKey(x => x.PerformedByUserId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GoodsReceipt>().HasOne(x => x.PurchaseOrder).WithMany(x => x.Receipts).HasForeignKey(x => x.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GoodsReceiptItem>().HasOne(x => x.GoodsReceipt).WithMany(x => x.Items).HasForeignKey(x => x.GoodsReceiptId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GoodsReceiptItem>().HasOne(x => x.PurchaseOrderItem).WithMany().HasForeignKey(x => x.PurchaseOrderItemId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GoodsReceiptUnit>().HasOne(x => x.GoodsReceiptItem).WithMany(x => x.Units).HasForeignKey(x => x.GoodsReceiptItemId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<GoodsReceiptUnit>().HasOne(x => x.Asset).WithMany().HasForeignKey(x => x.AssetId).OnDelete(DeleteBehavior.Restrict);

        foreach (var e in b.Model.GetEntityTypes().Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType)))
        {
            var method = typeof(AppDbContext)
                .GetMethod(nameof(SetSoftDeleteFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static)!
                .MakeGenericMethod(e.ClrType);
            method.Invoke(null, new object[] { b });
        }
    }

    static void SetSoftDeleteFilter<T>(ModelBuilder b) where T : BaseEntity =>
        b.Entity<T>().HasQueryFilter(x => !x.IsDeleted);

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        foreach (var e in ChangeTracker.Entries<BaseEntity>())
        {
            if (e.State == EntityState.Added)
            {
                e.Entity.CreatedAt = now;
                e.Entity.UpdatedAt = now;
            }
            else if (e.State == EntityState.Modified)
            {
                e.Entity.UpdatedAt = now;
                if (e.Entity.IsDeleted && e.Entity.DeletedAt is null)
                    e.Entity.DeletedAt = now;
            }
        }
        return base.SaveChangesAsync(ct);
    }
}
