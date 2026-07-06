using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Company-scoped driver management — the WRITE surface for the web admin
    /// console (Tier 1). Drivers are UserItems with Role == "Driver"; the
    /// driver↔vehicle link is PlateNumber ↔ PuvNo, which is what the driver
    /// mobile app already broadcasts with, so nothing mobile-side changes.
    /// Passwords are server-generated temporaries shown once to the admin.
    /// </summary>
    [ApiController]
    [Route("api/admin/drivers")]
    [Authorize(Roles = "Admin")]
    public class DriversController : ControllerBase
    {
        private readonly UserService _users;
        private readonly TenantCollection<VehicleModel> _vehicles;
        private readonly TenantContext _tenant;

        public DriversController(UserService users, TenantCollection<VehicleModel> vehicles, TenantContext tenant)
        {
            _users = users;
            _vehicles = vehicles;
            _tenant = tenant;
        }

        public class CreateDriverRequest
        {
            [Required, StringLength(120, MinimumLength = 1)]
            public string Name { get; set; } = "";

            [Required, EmailAddress]
            public string Email { get; set; } = "";

            [StringLength(32)]
            public string? PhoneNumber { get; set; }

            /// <summary>Optional vehicle to assign at creation (must be the company's).</summary>
            public string? PuvNo { get; set; }
        }

        public class UpdateDriverRequest
        {
            [Required, StringLength(120, MinimumLength = 1)]
            public string Name { get; set; } = "";

            [StringLength(32)]
            public string? PhoneNumber { get; set; }
        }

        public class DriverStatusRequest
        {
            /// <summary>"Active" | "Disabled".</summary>
            [Required]
            public string Status { get; set; } = "";
        }

        public class AssignVehicleRequest
        {
            /// <summary>Vehicle to hand to this driver; null/empty clears the assignment.</summary>
            public string? PuvNo { get; set; }
        }

        /// <summary>The company's driver roster, with each driver's vehicle's last
        /// broadcast so the console can derive on-duty/off-duty.</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var drivers = await _users.GetDriversAsync(_tenant.EffectiveCompanyId, _tenant.SingleCompanyTransition);
            var vehicles = await _vehicles.FindAsync();
            var byPuv = vehicles.ToDictionary(v => v.PuvNo, v => v);

            var list = drivers
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => ToDto(d, d.PlateNumber != null && byPuv.TryGetValue(d.PlateNumber, out var v) ? v : null));
            return Ok(list);
        }

        /// <summary>Creates a driver in the caller's company with a one-time temporary
        /// password (returned once, never stored readable).</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDriverRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var email = body.Email.Trim().ToLowerInvariant();
            if (await _users.FindByEmailAsync(email) != null)
                return Conflict("A user with this email already exists.");

            string? plate = null;
            if (!string.IsNullOrWhiteSpace(body.PuvNo))
            {
                plate = body.PuvNo.Trim();
                var problem = await ValidateAssignableAsync(plate, excludeDriverId: null);
                if (problem != null) return problem;
            }

            var tempPassword = GenerateTempPassword();
            var driver = new UserItem
            {
                Name = body.Name.Trim(),
                Email = email,
                PasswordHash = UserService.HashPassword(tempPassword),
                PhoneNumber = body.PhoneNumber?.Trim() ?? "",
                Role = "Driver",
                CompanyId = _tenant.EffectiveCompanyId,
                PlateNumber = plate,
                Status = "Active",
                // Drivers use the mobile app, which has no forced-change screen;
                // the temp password works as-is and can be changed via forgot-password.
                MustChangePassword = false,
            };
            await _users.CreateUserAsync(driver);

            return Ok(new { driver = ToDto(driver, null), temporaryPassword = tempPassword });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateDriverRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var driver = await FindOwnedDriverAsync(id);
            if (driver == null) return NotFound("Driver not found in your company.");

            await _users.UpdateDriverProfileAsync(driver.Id, body.Name.Trim(), body.PhoneNumber?.Trim() ?? "");
            return Ok(new { id, name = body.Name.Trim(), phoneNumber = body.PhoneNumber?.Trim() ?? "" });
        }

        /// <summary>Enable or disable a driver. Disabled drivers cannot log in and
        /// their vehicle broadcasts are rejected.</summary>
        [HttpPost("{id}/status")]
        public async Task<IActionResult> SetStatus(string id, [FromBody] DriverStatusRequest body)
        {
            if (body == null || (body.Status != "Active" && body.Status != "Disabled"))
                return BadRequest("status must be Active or Disabled.");

            var driver = await FindOwnedDriverAsync(id);
            if (driver == null) return NotFound("Driver not found in your company.");

            await _users.SetUserStatusAsync(driver.Id, body.Status);
            return Ok(new { id, status = body.Status });
        }

        /// <summary>Issues a fresh temporary password for a driver (shown once).</summary>
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(string id)
        {
            var driver = await FindOwnedDriverAsync(id);
            if (driver == null) return NotFound("Driver not found in your company.");

            var tempPassword = GenerateTempPassword();
            // No must-change gate for drivers — see Create.
            await _users.SetPasswordAndClearMustChangeAsync(driver.Email, UserService.HashPassword(tempPassword));
            return Ok(new { id, email = driver.Email, temporaryPassword = tempPassword });
        }

        /// <summary>Assigns a vehicle to a driver (or clears it). The vehicle must be
        /// the company's and not already held by another driver.</summary>
        [HttpPut("{id}/vehicle")]
        public async Task<IActionResult> AssignVehicle(string id, [FromBody] AssignVehicleRequest body)
        {
            var driver = await FindOwnedDriverAsync(id);
            if (driver == null) return NotFound("Driver not found in your company.");

            string? plate = string.IsNullOrWhiteSpace(body?.PuvNo) ? null : body!.PuvNo!.Trim();
            if (plate != null)
            {
                var problem = await ValidateAssignableAsync(plate, excludeDriverId: driver.Id);
                if (problem != null) return problem;
            }

            await _users.SetPlateNumberAsync(driver.Id, plate);
            return Ok(new { id, puvNo = plate });
        }

        // --- helpers ---------------------------------------------------------

        /// <summary>The driver exists, is a driver, and belongs to the caller's
        /// company (legacy unstamped drivers count during the single-company
        /// transition, mirroring TenantCollection).</summary>
        private async Task<UserItem?> FindOwnedDriverAsync(string id)
        {
            if (!ObjectId.TryParse(id, out _)) return null;
            var user = await _users.FindByIdAsync(id);
            if (user == null || user.Role != "Driver") return null;

            var company = _tenant.EffectiveCompanyId;
            if (company == null) return user; // pre-bootstrap: unscoped
            if (user.CompanyId == company) return user;
            if (user.CompanyId == null && _tenant.SingleCompanyTransition) return user;
            return null;
        }

        /// <summary>Vehicle is the company's and no other driver holds it; returns
        /// the error result to send, or null when assignable.</summary>
        private async Task<IActionResult?> ValidateAssignableAsync(string plate, ObjectId? excludeDriverId)
        {
            var vehicle = await _vehicles.FindOneAsync(Builders<VehicleModel>.Filter.Eq(v => v.PuvNo, plate));
            if (vehicle == null) return NotFound("Vehicle not found in your company.");

            var holder = await _users.FindDriverByPlateAsync(plate);
            if (holder != null && holder.Id != excludeDriverId)
                return Conflict($"Vehicle {plate} is already assigned to driver '{holder.Name}'.");
            return null;
        }

        private static object ToDto(UserItem d, VehicleModel? vehicle) => new
        {
            id = d.Id.ToString(),
            name = d.Name,
            email = d.Email,
            phoneNumber = d.PhoneNumber,
            status = string.IsNullOrEmpty(d.Status) ? "Active" : d.Status,
            puvNo = d.PlateNumber,
            createdAt = d.CreatedAt,
            // Duty = recorded intent (shift state); vehicleLastUpdated = connection
            // health. Together they give the console the honest tri-state:
            // on duty · live / on duty · signal lost / off duty.
            dutyStatus = vehicle?.DutyStatus == "OnDuty" ? "OnDuty" : "OffDuty",
            dutyStartedAt = vehicle?.DutyStatus == "OnDuty" ? vehicle.DutyStartedAt : null,
            vehicleLastUpdated = vehicle?.LastUpdated,
        };

        /// <summary>Readable temp password (no ambiguous chars), same shape as the
        /// company-admin ones from PlatformController.</summary>
        private static string GenerateTempPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            var sb = new StringBuilder("Ond-");
            for (var i = 0; i < 8; i++) sb.Append(chars[RandomNumberGenerator.GetInt32(chars.Length)]);
            return sb.ToString();
        }
    }
}
