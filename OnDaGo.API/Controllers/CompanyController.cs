using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnDaGo.API.Services;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// A company admin's view of their OWN company (Tier 2): read profile,
    /// update branding. The company is always resolved from the caller's tenant
    /// context — there is no id parameter to point at someone else's.
    /// </summary>
    [ApiController]
    [Route("api/admin/company")]
    [Authorize(Roles = "Admin")]
    public class CompanyController : ControllerBase
    {
        /// <summary>~100KB of binary as base64, plus the data-URI header.</summary>
        private const int MaxLogoChars = 140_000;
        private static readonly Regex LogoPrefix =
            new(@"^data:image/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$", RegexOptions.Compiled);
        private static readonly Regex HexColor = new(@"^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

        private readonly CompanyService _companies;
        private readonly TenantContext _tenant;

        public CompanyController(CompanyService companies, TenantContext tenant)
        {
            _companies = companies;
            _tenant = tenant;
        }

        public class BrandingRequest
        {
            /// <summary>data:image/…;base64,… — null clears the logo.</summary>
            public string? LogoDataUri { get; set; }

            /// <summary>#RRGGBB — null clears the brand color.</summary>
            public string? BrandColor { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetOwn()
        {
            var companyId = _tenant.EffectiveCompanyId;
            if (companyId == null) return NotFound("No company on this account yet.");
            var company = await _companies.GetByIdAsync(companyId);
            if (company == null) return NotFound("Company not found.");

            return Ok(new
            {
                id = company.Id,
                name = company.Name,
                slug = company.Slug,
                status = company.Status,
                verificationStatus = company.VerificationStatus,
                logoDataUri = company.LogoDataUri,
                brandColor = company.BrandColor,
            });
        }

        [HttpPut("branding")]
        public async Task<IActionResult> UpdateBranding([FromBody] BrandingRequest body)
        {
            var companyId = _tenant.EffectiveCompanyId;
            if (companyId == null) return NotFound("No company on this account yet.");
            if (await _companies.GetByIdAsync(companyId) == null) return NotFound("Company not found.");

            var logo = string.IsNullOrWhiteSpace(body?.LogoDataUri) ? null : body!.LogoDataUri!.Trim();
            if (logo != null)
            {
                if (logo.Length > MaxLogoChars)
                    return BadRequest($"Logo too large — keep it under ~100KB (got {logo.Length / 1400}KB-ish).");
                if (!LogoPrefix.IsMatch(logo))
                    return BadRequest("Logo must be a base64 data URI of a png/jpeg/webp image.");
            }

            var color = string.IsNullOrWhiteSpace(body?.BrandColor) ? null : body!.BrandColor!.Trim();
            if (color != null && !HexColor.IsMatch(color))
                return BadRequest("brandColor must be a #RRGGBB hex color.");

            await _companies.UpdateBrandingAsync(companyId, logo, color);
            return Ok(new { logoDataUri = logo, brandColor = color });
        }
    }
}
