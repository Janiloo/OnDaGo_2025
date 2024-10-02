using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
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

        public ReportsController(ReportService reportService)
        {
            _reportService = reportService;
        }

        // Get all reports (Admin side)
        [HttpGet]
        public async Task<ActionResult<List<ReportItem>>> GetReports()
        {
            var reports = await _reportService.GetReportsAsync();
            return Ok(reports);
        }

        // Get report by ID
        [HttpGet("{id}")]
        public async Task<ActionResult<ReportItem>> GetReportById(string id)
        {
            var report = await _reportService.GetReportByIdAsync(id);
            if (report == null) return NotFound();
            return Ok(report);
        }

        // Create a new report (User side)
        [HttpPost]
        public async Task<ActionResult> CreateReport([FromBody] ReportItem report)
        {
            // Automatically generate a new ObjectId for the report
            report.Id = ObjectId.GenerateNewId();
            await _reportService.CreateReportAsync(report);
            return CreatedAtAction(nameof(GetReportById), new { id = report.Id }, report);
        }

        // Update report status (Admin side)
        [HttpPatch("{id}/status")]
        public async Task<ActionResult> UpdateReportStatus(string id, [FromBody] string status)
        {
            await _reportService.UpdateReportStatusAsync(id, status);
            return NoContent();
        }

        // Soft delete report (Admin side)
        [HttpDelete("{id}")]
        public async Task<ActionResult> SoftDeleteReport(string id)
        {
            await _reportService.SoftDeleteReportAsync(id);
            return NoContent();
        }

        // Mark report as important (Admin side)
        [HttpPatch("{id}/important")]
        public async Task<ActionResult> MarkAsImportant(string id)
        {
            await _reportService.MarkAsImportantAsync(id);
            return NoContent();
        }

        // Mark report as completed (Admin side)
        [HttpPatch("{id}/completed")]
        public async Task<ActionResult> MarkAsCompleted(string id)
        {
            await _reportService.MarkAsCompletedAsync(id);
            return NoContent();
        }
    }
}
