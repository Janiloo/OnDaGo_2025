using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using OnDaGo.API.Hubs;
using OnDaGo.API.Services;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : ControllerBase
    {
        private readonly VehicleService _vehicleService;
        private readonly IHubContext<VehicleHub> _vehicleHub;

        public VehicleController(VehicleService vehicleService, IHubContext<VehicleHub> vehicleHub)
        {
            _vehicleService = vehicleService;
            _vehicleHub = vehicleHub;
        }

        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _vehicleService.GetVehiclesAsync();
            return Ok(vehicles);
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
            return Ok(vehicles);
        }

        [HttpPatch("{puvNo}/status")]
        public async Task<IActionResult> UpdateVehicleStatus(string puvNo, [FromBody] VehicleStatusUpdateRequest request)
        {
            var vehicle = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (vehicle == null) return NotFound("Vehicle not found");

            await _vehicleService.UpdateVehicleStatusAsync(puvNo, request);

            // Push the updated vehicle to every connected map instead of
            // making every client poll. Re-read so the payload carries the
            // server-set LastUpdated timestamp.
            var updated = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (updated != null)
            {
                await _vehicleHub.Clients.All.SendAsync(VehicleHub.VehicleUpdated, updated);
            }

            return NoContent();
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
            await _vehicleHub.Clients.All.SendAsync(VehicleHub.VehicleOffline, puvNo);

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
