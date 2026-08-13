using EFU.Inventory.Services; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc;
using EFU.Inventory.Authorization;
namespace EFU.Inventory.Controllers; [ApiController,Route("api/dashboard"),Authorize] public class DashboardController(DashboardService s):ControllerBase{[HttpGet,HasPermission(Permissions.DashboardView)]public async Task<IActionResult> Get()=>Ok(new{success=true,data=await s.Get()});}
