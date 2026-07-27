using System;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// "Chat with Support": a signed-in user sends a subject + message, which is
    /// emailed to the Sabako support inbox via the existing SMTP EmailService.
    /// Kept deliberately simple — no persistence, just a relay.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SupportController : ControllerBase
    {
        /// <summary>Where support requests are delivered.</summary>
        private const string SupportInbox = "avancena.johnilo@gmail.com";

        private readonly EmailService _email;
        private readonly UserService _users;

        public SupportController(EmailService email, UserService users)
        {
            _email = email;
            _users = users;
        }

        public class SupportRequestDto
        {
            public string? Subject { get; set; }
            public string? Message { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> Send([FromBody] SupportRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Subject) || string.IsNullOrWhiteSpace(dto?.Message))
                return BadRequest("Subject and message are required.");

            var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var caller = string.IsNullOrEmpty(callerId) ? null : await _users.FindByIdAsync(callerId);
            var name = caller?.Name ?? "Unknown user";
            var email = caller?.Email ?? "unknown";
            var role = caller?.Role ?? User.FindFirst(ClaimTypes.Role)?.Value ?? "User";

            var subject = dto.Subject!.Trim();
            var message = WebUtility.HtmlEncode(dto.Message!.Trim()).Replace("\n", "<br/>");

            var body = $@"
                <div style='font-family:sans-serif;color:#171310'>
                  <h2 style='color:#E24E1B;margin:0 0 4px'>Sabako support request</h2>
                  <p style='margin:0 0 12px;color:#6A6355'>From <b>{WebUtility.HtmlEncode(name)}</b>
                     ({WebUtility.HtmlEncode(email)}) &middot; {WebUtility.HtmlEncode(role)}</p>
                  <p style='margin:0 0 6px'><b>Subject:</b> {WebUtility.HtmlEncode(subject)}</p>
                  <hr style='border:none;border-top:1px solid #E3DFD5'/>
                  <p style='line-height:1.5'>{message}</p>
                  <p style='margin-top:18px;color:#9AA3B8;font-size:12px'>Sent {DateTime.UtcNow:u} via the Sabako app.</p>
                </div>";

            try
            {
                await _email.SendEmailAsync(SupportInbox, $"[Sabako Support] {subject}", body);
            }
            catch (Exception)
            {
                return StatusCode(502, "Could not send your message right now. Please try again later.");
            }

            return Ok(new { sent = true });
        }
    }
}
