using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services; // Assuming the service is in the OnDaGo.API.Services namespace
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

        // GET: api/vehicles
        [HttpGet]
        public async Task<IActionResult> GetVehicles()
        {
            var vehicles = await _vehicleService.GetVehiclesAsync();
            return Ok(vehicles);
        }

        // GET: api/vehicles/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetVehicleById(string id)
        {
            var vehicle = await _vehicleService.GetVehicleByIdAsync(id);

            if (vehicle == null)
            {
                return NotFound();
            }

            return Ok(vehicle);
        }

        // POST: api/vehicles
        [HttpPost]
        public async Task<IActionResult> CreateVehicle([FromBody] VehicleModel newVehicle)
        {
            await _vehicleService.CreateVehicleAsync(newVehicle);
            return CreatedAtAction(nameof(GetVehicleById), new { id = newVehicle.Id }, newVehicle);
        }

        // PUT: api/vehicles/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateVehicle(string id, [FromBody] VehicleModel updatedVehicle)
        {
            var existingVehicle = await _vehicleService.GetVehicleByIdAsync(id);

            if (existingVehicle == null)
            {
                return NotFound();
            }

            await _vehicleService.UpdateVehicleAsync(id, updatedVehicle);
            return NoContent();
        }

        // DELETE: api/vehicles/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVehicle(string id)
        {
            var existingVehicle = await _vehicleService.GetVehicleByIdAsync(id);

            if (existingVehicle == null)
            {
                return NotFound();
            }

            await _vehicleService.DeleteVehicleAsync(id);
            return NoContent();
        }
    }
}
