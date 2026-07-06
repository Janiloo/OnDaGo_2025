using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Company-scoped route management — the WRITE surface for the web admin
    /// console. Routes chain the company's own terminals; every action is scoped
    /// so an admin can only touch their own company. Also owns vehicle→route
    /// assignment (a vehicle can only be pinned to a route within the same company).
    /// Commuter (cross-tenant, read-only) route views live under /api/discovery.
    /// </summary>
    [ApiController]
    [Route("api/admin/routes")]
    [Authorize(Roles = "Admin")]
    public class RoutesController : ControllerBase
    {
        private readonly RouteService _routes;

        public RoutesController(RouteService routes)
        {
            _routes = routes;
        }

        public class RouteRequest
        {
            [Required, StringLength(120, MinimumLength = 1)]
            public string Name { get; set; } = "";

            [StringLength(32)]
            public string? Code { get; set; }

            /// <summary>Ordered terminal ids (origin → destination), at least two.</summary>
            [Required, MinLength(2)]
            public List<string> TerminalIds { get; set; } = new();
        }

        public class AssignVehicleRequest
        {
            /// <summary>Route to pin the vehicle to; null/empty clears the assignment.</summary>
            public string? RouteId { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var routes = await _routes.GetForCompanyAsync();
            return Ok(routes);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RouteRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!await _routes.TerminalsOwnedByCompanyAsync(body.TerminalIds))
                return BadRequest("Route must chain at least two distinct terminals that all belong to your company.");

            var created = await _routes.CreateAsync(body.Name.Trim(), body.Code, body.TerminalIds);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] RouteRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!await _routes.TerminalsOwnedByCompanyAsync(body.TerminalIds))
                return BadRequest("Route must chain at least two distinct terminals that all belong to your company.");

            var updated = await _routes.UpdateAsync(id, body.Name.Trim(), body.Code, body.TerminalIds);
            if (updated == null) return NotFound("Route not found in your company.");
            return Ok(updated);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var ok = await _routes.RetireAsync(id);
            if (!ok) return NotFound("Route not found in your company.");
            return NoContent();
        }

        /// <summary>Assign a vehicle to a route (or clear it). Both must be in your company.</summary>
        [HttpPut("~/api/admin/vehicles/{puvNo}/route")]
        public async Task<IActionResult> AssignVehicle(string puvNo, [FromBody] AssignVehicleRequest body)
        {
            var result = await _routes.AssignVehicleAsync(puvNo, body?.RouteId);
            return result switch
            {
                RouteService.AssignResult.RouteNotFound => NotFound("Route not found in your company."),
                RouteService.AssignResult.VehicleNotFound => NotFound("Vehicle not found in your company."),
                _ => Ok(new { puvNo, routeId = string.IsNullOrEmpty(body?.RouteId) ? null : body!.RouteId }),
            };
        }
    }
}
