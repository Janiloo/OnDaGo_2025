using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Tenancy;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    public class CompanyService
    {
        public const string DefaultSlug = "ondago";

        private readonly IMongoCollection<Company> _companies;
        private readonly CompanyLookup _lookup;

        public CompanyService(IMongoDatabase database, CompanyLookup lookup)
        {
            _companies = database.GetCollection<Company>("companies");
            _lookup = lookup;
        }

        public Task<Company?> GetByIdAsync(string id) =>
            _companies.Find(c => c.Id == id).FirstOrDefaultAsync()!;

        public Task<List<Company>> GetAllAsync() =>
            _companies.Find(FilterDefinition<Company>.Empty).ToListAsync();

        public Task<Company?> GetBySlugAsync(string slug) =>
            _companies.Find(c => c.Slug == slug).FirstOrDefaultAsync()!;

        public Task<bool> SlugExistsAsync(string slug) =>
            _companies.Find(c => c.Slug == slug).AnyAsync();

        /// <summary>
        /// Ids of companies a commuter is allowed to discover: Active AND Verified.
        /// The commuter discovery layer intersects terminals/vehicles against this
        /// set so unverified or suspended operators never surface to riders.
        /// </summary>
        public async Task<List<string>> GetVerifiedCompanyIdsAsync()
        {
            var filter = Builders<Company>.Filter.And(
                Builders<Company>.Filter.Eq(c => c.Status, "Active"),
                Builders<Company>.Filter.Eq(c => c.VerificationStatus, "Verified"));

            var companies = await _companies
                .Find(filter)
                .Project(c => c.Id)
                .ToListAsync();

            return companies;
        }

        /// <summary>
        /// Returns the default company for the current operator, creating it once
        /// if missing (idempotent). Used by the platform bootstrap — NOT run
        /// automatically at startup.
        /// </summary>
        public async Task<Company> GetOrCreateDefaultAsync()
        {
            var existing = await _companies.Find(c => c.Slug == DefaultSlug).FirstOrDefaultAsync();
            if (existing != null) return existing;

            var company = new Company
            {
                Name = "OnDaGO",
                Slug = DefaultSlug,
                Status = "Active",
                VerificationStatus = "Verified", // the founding operator is trusted
            };
            await _companies.InsertOneAsync(company);
            _lookup.Invalidate();
            return company;
        }

        public async Task CreateAsync(Company company)
        {
            await _companies.InsertOneAsync(company);
            _lookup.Invalidate();
        }

        public Task SetVerificationAsync(string id, string status) =>
            _companies.UpdateOneAsync(
                c => c.Id == id,
                Builders<Company>.Update.Set(c => c.VerificationStatus, status));

        public Task SetStatusAsync(string id, string status) =>
            _companies.UpdateOneAsync(
                c => c.Id == id,
                Builders<Company>.Update.Set(c => c.Status, status));

        /// <summary>Tier 2 branding: inline logo + brand color (validated upstream).</summary>
        public Task UpdateBrandingAsync(string id, string? logoDataUri, string? brandColor) =>
            _companies.UpdateOneAsync(
                c => c.Id == id,
                Builders<Company>.Update
                    .Set(c => c.LogoDataUri, logoDataUri)
                    .Set(c => c.BrandColor, brandColor));

        /// <summary>Commuter-facing branding of every discoverable (Active+Verified) company.</summary>
        public async Task<List<Company>> GetVerifiedCompaniesAsync()
        {
            var filter = Builders<Company>.Filter.And(
                Builders<Company>.Filter.Eq(c => c.Status, "Active"),
                Builders<Company>.Filter.Eq(c => c.VerificationStatus, "Verified"));
            return await _companies.Find(filter).ToListAsync();
        }
    }
}
