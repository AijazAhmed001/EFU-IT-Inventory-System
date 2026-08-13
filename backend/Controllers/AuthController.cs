using EFU.Inventory.Data;
using EFU.Inventory.DTOs;
using EFU.Inventory.Extensions;
using EFU.Inventory.Models;
using EFU.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        return Ok(new { success = true, data = Profile(user) });
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
        return Ok(new { success = true, data = Profile(user) });
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
        await db.SaveChangesAsync();

        return Ok(new { success = true, message = "Password changed" });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
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
        resetToken.UsedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true, message = "Password reset successful" });
    }

    private static object Profile(User user)
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
            user.EmailVerified
        };
    }
}
