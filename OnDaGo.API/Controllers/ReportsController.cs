using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using OnDaGo.API.Hubs;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly ReportService _reportService;
        private readonly UserService _userService;
        private readonly CompanyService _companyService;
        private readonly VehicleService _vehicleService;
        private readonly IHubContext<ReportHub> _hub;

        public ReportsController(
            ReportService reportService,
            UserService userService,
            CompanyService companyService,
            VehicleService vehicleService,
            IHubContext<ReportHub> hub)
        {
            _reportService = reportService;
            _userService = userService;
            _companyService = companyService;
            _vehicleService = vehicleService;
            _hub = hub;
        }

        // View reports — admin console only.
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<List<ReportItem>>> GetReports()
        {
            var reports = await _reportService.GetReportsAsync();
            return Ok(reports);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ReportItem>> GetReportById(string id)
        {
            var report = await _reportService.GetReportByIdAsync(id);
            if (report == null) return NotFound();
            return Ok(report);
        }

        // Submit a report — any signed-in user (commuter/driver). The report is
        // attributed to the operator it CONCERNS, not to the caller's own company:
        //  - Driver: server stamps the driver's own company + their assigned
        //    vehicle. The client cannot spoof another company (tenant isolation).
        //  - Commuter: the bus company is REQUIRED and taken from the form (the
        //    commuter has no company of their own); the server validates it.
        [HttpPost]
        [Authorize]
        public async Task<ActionResult> CreateReport([FromBody] CreateReportDto reportDto)
        {
            if (string.IsNullOrWhiteSpace(reportDto.Subject) || string.IsNullOrWhiteSpace(reportDto.Description))
                return BadRequest("Subject and description are required.");

            var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var caller = string.IsNullOrEmpty(callerId) ? null : await _userService.FindByIdAsync(callerId);
            var isDriver = callerRole == "Driver";

            string? companyId;
            string? plate;

            if (isDriver)
            {
                // Driver reports are auto-associated with the driver's own company
                // and assigned vehicle — the form supplies none of this.
                companyId = caller?.CompanyId ?? User.FindFirst("companyId")?.Value;
                plate = caller?.PlateNumber;
                if (string.IsNullOrEmpty(companyId))
                    return BadRequest("Your driver account is not linked to a company; contact your admin.");
            }
            else
            {
                // Commuter reports must name the bus company they concern.
                companyId = reportDto.CompanyId?.Trim();
                if (string.IsNullOrEmpty(companyId))
                    return BadRequest("Please select the bus company this report is about.");
                if (await _companyService.GetByIdAsync(companyId) == null)
                    return BadRequest("The selected bus company was not found.");
                plate = string.IsNullOrWhiteSpace(reportDto.PlateNumber) ? null : reportDto.PlateNumber.Trim();
            }

            // Link the plate to a real vehicle when it belongs to the owning company.
            string? vehicleId = null;
            if (!string.IsNullOrEmpty(plate))
            {
                var vehicle = await _vehicleService.GetVehicleByPuvAsync(plate);
                if (vehicle != null && vehicle.CompanyId == companyId) vehicleId = vehicle.Id;
            }

            var report = new ReportItem
            {
                UserId = reportDto.UserId ?? callerId,
                CompanyId = companyId,
                ReporterRole = isDriver ? "Driver" : "Commuter",
                ReporterName = caller?.Name,
                PlateNumber = plate,
                VehicleId = vehicleId,
                Subject = reportDto.Subject!.Trim(),
                Description = reportDto.Description!.Trim(),
                IncidentAt = isDriver ? null : reportDto.IncidentAt,
                IncidentLocation = isDriver ? null : (string.IsNullOrWhiteSpace(reportDto.IncidentLocation) ? null : reportDto.IncidentLocation.Trim()),
                Status = string.IsNullOrWhiteSpace(reportDto.Status) ? "Pending" : reportDto.Status,
                IsImportant = reportDto.IsImportant,
                CreatedAt = DateTime.UtcNow,
                DeletedAt = null
            };

            await _reportService.SubmitAsync(report); // explicit CompanyId, raw insert
            // Surface the new report on admin consoles in real time.
            await _hub.Clients.All.SendAsync(ReportHub.ReportUpdated, report);
            return CreatedAtAction(nameof(GetReportById), new { id = report.Id }, report);
        }

        // ----- Admin actions (all Admin-only, all broadcast the result) -----

        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> UpdateReportStatus(string id, [FromBody] UpdateReportStatusDto dto)
        {
            var updated = await _reportService.UpdateReportStatusAsync(id, dto.Status);
            if (updated == null) return NotFound();
            await _hub.Clients.All.SendAsync(ReportHub.ReportUpdated, updated);
            return Ok(updated);
        }

        // Mark a report important or not (body: { "isImportant": true|false }).
        [HttpPatch("{id}/important")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> SetImportant(string id, [FromBody] SetImportantDto dto)
        {
            var updated = await _reportService.SetImportantAsync(id, dto.IsImportant);
            if (updated == null) return NotFound();
            await _hub.Clients.All.SendAsync(ReportHub.ReportUpdated, updated);
            return Ok(updated);
        }

        [HttpPatch("{id}/completed")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> MarkAsCompleted(string id)
        {
            var updated = await _reportService.MarkAsCompletedAsync(id);
            if (updated == null) return NotFound();
            await _hub.Clients.All.SendAsync(ReportHub.ReportUpdated, updated);
            return Ok(updated);
        }

        // Soft delete: hidden from all queries but retained for audit history.
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> SoftDeleteReport(string id)
        {
            var deleted = await _reportService.SoftDeleteReportAsync(id);
            if (!deleted) return NotFound();
            await _hub.Clients.All.SendAsync(ReportHub.ReportDeleted, id);
            return NoContent();
        }
    }
}
