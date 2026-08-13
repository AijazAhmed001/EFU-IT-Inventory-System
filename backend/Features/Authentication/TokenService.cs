using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EFU.Inventory.Models;
using Microsoft.IdentityModel.Tokens;

namespace EFU.Inventory.Services;

/// <summary>
/// Creates JWT access tokens and secure refresh/reset tokens.
/// Token lifetimes are controlled from appsettings.json.
/// </summary>
public class TokenService(IConfiguration configuration)
{
    public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(
            configuration.GetValue("Jwt:AccessTokenMinutes", 30));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var secret = configuration["Jwt:Secret"]!;
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (token, expiresAt);
    }

    public string RandomToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
    }

    public string Hash(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        return Convert.ToHexString(SHA256.HashData(bytes));
    }

    public DateTime RefreshExpiry()
    {
        var days = configuration.GetValue("Jwt:RefreshTokenDays", 7);
        return DateTime.UtcNow.AddDays(days);
    }
}
