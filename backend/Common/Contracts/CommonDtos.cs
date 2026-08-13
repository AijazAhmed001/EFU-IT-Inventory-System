using System.ComponentModel.DataAnnotations;

namespace EFU.Inventory.DTOs;

// Authentication requests
public record LoginRequest(
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128)] string Password);

public record RefreshRequest(
    [Required, StringLength(500)] string RefreshToken);

public record ForgotPasswordRequest(
    [Required, EmailAddress, StringLength(254)] string Email);

public record ResetPasswordRequest(
    [Required, StringLength(500)] string Token,
    [Required, StringLength(128, MinimumLength = 8)] string NewPassword);

public record ChangePasswordRequest(
    [Required, StringLength(128)] string CurrentPassword,
    [Required, StringLength(128, MinimumLength = 8)] string NewPassword);

public record UpdateProfileRequest(
    [StringLength(200)] string? Name,
    [StringLength(30)] string? Phone,
    [StringLength(100)] string? EmployeeCode,
    Guid? DepartmentId,
    Guid? LocationId);

// User administration request
public record CreateUserRequest(
    [Required, StringLength(200)] string Name,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Required, StringLength(128, MinimumLength = 8)] string Password,
    [Required, StringLength(50)] string Role);

// Asset request
public record CreateAssetRequest(
    [Required] Guid AssetTypeId,
    Guid? AssetMakeId,
    [Required, StringLength(200)] string Model,
    Guid? MotherboardId,
    Guid? MemoryId,
    Guid? StorageId,
    Guid? OperatingSystemId,
    [StringLength(2000)] string? Accessories,
    [Required, StringLength(100)] string SerialNumber,
    Guid? VendorId,
    [Required] DateTime PurchaseDate,
    [Range(0, double.MaxValue)] decimal PurchaseCost,
    DateTime? AddingDate,
    Guid? LocationId,
    [StringLength(100)] string? AssetTag = null,
    [StringLength(100)] string? Condition = null,
    [StringLength(2000)] string? AdditionalNotes = null,
    [StringLength(100)] string? PurchaseOrderNumber = null,
    [StringLength(100)] string? InvoiceNumber = null,
    [StringLength(100)] string? MacAddress = null,
    [StringLength(100)] string? IpAddress = null,
    [StringLength(100)] string? Hostname = null,
    [StringLength(200)] string? Domain = null,
    [StringLength(100)] string? BiosVersion = null,
    [StringLength(200)] string? GpuModel = null);

// Asset lifecycle requests
public record AllocateRequest(
    [Required] Guid AssetId,
    [Required] Guid EmployeeId,
    [Required] DateTime AllocationDate,
    Guid? LocationId,
    [StringLength(2000)] string? Remarks);

public record RevokeRequest(
    [Required] Guid AssetId,
    [Required, StringLength(2000)] string Reason,
    [StringLength(100)] string? Condition,
    [StringLength(2000)] string? Remarks,
    [Required] DateTime RevocationDate);

public record RetireRequest(
    [Required] Guid AssetId,
    [StringLength(200)] string? CurrentOwner,
    [Required, StringLength(2000)] string Reason,
    [StringLength(100)] string? Condition,
    [Required, StringLength(100)] string EndOfLifeAction,
    decimal? SalvageValue,
    [StringLength(200)] string? DisposalLocation,
    [StringLength(2000)] string? Remarks,
    [Required] DateTime ExpirationDate);
