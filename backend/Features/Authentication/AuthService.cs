using EFU.Inventory.Data;
using EFU.Inventory.Models;
using Microsoft.EntityFrameworkCore;

namespace EFU.Inventory.Services;

/// <summary>
/// Handles login and refresh-token rotation.
/// </summary>
public class AuthService(
    AppDbContext db,
    TokenService tokenService)
{
    public async Task<object?> Login(string email, string password)
    {
        var user = await db.Users.FirstOrDefaultAsync(item =>
            item.Email == email && item.Status == "ACTIVE");

        if (user is null ||
            !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            return null;
        }

        user.LastLoginAt = DateTime.UtcNow;

        var (accessToken, expiresAt) = tokenService.CreateAccessToken(user);
        var refreshToken = tokenService.RandomToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = tokenService.Hash(refreshToken),
            ExpiresAt = tokenService.RefreshExpiry()
        });

        await db.SaveChangesAsync();

        return new
        {
            accessToken,
            refreshToken,
            expiresAt,
            user = new
            {
                user.Id,
                user.Name,
                user.Email,
                user.Role,
                user.Status,
                user.EmployeeCode,
                user.Phone
            }
        };
    }

    public async Task<object?> Refresh(string rawRefreshToken)
    {
        var tokenHash = tokenService.Hash(rawRefreshToken);

        var storedToken = await db.RefreshTokens
            .Include(item => item.User)
            .FirstOrDefaultAsync(item =>
                item.TokenHash == tokenHash &&
                item.RevokedAt == null &&
                item.ExpiresAt > DateTime.UtcNow);

        if (storedToken?.User is null || storedToken.User.Status != RecordStatuses.Active)
        {
            return null;
        }

        // Rotate the refresh token: revoke the old one and create a new one.
        storedToken.RevokedAt = DateTime.UtcNow;

        var (accessToken, expiresAt) =
            tokenService.CreateAccessToken(storedToken.User);
        var nextRefreshToken = tokenService.RandomToken();

        var replacement = new RefreshToken
        {
            UserId = storedToken.UserId,
            TokenHash = tokenService.Hash(nextRefreshToken),
            ExpiresAt = tokenService.RefreshExpiry()
        };
        storedToken.ReplacedByTokenHash = replacement.TokenHash;
        db.RefreshTokens.Add(replacement);

        await db.SaveChangesAsync();

        return new
        {
            accessToken,
            refreshToken = nextRefreshToken,
            expiresAt
        };
    }
}
