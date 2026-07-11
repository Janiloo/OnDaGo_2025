using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using OnDaGo.API.Services;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Company-scoped vehicle management — the WRITE surface for the web admin
    /// console (Tier 1). Creating a vehicle no longer requires registering a
    /// driver; activate/deactivate hides a vehicle from commuter feeds and
    /// rejects its broadcasts. Route assignment stays in RoutesController
    /// (PUT /api/admin/vehicles/{puvNo}/route); driver assignment in
    /// DriversController (PUT /api/admin/drivers/{id}/vehicle).
    /// </summary>
    [ApiController]
    [Route("api/admin/vehicles")]
    [Authorize(Roles = "Admin")]
    public class AdminVehiclesController : ControllerBase
    {
        private readonly TenantCollection<VehicleModel> _vehicles;
        private readonly VehicleService _vehicleService;

        public AdminVehiclesController(TenantCollection<VehicleModel> vehicles, VehicleService vehicleService)
        {
            _vehicles = vehicles;
            _vehicleService = vehicleService;
        }

        public class CreateVehicleRequest
        {
            [Required, StringLength(32, MinimumLength = 1)]
            public string PuvNo { get; set; } = "";

            /// <summary>Seat capacity — required; there is no standard PUV size
            /// (jeepneys ~18, coasters ~25-30).</summary>
            [Required, Range(1, 200)]
            public int? MaxPassengerCount { get; set; }
        }

        public class CapacityRequest
        {
            [Required, Range(1, 200)]
            public int? MaxPassengerCount { get; set; }
        }

        public class VehicleStatusRequest
        {
            /// <summary>"Active" | "Inactive".</summary>
            [Required]
            public string Status { get; set; } = "";
        }

        /// <summary>The company's fleet, including deactivated vehicles (admins see
        /// everything; commuter feeds filter Inactive out).</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var vehicles = await _vehicles.FindAsync();
            return Ok(vehicles.OrderBy(v => v.PuvNo));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVehicleRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var puvNo = body.PuvNo.Trim();
            // Plates are globally unique (ux_puv_no) — check across companies so the
            // insert can't blow up on the index.
            if (await _vehicleService.GetVehicleByPuvAsync(puvNo) != null)
                return Conflict($"A vehicle with PUV number '{puvNo}' already exists.");

            var vehicle = new VehicleModel
            {
                PuvNo = puvNo,
                MaxPassengerCount = body.MaxPassengerCount!.Value,
                PassengerCount = 0,
                CurrentLat = 0,
                CurrentLong = 0,
                Status = "Active",
            };
            await _vehicles.InsertAsync(vehicle); // stamps CompanyId

            return CreatedAtAction(nameof(GetAll), new { id = vehicle.Id }, vehicle);
        }

        /// <summary>Change a vehicle's seat capacity. Occupancy displays, ETA seat
        /// counts, and broadcast clamping all key off this value.</summary>
        [HttpPut("{puvNo}/capacity")]
        public async Task<IActionResult> SetCapacity(string puvNo, [FromBody] CapacityRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var filter = Builders<VehicleModel>.Filter.Eq(v => v.PuvNo, puvNo);
            var update = Builders<VehicleModel>.Update.Set(v => v.MaxPassengerCount, body.MaxPassengerCount!.Value);
            var result = await _vehicles.UpdateOneAsync(filter, update);
            if (result.MatchedCount == 0) return NotFound("Vehicle not found in your company.");

            return Ok(new { puvNo, maxPassengerCount = body.MaxPassengerCount.Value });
        }

        /// <summary>Activate or deactivate a vehicle.</summary>
        [HttpPost("{puvNo}/status")]
        public async Task<IActionResult> SetStatus(string puvNo, [FromBody] VehicleStatusRequest body)
        {
            if (body == null || (body.Status != "Active" && body.Status != "Inactive"))
                return BadRequest("status must be Active or Inactive.");

            var filter = Builders<VehicleModel>.Filter.Eq(v => v.PuvNo, puvNo);
            var update = Builders<VehicleModel>.Update.Set(v => v.Status, body.Status);
            var result = await _vehicles.UpdateOneAsync(filter, update);
            if (result.MatchedCount == 0) return NotFound("Vehicle not found in your company.");

            return Ok(new { puvNo, status = body.Status });
        }
    }
}
