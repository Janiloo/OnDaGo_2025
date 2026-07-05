using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using OnDaGo.API.Hubs;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly ReportService _reportService;
        private readonly IHubContext<ReportHub> _hub;

        public ReportsController(ReportService reportService, IHubContext<ReportHub> hub)
        {
            _reportService = reportService;
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

        // Submit a report — any signed-in user (commuter/driver).
        [HttpPost]
        [Authorize]
        public async Task<ActionResult> CreateReport([FromBody] CreateReportDto reportDto)
        {
            var report = new ReportItem
            {
                UserId = reportDto.UserId,
                Subject = reportDto.Subject,
                Description = reportDto.Description,
                Status = string.IsNullOrWhiteSpace(reportDto.Status) ? "Pending" : reportDto.Status,
                IsImportant = reportDto.IsImportant,
                CreatedAt = DateTime.UtcNow,
                DeletedAt = null
            };

            await _reportService.CreateReportAsync(report);
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
