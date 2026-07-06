using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace OnDaGo.API.Tenancy
{
    /// <summary>
    /// The current request's tenant, resolved from the JWT + the number of
    /// companies that exist. Registered scoped.
    ///
    /// State machine (keeps every transition non-breaking):
    ///  - No companies yet (pre-bootstrap): EffectiveCompanyId is null and
    ///    TenancyActive is false → tenant queries run UNSCOPED, i.e. exactly like
    ///    the current single-tenant system.
    ///  - Exactly one company (post-bootstrap, migrating): the token's companyId,
    ///    or the sole company if the token predates the claim. SingleCompanyTransition
    ///    is true, so legacy rows with a null companyId are still visible.
    ///  - Many companies: a company must come from the token; a missing claim is
    ///    an error (TenantScopeException) rather than a silent cross-tenant read.
    /// </summary>
    public class TenantContext
    {
        public const string CompanyIdClaim = "companyId";
        public const string PlatformAdminClaim = "platform_admin";

        private readonly IHttpContextAccessor _http;
        private readonly CompanyLookup _companies;

        public TenantContext(IHttpContextAccessor http, CompanyLookup companies)
        {
            _http = http;
            _companies = companies;
        }

        private ClaimsPrincipal? User => _http.HttpContext?.User;

        public string? ClaimCompanyId => User?.FindFirst(CompanyIdClaim)?.Value;

        public bool IsPlatformAdmin => User?.FindFirst(PlatformAdminClaim)?.Value == "true";

        /// <summary>Any company exists at all (i.e. the platform has been bootstrapped).</summary>
        public bool TenancyActive => _companies.AnyCompanies();

        /// <summary>Exactly one company exists and this request resolves to it.</summary>
        public bool SingleCompanyTransition => _companies.SingleCompanyId() != null;

        /// <summary>
        /// Company id to scope by: the token claim, or the sole company during the
        /// single-company transition. Null means "no scope" — which is only valid
        /// pre-bootstrap (see <see cref="TenancyActive"/>).
        /// </summary>
        public string? EffectiveCompanyId
        {
            get
            {
                var claim = ClaimCompanyId;
                if (!string.IsNullOrEmpty(claim)) return claim;
                return _companies.SingleCompanyId();
            }
        }
    }

    public class TenantScopeException : System.Exception
    {
        public TenantScopeException(string message) : base(message) { }
    }
}
