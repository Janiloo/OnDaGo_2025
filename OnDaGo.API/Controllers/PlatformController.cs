using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Platform (OnDaGO) operations. Bootstrap is secret-gated and one-time;
    /// the tenancy backfill is SuperAdmin-triggered and idempotent — NEITHER
    /// runs automatically at startup, so a human runs and verifies them on prod.
    /// </summary>
    [ApiController]
    [Route("api/platform")]
    public class PlatformController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly CompanyService _companyService;
        private readonly UserService _userService;
        private readonly IMongoDatabase _db;

        public PlatformController(
            IConfiguration config,
            CompanyService companyService,
            UserService userService,
            IMongoDatabase db)
        {
            _config = config;
            _companyService = companyService;
            _userService = userService;
            _db = db;
        }

        public class BootstrapRequest
        {
            public string Key { get; set; } = "";
            public string AdminEmail { get; set; } = "";
        }

        /// <summary>
        /// One-time platform bootstrap: creates the default company and promotes an
        /// existing account to platform SuperAdmin. Gated by the Platform:BootstrapKey
        /// secret and refuses to run once a SuperAdmin already exists.
        /// </summary>
        [HttpPost("bootstrap")]
        [AllowAnonymous]
        public async Task<IActionResult> Bootstrap([FromBody] BootstrapRequest req)
        {
            var configuredKey = _config["Platform:BootstrapKey"];
            if (string.IsNullOrEmpty(configuredKey))
                return StatusCode(503, "Bootstrap is disabled. Set Platform:BootstrapKey in configuration first.");
            if (req == null || req.Key != configuredKey)
                return Unauthorized("Invalid bootstrap key.");
            if (await _userService.AnyPlatformAdminAsync())
                return Conflict("Platform is already bootstrapped.");
            if (string.IsNullOrWhiteSpace(req.AdminEmail))
                return BadRequest("adminEmail is required.");

            var company = await _companyService.GetOrCreateDefaultAsync();
            var promoted = await _userService.PromotePlatformAdminAsync(req.AdminEmail, company.Id);
            if (!promoted)
                return NotFound($"No user found with email '{req.AdminEmail}'.");

            return Ok(new
            {
                message = "Bootstrapped. Sign out and back in on the promoted account to refresh its token.",
                companyId = company.Id,
                superAdmin = req.AdminEmail,
            });
        }

        /// <summary>
        /// Stamps CompanyId onto existing users/vehicles/reports that predate
        /// multi-tenancy, assigning them to the default company. Idempotent
        /// (only touches rows missing a CompanyId).
        /// </summary>
        [HttpPost("backfill-tenancy")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> BackfillTenancy()
        {
            var company = await _companyService.GetBySlugAsync(CompanyService.DefaultSlug);
            if (company == null)
                return BadRequest("Default company not found. Run /api/platform/bootstrap first.");

            var users = await BackfillCollection("users", company.Id);
            var vehicles = await BackfillCollection("coll_vehicles", company.Id);
            var reports = await BackfillCollection("reports", company.Id);

            return Ok(new
            {
                companyId = company.Id,
                usersUpdated = users,
                vehiclesUpdated = vehicles,
                reportsUpdated = reports,
            });
        }

        // Sets CompanyId on documents that lack it (null or missing), by field
        // name — works uniformly for users/vehicles/reports without a shared type.
        private async Task<long> BackfillCollection(string collectionName, string companyId)
        {
            var col = _db.GetCollection<BsonDocument>(collectionName);
            var missing = Builders<BsonDocument>.Filter.Or(
                Builders<BsonDocument>.Filter.Eq("CompanyId", BsonNull.Value),
                Builders<BsonDocument>.Filter.Exists("CompanyId", false));
            var result = await col.UpdateManyAsync(missing, Builders<BsonDocument>.Update.Set("CompanyId", companyId));
            return result.ModifiedCount;
        }

        // =====================================================================
        // Company management (SuperAdmin console). All SuperAdmin-gated; these
        // use CompanyService/UserService directly (NOT the tenant-scoped
        // repository) because the platform operates across every company.
        // =====================================================================

        public class CreateCompanyRequest
        {
            public string Name { get; set; } = "";
            public string? Slug { get; set; }
            public string? ContactEmail { get; set; }
            public string? Phone { get; set; }
            public string AdminName { get; set; } = "";
            public string AdminEmail { get; set; } = "";
            public string? AdminPhone { get; set; }
        }

        public class StatusRequest { public string Status { get; set; } = ""; }

        public class ResetAdminPasswordRequest { public string AdminEmail { get; set; } = ""; }

        /// <summary>Every company, each with its admin account(s). SuperAdmin dashboard/list.</summary>
        [HttpGet("companies")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> GetCompanies()
        {
            var companies = await _companyService.GetAllAsync();
            var admins = await _userService.GetAdminsAsync();
            var byCompany = admins
                .GroupBy(a => a.CompanyId ?? "")
                .ToDictionary(g => g.Key, g => g.ToList());

            var result = companies
                .OrderBy(c => c.CreatedAt)
                .Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    slug = c.Slug,
                    status = c.Status,
                    verificationStatus = c.VerificationStatus,
                    contactEmail = c.ContactEmail,
                    phone = c.Phone,
                    createdAt = c.CreatedAt,
                    admins = (byCompany.TryGetValue(c.Id, out var list) ? list : new List<UserItem>())
                        .Select(a => new
                        {
                            email = a.Email,
                            name = a.Name,
                            isPlatformAdmin = a.IsPlatformAdmin,
                            mustChangePassword = a.MustChangePassword,
                        }),
                });

            return Ok(result);
        }

        /// <summary>Registers a company AND its first company admin (temp password shown once).</summary>
        [HttpPost("companies")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Name) ||
                string.IsNullOrWhiteSpace(req.AdminName) || string.IsNullOrWhiteSpace(req.AdminEmail))
            {
                return BadRequest("Company name, admin name, and admin email are required.");
            }

            var email = req.AdminEmail.Trim().ToLowerInvariant();
            if (await _userService.FindByEmailAsync(email) != null)
                return Conflict($"A user with email '{email}' already exists.");

            var baseSlug = Slugify(string.IsNullOrWhiteSpace(req.Slug) ? req.Name : req.Slug!);
            var slug = await UniqueSlugAsync(baseSlug);

            var company = new Company
            {
                Name = req.Name.Trim(),
                Slug = slug,
                ContactEmail = string.IsNullOrWhiteSpace(req.ContactEmail) ? null : req.ContactEmail.Trim(),
                Phone = string.IsNullOrWhiteSpace(req.Phone) ? null : req.Phone.Trim(),
                Status = "Active",
                VerificationStatus = "Unverified", // SuperAdmin verifies after review
            };
            await _companyService.CreateAsync(company); // invalidates the company-count cache

            var tempPassword = GenerateTempPassword();
            var admin = new UserItem
            {
                Name = req.AdminName.Trim(),
                Email = email,
                PasswordHash = UserService.HashPassword(tempPassword),
                PhoneNumber = req.AdminPhone ?? "",
                Role = "Admin",
                CompanyId = company.Id,
                MustChangePassword = true,
            };
            await _userService.CreateUserAsync(admin);

            return Ok(new
            {
                company = new
                {
                    id = company.Id,
                    name = company.Name,
                    slug = company.Slug,
                    status = company.Status,
                    verificationStatus = company.VerificationStatus,
                    createdAt = company.CreatedAt,
                },
                adminEmail = email,
                temporaryPassword = tempPassword, // returned ONCE — hand to the company admin
            });
        }

        /// <summary>Set a company's verification: Unverified | Verified | Suspended.</summary>
        [HttpPost("companies/{id}/verification")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> SetVerification(string id, [FromBody] StatusRequest req)
        {
            var allowed = new[] { "Unverified", "Verified", "Suspended" };
            if (req == null || !allowed.Contains(req.Status))
                return BadRequest("status must be Unverified, Verified, or Suspended.");
            if (await _companyService.GetByIdAsync(id) == null)
                return NotFound("Company not found.");

            await _companyService.SetVerificationAsync(id, req.Status);
            return Ok(new { id, verificationStatus = req.Status });
        }

        /// <summary>Platform on/off switch for a company: Active | Suspended.</summary>
        [HttpPost("companies/{id}/status")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> SetStatus(string id, [FromBody] StatusRequest req)
        {
            var allowed = new[] { "Active", "Suspended" };
            if (req == null || !allowed.Contains(req.Status))
                return BadRequest("status must be Active or Suspended.");
            if (await _companyService.GetByIdAsync(id) == null)
                return NotFound("Company not found.");

            await _companyService.SetStatusAsync(id, req.Status);
            return Ok(new { id, status = req.Status });
        }

        /// <summary>Issue a new temporary password for a company's admin (shown once).</summary>
        [HttpPost("companies/{id}/reset-admin-password")]
        [Authorize(Policy = "SuperAdmin")]
        public async Task<IActionResult> ResetAdminPassword(string id, [FromBody] ResetAdminPasswordRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.AdminEmail))
                return BadRequest("adminEmail is required.");

            var email = req.AdminEmail.Trim().ToLowerInvariant();
            var admin = await _userService.FindByEmailAsync(email);
            if (admin == null || admin.CompanyId != id || admin.Role != "Admin")
                return NotFound("No company admin with that email in this company.");
            if (admin.IsPlatformAdmin)
                return BadRequest("Refusing to reset a platform admin's password from here.");

            var tempPassword = GenerateTempPassword();
            await _userService.SetTemporaryPasswordAsync(email, UserService.HashPassword(tempPassword));
            return Ok(new { adminEmail = email, temporaryPassword = tempPassword });
        }

        // --- helpers ---------------------------------------------------------

        private static string Slugify(string name)
        {
            var sb = new StringBuilder();
            foreach (var ch in name.Trim().ToLowerInvariant())
            {
                if (char.IsLetterOrDigit(ch)) sb.Append(ch);
                else if (ch == ' ' || ch == '-' || ch == '_') sb.Append('-');
            }
            var slug = sb.ToString().Trim('-');
            while (slug.Contains("--")) slug = slug.Replace("--", "-");
            return string.IsNullOrEmpty(slug) ? "company" : slug;
        }

        private async Task<string> UniqueSlugAsync(string baseSlug)
        {
            var slug = baseSlug;
            var n = 2;
            while (await _companyService.SlugExistsAsync(slug)) slug = $"{baseSlug}-{n++}";
            return slug;
        }

        /// <summary>Readable temp password (no ambiguous chars), always ≥ 8 chars.</summary>
        private static string GenerateTempPassword()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
            var sb = new StringBuilder("Ond-");
            for (var i = 0; i < 8; i++) sb.Append(chars[RandomNumberGenerator.GetInt32(chars.Length)]);
            return sb.ToString();
        }
    }
}
