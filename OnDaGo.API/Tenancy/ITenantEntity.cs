namespace OnDaGo.API.Tenancy
{
    /// <summary>
    /// Marks a document as company-owned. Anything implementing this MUST be
    /// accessed through <see cref="TenantCollection{T}"/>, which always applies
    /// the company filter — so a forgotten WHERE clause can never leak data
    /// across companies.
    /// </summary>
    public interface ITenantEntity
    {
        string? CompanyId { get; set; }
    }
}
