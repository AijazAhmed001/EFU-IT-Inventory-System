using System.Security.Claims;
namespace EFU.Inventory.Extensions; public static class ClaimsExtensions{public static Guid UserId(this ClaimsPrincipal u)=>Guid.Parse(u.FindFirstValue(ClaimTypes.NameIdentifier)??throw new UnauthorizedAccessException());}
