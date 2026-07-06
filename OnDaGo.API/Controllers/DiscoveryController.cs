using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// The CROSS-TENANT commuter "discovery" layer. Unlike the company-scoped
    /// admin/operations endpoints, everything here reads across all companies
    /// (that's the commuter experience) and is deliberately NOT tenant-scoped.
    /// Keeping it in its own namespace draws a hard line between the two systems:
    ///   /api/discovery/*  → cross-tenant, read-only, public intelligence layer
    ///   (admin/operations) → tenant-scoped writes
    ///
    /// Phase 1 establishes the namespace; route/terminal filtering and
    /// company/verification enrichment arrive in later phases.
    /// </summary>
    [ApiController]
    [Route("api/discovery")]
    [Authorize]
    public class DiscoveryController : ControllerBase
    {
        private readonly VehicleService _vehicleService;
        private readonly TerminalService _terminalService;
        private readonly RouteService _routeService;
        private readonly CompanyService _companyService;

        public DiscoveryController(
            VehicleService vehicleService,
            TerminalService terminalService,
            RouteService routeService,
            CompanyService companyService)
        {
            _vehicleService = vehicleService;
            _terminalService = terminalService;
            _routeService = routeService;
            _companyService = companyService;
        }

        /// <summary>Commuter-facing operator branding (Tier 2): every Active+Verified
        /// company's name, logo, and brand color, for "Operated by X" UI.</summary>
        [HttpGet("companies")]
        public async Task<IActionResult> GetCompanies()
        {
            var companies = await _companyService.GetVerifiedCompaniesAsync();
            return Ok(companies.ConvertAll(c => new
            {
                id = c.Id,
                name = c.Name,
                logo = c.LogoDataUri ?? c.LogoUrl,
                brandColor = c.BrandColor,
            }));
        }

        /// <summary>All active vehicles across every company (default "All Vehicles" mode).</summary>
        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _vehicleService.GetVehiclesAsync();
            return Ok(vehicles);
        }

        /// <summary>Vehicles near a point, across companies — served by the 2dsphere index.</summary>
        [HttpGet("vehicles/near")]
        public async Task<IActionResult> GetVehiclesNear(
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double radiusM = 5000)
        {
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || radiusM <= 0 || radiusM > 100_000)
            {
                return BadRequest("Invalid coordinates or radius (max 100km).");
            }

            var vehicles = await _vehicleService.GetVehiclesNearAsync(lat, lng, radiusM);
            return Ok(vehicles);
        }

        /// <summary>All active terminals across every VERIFIED company (commuter map).</summary>
        [HttpGet("terminals")]
        public async Task<IActionResult> GetTerminals()
        {
            var terminals = await _terminalService.DiscoverAllAsync();
            return Ok(terminals);
        }

        /// <summary>Terminals near a point (Verified companies only) — 2dsphere index.</summary>
        [HttpGet("terminals/near")]
        public async Task<IActionResult> GetTerminalsNear(
            [FromQuery] double lat,
            [FromQuery] double lng,
            [FromQuery] double radiusM = 5000)
        {
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || radiusM <= 0 || radiusM > 100_000)
            {
                return BadRequest("Invalid coordinates or radius (max 100km).");
            }

            var terminals = await _terminalService.DiscoverNearAsync(lat, lng, radiusM);
            return Ok(terminals);
        }

        /// <summary>All active routes across every VERIFIED company (commuter route filter).</summary>
        [HttpGet("routes")]
        public async Task<IActionResult> GetRoutes()
        {
            var routes = await _routeService.DiscoverAllAsync();
            return Ok(routes);
        }

        /// <summary>A single route with its terminal stops resolved in order.</summary>
        [HttpGet("routes/{id}")]
        public async Task<IActionResult> GetRoute(string id)
        {
            var route = await _routeService.DiscoverByIdAsync(id);
            if (route == null) return NotFound();
            return Ok(route);
        }
    }
}
