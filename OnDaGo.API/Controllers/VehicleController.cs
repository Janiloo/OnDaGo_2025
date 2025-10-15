using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : ControllerBase
    {
        private readonly VehicleService _vehicleService;

        public VehicleController(VehicleService vehicleService)
        {
            _vehicleService = vehicleService;
        }

        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _vehicleService.GetVehiclesAsync();
            return Ok(vehicles);
        }

        [HttpPatch("{puvNo}/status")]
        public async Task<IActionResult> UpdateVehicleStatus(string puvNo, [FromBody] VehicleStatusUpdateRequest request)
        {
            var vehicle = await _vehicleService.GetVehicleByPuvAsync(puvNo);
            if (vehicle == null) return NotFound("Vehicle not found");

            await _vehicleService.UpdateVehicleStatusAsync(puvNo, request);

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
