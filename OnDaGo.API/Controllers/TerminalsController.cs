using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Company-scoped terminal management — the WRITE surface, for the web admin
    /// console. Every action runs through the tenant-scoped repository, so an
    /// admin can only see or change terminals belonging to their own company.
    /// The commuter (cross-tenant, read-only) view lives under /api/discovery.
    /// </summary>
    [ApiController]
    [Route("api/admin/terminals")]
    [Authorize(Roles = "Admin")]
    public class TerminalsController : ControllerBase
    {
        private readonly TerminalService _terminals;

        public TerminalsController(TerminalService terminals)
        {
            _terminals = terminals;
        }

        public class TerminalRequest
        {
            [Required, StringLength(120, MinimumLength = 1)]
            public string Name { get; set; } = "";

            [StringLength(32)]
            public string? Code { get; set; }

            [Range(-90, 90)]
            public double Latitude { get; set; }

            [Range(-180, 180)]
            public double Longitude { get; set; }

            /// <summary>Reserved (Phase 2) — link to a shared physical terminal.</summary>
            public string? CanonicalTerminalId { get; set; }
        }

        /// <summary>This company's terminals (active + retired).</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var terminals = await _terminals.GetForCompanyAsync();
            return Ok(terminals);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TerminalRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var created = await _terminals.CreateAsync(
                body.Name.Trim(), body.Code, body.Latitude, body.Longitude, body.CanonicalTerminalId);
            return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] TerminalRequest body)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updated = await _terminals.UpdateAsync(
                id, body.Name.Trim(), body.Code, body.Latitude, body.Longitude, body.CanonicalTerminalId);
            if (updated == null) return NotFound("Terminal not found in your company.");
            return Ok(updated);
        }

        /// <summary>Soft-delete (mark Retired).</summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var ok = await _terminals.RetireAsync(id);
            if (!ok) return NotFound("Terminal not found in your company.");
            return NoContent();
        }
    }
}
