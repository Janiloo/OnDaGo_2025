using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using OnDaGo.API.Hubs;
using OnDaGo.API.Services;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : ControllerBase
    {
        private readonly VehicleService _vehicleService;
        private readonly UserService _userService;
        private readonly StopArrivalService _stopArrivals;
        private readonly IHubContext<VehicleHub> _vehicleHub;

        public VehicleController(
            VehicleService vehicleService,
            UserService userService,
            StopArrivalService stopArrivals,
            IHubContext<VehicleHub> vehicleHub)
        {
            _vehicleService = vehicleService;
            _userService = userService;
            _stopArrivals = stopArrivals;
            _vehicleHub = vehicleHub;
        }

        /// <summary>Deactivated vehicles are an admin concept — commuter maps never see them.</summary>
        private static bool IsActive(VehicleModel v) => v.Status != "Inactive";

        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _vehicleService.GetVehiclesAsync();
            return Ok(vehicles.Where(IsActive));
        }

        /// <summary>
        /// Vehicles within <paramref name="radiusM"/> meters of a point.
        /// Served by the 2dsphere index — the scalable alternative to
        /// fetching the whole fleet as coverage grows beyond one route.
        /// </summary>
        [HttpGet("near")]
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
            return Ok(vehicles.Where(IsActive));
        }

        [HttpPatch("{puvNo}/status")]
        public async Task<IActionResult> UpdateVehicleStatus(string puvNo, [FromBody] VehicleStatusUpdateRequest request)
        {
            var vehicle = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (vehicle == null) return NotFound("Vehicle not found");
            if (!IsActive(vehicle)) return Conflict("This vehicle has been deactivated by your company admin.");

            // A disabled driver is blocked at login, but an already-open app would
            // keep broadcasting — reject here so disable takes effect promptly.
            var driver = await _userService.FindDriverByPlateAsync(puvNo);
            if (driver?.Status == "Disabled")
                return StatusCode(403, "This driver account has been disabled by your company admin.");

            // The vehicle's seat capacity is the occupancy ceiling everywhere —
            // clamp rather than reject so a stale driver app can't fail to
            // broadcast position just because its count is out of range.
            request.PassengerCount = Math.Max(0, vehicle.MaxPassengerCount > 0
                ? Math.Min(request.PassengerCount, vehicle.MaxPassengerCount)
                : request.PassengerCount);

            await _vehicleService.UpdateVehicleStatusAsync(puvNo, request);

            // Push the updated vehicle to the maps watching it (firehose + its
            // route group) instead of making every client poll. Re-read so the
            // payload carries the server-set LastUpdated timestamp.
            var updated = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (updated != null)
            {
                await SendToVehicleGroups(VehicleHub.VehicleUpdated, updated, updated.RouteId);
                // Historical-ETA groundwork: record terminal arrivals off the hot
                // path (fire-and-forget; ObserveAsync never throws).
                _ = _stopArrivals.ObserveAsync(updated);
            }

            return NoContent();
        }

        /// <summary>
        /// Fan a vehicle event out to the firehose group AND (if assigned) the
        /// vehicle's route group, so route-filtered commuters get only their
        /// route's traffic while "All routes" / admin still get everything.
        /// </summary>
        private async Task SendToVehicleGroups(string method, object payload, string? routeId)
        {
            await _vehicleHub.Clients.Group(VehicleHub.AllGroup).SendAsync(method, payload);
            if (!string.IsNullOrEmpty(routeId))
            {
                await _vehicleHub.Clients.Group(VehicleHub.RouteGroup(routeId)).SendAsync(method, payload);
            }
        }

        /// <summary>
        /// Driver ended their shift. Marks the vehicle offline (clears its
        /// last-broadcast timestamp so it reads as stale in GETs too) and pushes
        /// a "VehicleOffline" event so commuters drop the PUV instantly instead
        /// of waiting out the client-side staleness timeout.
        /// </summary>
        [HttpPost("{puvNo}/offline")]
        public async Task<IActionResult> GoOffline(string puvNo)
        {
            var vehicle = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (vehicle == null) return NotFound("Vehicle not found");

            await _vehicleService.SetVehicleOfflineAsync(puvNo);
            // Offline reaches the same groups the vehicle's live updates did, so a
            // route-filtered commuter still sees it drop (use its pre-offline route).
            await SendToVehicleGroups(VehicleHub.VehicleOffline, puvNo, vehicle.RouteId);

            return NoContent();
        }
    }

    public class VehicleStatusUpdateRequest
    {
        public int PassengerCount { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
