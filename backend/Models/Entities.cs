namespace EFU.Inventory.Models;

public static class Roles
{
    public const string SuperAdmin = "SUPER_ADMIN";
    public const string ItAdmin = "IT_ADMIN";
    public const string Viewer = "VIEWER";
}

public static class AssetStatuses
{
    public const string InStock = "IN_STOCK";
    public const string Allocated = "ALLOCATED";
    public const string Expired = "EXPIRED";
    public const string Retired = "RETIRED";
}

public static class RecordStatuses
{
    public const string Active = "ACTIVE";
    public const string Inactive = "INACTIVE";
}

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
    public bool IsDeleted { get; set; }
}

// RBAC / authentication
public class AppRole : BaseEntity
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; } = true;
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission : BaseEntity
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class User : BaseEntity
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string? EmployeeCode { get; set; }
    public string? Phone { get; set; }
    // Kept for compatibility with current JWT/controller code; normalized role membership is also stored in UserRoles.
    public string Role { get; set; } = Roles.Viewer;
    public string Status { get; set; } = "ACTIVE";
    public Guid? DepartmentId { get; set; }
    public Guid? LocationId { get; set; }
    public string? AvatarPath { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime? PasswordChangedAt { get; set; }
    public bool EmailVerified { get; set; }
    public Department? Department { get; set; }
    public Location? Location { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public User? User { get; set; }
    public AppRole? Role { get; set; }
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public AppRole? Role { get; set; }
    public Permission? Permission { get; set; }
}

public class RefreshToken : BaseEntity
{
    public string TokenHash { get; set; } = "";
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }
    public User? User { get; set; }
}

public class PasswordResetToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public User? User { get; set; }
}

public class EmailVerificationToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
    public User? User { get; set; }
}

public class LoginActivity : BaseEntity
{
    public Guid? UserId { get; set; }
    public string EmailAttempted { get; set; } = "";
    public bool Succeeded { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? FailureReason { get; set; }
    public User? User { get; set; }
}

// Master data
public class AssetType : BaseEntity
{
    public string Name { get; set; } = "";
    public string Prefix { get; set; } = "";
    public string? Description { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class AssetMake : BaseEntity
{
    public string Name { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
}

public class Motherboard : BaseEntity
{
    public string Name { get; set; } = "";
    public string? Generation { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Memory : BaseEntity
{
    public string Size { get; set; } = "";
    public string? Type { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Storage : BaseEntity
{
    public string Type { get; set; } = "";
    public string Capacity { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
}

public class OperatingSystem : BaseEntity
{
    public string Name { get; set; } = "";
    public string? Version { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Vendor : BaseEntity
{
    public string Name { get; set; } = "";
    public string? Contact { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Ntn { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Province : BaseEntity
{
    public string Name { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
}

public class City : BaseEntity
{
    public string Name { get; set; } = "";
    public Guid ProvinceId { get; set; }
    public Province? Province { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Location : BaseEntity
{
    public string Name { get; set; } = "";
    public Guid? ProvinceId { get; set; }
    public Guid? CityId { get; set; }
    public Province? Province { get; set; }
    public City? City { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Department : BaseEntity
{
    public string Name { get; set; } = "";
    public string Status { get; set; } = "ACTIVE";
}

public class Office : BaseEntity
{
    public string Name { get; set; } = "";
    public Guid? LocationId { get; set; }
    public Location? Location { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class Employee : BaseEntity
{
    public string Name { get; set; } = "";
    public string EmployeeId { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? LocationId { get; set; }
    public Guid? OfficeId { get; set; }
    public Department? Department { get; set; }
    public Location? Location { get; set; }
    public Office? Office { get; set; }
    public string Status { get; set; } = "ACTIVE";
}

public class LifecyclePolicy : BaseEntity
{
    public Guid AssetTypeId { get; set; }
    public AssetType? AssetType { get; set; }
    public int ExpectedLifespanYears { get; set; }
    public int WarrantyPeriodYears { get; set; }
    public string DepreciationMethod { get; set; } = "STRAIGHT_LINE";
    public decimal SalvageValuePercent { get; set; } = 10;
    public string EndOfLifeAction { get; set; } = "DISPOSE";
    public string Status { get; set; } = "ACTIVE";
}

// Asset lifecycle
public class Asset : BaseEntity
{
    public string AssetCode { get; set; } = "";
    public string SerialNumber { get; set; } = "";
    public string Model { get; set; } = "";
    public string? AssetTag { get; set; }
    public string? Condition { get; set; }
    public string? Accessories { get; set; }
    public string? AdditionalNotes { get; set; }
    public string? PurchaseOrderNumber { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? MacAddress { get; set; }
    public string? IpAddress { get; set; }
    public string? Hostname { get; set; }
    public string? Domain { get; set; }
    public string? BiosVersion { get; set; }
    public string? GpuModel { get; set; }
    public DateTime PurchaseDate { get; set; }
    public decimal PurchaseCost { get; set; }
    public DateTime AddingDate { get; set; } = DateTime.UtcNow;
    public DateTime? WarrantyExpiryDate { get; set; }
    public DateTime? ExpectedExpiryDate { get; set; }
    public string Status { get; set; } = AssetStatuses.InStock;
    public Guid AssetTypeId { get; set; }
    public Guid? AssetMakeId { get; set; }
    public Guid? MotherboardId { get; set; }
    public Guid? MemoryId { get; set; }
    public Guid? StorageId { get; set; }
    public Guid? OperatingSystemId { get; set; }
    public Guid? VendorId { get; set; }
    public Guid? LocationId { get; set; }
    public AssetType? AssetType { get; set; }
    public AssetMake? AssetMake { get; set; }
    public Motherboard? Motherboard { get; set; }
    public Memory? Memory { get; set; }
    public Storage? Storage { get; set; }
    public OperatingSystem? OperatingSystem { get; set; }
    public Vendor? Vendor { get; set; }
    public Location? Location { get; set; }
}

public class Allocation : BaseEntity
{
    public Guid AssetId { get; set; }
    public Guid EmployeeId { get; set; }
    public DateTime AllocationDate { get; set; }
    public Guid? LocationId { get; set; }
    public string? Remarks { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public Asset? Asset { get; set; }
    public Employee? Employee { get; set; }
    public Location? Location { get; set; }
}

public class Revocation : BaseEntity
{
    public Guid AssetId { get; set; }
    public Guid? EmployeeId { get; set; }
    public string Reason { get; set; } = "";
    public string? Condition { get; set; }
    public string? Remarks { get; set; }
    public DateTime RevocationDate { get; set; }
    public Asset? Asset { get; set; }
    public Employee? Employee { get; set; }
}

public class Retirement : BaseEntity
{
    public Guid AssetId { get; set; }
    public string? CurrentOwner { get; set; }
    public string Reason { get; set; } = "";
    public string? Condition { get; set; }
    public string EndOfLifeAction { get; set; } = "";
    public decimal? SalvageValue { get; set; }
    public Guid? DisposalVendorId { get; set; }
    public string? DisposalLocation { get; set; }
    public string? Remarks { get; set; }
    public DateTime ExpirationDate { get; set; }
    public Asset? Asset { get; set; }
    public Vendor? DisposalVendor { get; set; }
}

public class AssetStatusHistory : BaseEntity
{
    public Guid AssetId { get; set; }
    public string FromStatus { get; set; } = "";
    public string ToStatus { get; set; } = "";
    public string EventType { get; set; } = "";
    public Guid? PerformedByUserId { get; set; }
    public string? Remarks { get; set; }
    public DateTime EffectiveAt { get; set; } = DateTime.UtcNow;
    public Asset? Asset { get; set; }
    public User? PerformedByUser { get; set; }
}

// Notifications, settings, reporting and operations
public class Notification : BaseEntity
{
    public Guid? UserId { get; set; }
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Type { get; set; } = "INFO";
    public string? ActionUrl { get; set; }
    public Guid? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public DateTime? ReadAt { get; set; }
    public User? User { get; set; }
}

public class UserNotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public bool WarrantyExpiryAlerts { get; set; } = true;
    public bool AssetExpiryAlerts { get; set; } = true;
    public bool AllocationNotifications { get; set; } = true;
    public bool ReturnNotifications { get; set; } = true;
    public bool DailyEmailDigest { get; set; }
    public User? User { get; set; }
}

public class ActivityLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string Action { get; set; } = "";
    public string Entity { get; set; } = "";
    public Guid? EntityId { get; set; }
    public string? Metadata { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public User? User { get; set; }
}

public class SystemSetting
{
    public string Key { get; set; } = "";
    public string Value { get; set; } = "null";
    public string Category { get; set; } = "GENERAL";
    public bool IsSensitive { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; set; }
}

public class ReportRun : BaseEntity
{
    public Guid? UserId { get; set; }
    public string ReportType { get; set; } = "";
    public string Format { get; set; } = "SCREEN";
    public string? FiltersJson { get; set; }
    public int? ResultCount { get; set; }
    public string Status { get; set; } = "COMPLETED";
    public string? OutputPath { get; set; }
    public User? User { get; set; }
}

public class BackupRun : BaseEntity
{
    public Guid? RequestedByUserId { get; set; }
    public string Type { get; set; } = "MANUAL";
    public string Status { get; set; } = "PENDING";
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long? SizeBytes { get; set; }
    public string? StoragePath { get; set; }
    public string? ErrorMessage { get; set; }
    public User? RequestedByUser { get; set; }
}

public class StoredFile : BaseEntity
{
    public Guid? UploadedByUserId { get; set; }
    public string OriginalFileName { get; set; } = "";
    public string StoredFileName { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string StoragePath { get; set; } = "";
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public User? UploadedByUser { get; set; }
}
