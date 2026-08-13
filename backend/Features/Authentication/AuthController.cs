using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;

namespace EFU.Inventory.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    AuthService authService,
    TokenService tokenService,
    IEmailService emailService) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var result = await authService.Login(email, request.Password);

        if (result is null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid email or password"
            });
        }

        return Ok(new { success = true, data = result });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-refresh")]
    public async Task<IActionResult> Refresh(RefreshRequest request)
    {
        var result = await authService.Refresh(request.RefreshToken);

        if (result is null)
        {
            return Unauthorized(new
            {
                success = false,
                message = "Invalid or expired refresh token"
            });
        }

        return Ok(new { success = true, data = result });
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshRequest request)
    {
        var tokenHash = tokenService.Hash(request.RefreshToken);
        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(item => item.TokenHash == tokenHash);

        if (token is not null)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await db.Users
            .Include(item => item.Department)
            .Include(item => item.Location)
            .FirstOrDefaultAsync(item => item.Id == User.UserId())
            ?? throw new KeyNotFoundException("User not found");

        var permissions = user.Role == Roles.SuperAdmin
            ? EFU.Inventory.Authorization.Permissions.All
            : user.Role == Roles.Viewer
                ? EFU.Inventory.Authorization.Permissions.Catalog
                    .Where(item => item.Code is EFU.Inventory.Authorization.Permissions.DashboardView or EFU.Inventory.Authorization.Permissions.AssetsView or EFU.Inventory.Authorization.Permissions.ReportsInventoryView ||
                        item.Code.StartsWith("master.") && item.Code.EndsWith(".view"))
                    .Select(item => item.Code).ToArray()
                : await db.UserPermissions.AsNoTracking()
                    .Where(item => item.UserId == user.Id && item.IsGranted && item.RevokedAt == null)
                    .Select(item => item.Permission!.Code).OrderBy(code => code).ToListAsync();

        return Ok(new { success = true, data = Profile(user, permissions) });
    }

    [HttpPatch("me")]
    [Authorize]
    public async Task<IActionResult> Update(UpdateProfileRequest request)
    {
        var user = await db.Users
            .Include(item => item.Department)
            .Include(item => item.Location)
            .FirstOrDefaultAsync(item => item.Id == User.UserId())
            ?? throw new KeyNotFoundException("User not found");

        if (request.Name is not null)
        {
            user.Name = request.Name;
        }

        if (request.Phone is not null)
        {
            user.Phone = request.Phone;
        }

        if (request.EmployeeCode is not null)
        {
            user.EmployeeCode = request.EmployeeCode;
        }

        user.DepartmentId = request.DepartmentId ?? user.DepartmentId;
        user.LocationId = request.LocationId ?? user.LocationId;

        await db.SaveChangesAsync();
        return Ok(new { success = true, data = Profile(user, Array.Empty<string>()) });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> Change(ChangePasswordRequest request)
    {
        var user = await db.Users.FindAsync(User.UserId())
            ?? throw new KeyNotFoundException("User not found");

        var passwordIsCorrect = BCrypt.Net.BCrypt.Verify(
            request.CurrentPassword,
            user.PasswordHash);

        if (!passwordIsCorrect)
        {
            return BadRequest(new
            {
                success = false,
                message = "Current password is incorrect"
            });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordChangedAt = DateTime.UtcNow;
        await RevokeUserTokens(user.Id);
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Password changed" });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-recovery")]
    public async Task<IActionResult> Forgot(ForgotPasswordRequest request)
    {
        var user = await db.Users.FirstOrDefaultAsync(
            item => item.Email == request.Email);

        if (user is not null)
        {
            var rawToken = tokenService.RandomToken();

            db.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id,
                TokenHash = tokenService.Hash(rawToken),
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            });

            await db.SaveChangesAsync();

            if (emailService.IsConfigured)
            {
                await emailService.SendPasswordResetAsync(user.Email, rawToken);
            }

            var isDevelopment = Environment.GetEnvironmentVariable(
                "ASPNETCORE_ENVIRONMENT") == "Development";

            if (isDevelopment && !emailService.IsConfigured)
            {
                return Ok(new
                {
                    success = true,
                    message = "Reset token created (development only)",
                    data = new { resetToken = rawToken }
                });
            }
        }

        return Ok(new
        {
            success = true,
            message = "If the account exists, a reset link will be sent."
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting("auth-recovery")]
    public async Task<IActionResult> Reset(ResetPasswordRequest request)
    {
        var tokenHash = tokenService.Hash(request.Token);

        var resetToken = await db.PasswordResetTokens.FirstOrDefaultAsync(item =>
            item.TokenHash == tokenHash &&
            item.UsedAt == null &&
            item.ExpiresAt > DateTime.UtcNow);

        if (resetToken is null)
        {
            return BadRequest(new
            {
                success = false,
                message = "Invalid or expired reset token"
            });
        }

        var user = await db.Users.FindAsync(resetToken.UserId)
            ?? throw new KeyNotFoundException("User not found");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.PasswordChangedAt = DateTime.UtcNow;
        resetToken.UsedAt = DateTime.UtcNow;
        await RevokeUserTokens(user.Id);

        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Password reset successful" });
    }

    [HttpPost("logout-all")]
    [Authorize]
    public async Task<IActionResult> LogoutAll()
    {
        await RevokeUserTokens(User.UserId());
        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "All sessions have been revoked." });
    }

    private async Task RevokeUserTokens(Guid userId)
    {
        var now = DateTime.UtcNow;
        var tokens = await db.RefreshTokens
            .Where(item => item.UserId == userId && item.RevokedAt == null)
            .ToListAsync();
        foreach (var token in tokens) token.RevokedAt = now;
    }

    private static object Profile(User user, IEnumerable<string> permissions)
    {
        return new
        {
            user.Id,
            user.Name,
            user.Email,
            user.EmployeeCode,
            user.Phone,
            user.Role,
            user.Status,
            user.DepartmentId,
            user.LocationId,
            Department = user.Department?.Name,
            Location = user.Location?.Name,
            user.LastLoginAt,
            user.EmailVerified,
            permissions
        };
    }
}
