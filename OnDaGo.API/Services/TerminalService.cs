using MongoDB.Driver;
using MongoDB.Driver.GeoJsonObjectModel;
using OnDaGo.API.Models;
using OnDaGo.API.Tenancy;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Terminals have two deliberately separate surfaces:
    ///   • Management (write) — company-scoped, through <see cref="TenantCollection{T}"/>,
    ///     so an admin can only ever touch their own company's terminals.
    ///   • Discovery (read) — cross-tenant, through the raw collection, intersected
    ///     with the set of Verified companies so only trusted operators reach riders.
    /// The scoped repository is the ONLY write path; discovery never writes.
    /// </summary>
    public class TerminalService
    {
        private readonly TenantCollection<Terminal> _scoped;   // management (company-scoped)
        private readonly IMongoCollection<Terminal> _raw;      // discovery (cross-tenant read)
        private readonly CompanyService _companies;

        public TerminalService(TenantCollection<Terminal> scoped, IMongoDatabase db, CompanyService companies)
        {
            _scoped = scoped;
            _raw = db.GetCollection<Terminal>("terminals");
            _companies = companies;
        }

        private static GeoJsonPoint<GeoJson2DGeographicCoordinates> Point(double lat, double lng) =>
            new GeoJsonPoint<GeoJson2DGeographicCoordinates>(
                new GeoJson2DGeographicCoordinates(lng, lat));

        // ---- Management (company-scoped) -------------------------------------

        /// <summary>This company's terminals (active + retired), newest first.</summary>
        public async Task<List<Terminal>> GetForCompanyAsync()
        {
            var list = await _scoped.FindAsync();
            list.Sort((a, b) => b.CreatedAt.CompareTo(a.CreatedAt));
            return list;
        }

        public async Task<Terminal> CreateAsync(string name, string? code, double lat, double lng, string? canonicalTerminalId)
        {
            var terminal = new Terminal
            {
                Name = name,
                Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim(),
                Latitude = lat,
                Longitude = lng,
                CanonicalTerminalId = string.IsNullOrWhiteSpace(canonicalTerminalId) ? null : canonicalTerminalId,
                Location = Point(lat, lng),
            };
            await _scoped.InsertAsync(terminal); // stamps CompanyId
            return terminal;
        }

        /// <summary>Updates a terminal within the caller's company; null if not theirs.</summary>
        public Task<Terminal?> UpdateAsync(string id, string name, string? code, double lat, double lng, string? canonicalTerminalId)
        {
            var filter = Builders<Terminal>.Filter.Eq(t => t.Id, id);
            var update = Builders<Terminal>.Update
                .Set(t => t.Name, name)
                .Set(t => t.Code, string.IsNullOrWhiteSpace(code) ? null : code!.Trim())
                .Set(t => t.Latitude, lat)
                .Set(t => t.Longitude, lng)
                .Set(t => t.CanonicalTerminalId, string.IsNullOrWhiteSpace(canonicalTerminalId) ? null : canonicalTerminalId)
                .Set(t => t.Location, Point(lat, lng));

            return _scoped.FindOneAndUpdateAsync(filter, update);
        }

        /// <summary>Soft-delete: mark Retired. Scoped, so only within the caller's company.</summary>
        public async Task<bool> RetireAsync(string id)
        {
            var filter = Builders<Terminal>.Filter.Eq(t => t.Id, id);
            var update = Builders<Terminal>.Update.Set(t => t.Status, "Retired");
            var result = await _scoped.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        // ---- Discovery (cross-tenant, Verified companies only) ---------------

        private FilterDefinition<Terminal> ActiveVerifiedFilter(IEnumerable<string> verifiedIds) =>
            Builders<Terminal>.Filter.And(
                Builders<Terminal>.Filter.Eq(t => t.Status, "Active"),
                Builders<Terminal>.Filter.In(t => t.CompanyId, verifiedIds));

        public async Task<List<Terminal>> DiscoverAllAsync()
        {
            var verified = await _companies.GetVerifiedCompanyIdsAsync();
            if (verified.Count == 0) return new List<Terminal>();
            return await _raw.Find(ActiveVerifiedFilter(verified)).ToListAsync();
        }

        public async Task<List<Terminal>> DiscoverNearAsync(double lat, double lng, double radiusMeters)
        {
            var verified = await _companies.GetVerifiedCompanyIdsAsync();
            if (verified.Count == 0) return new List<Terminal>();

            var near = Builders<Terminal>.Filter.NearSphere(t => t.Location, Point(lat, lng), maxDistance: radiusMeters);
            var filter = Builders<Terminal>.Filter.And(ActiveVerifiedFilter(verified), near);
            return await _raw.Find(filter).ToListAsync();
        }

        // ---- Indexes (idempotent, called once at startup) --------------------

        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var terminals = db.GetCollection<Terminal>("terminals");

            // A company can't have two terminals with the same code; different
            // companies can reuse codes. Sparse so terminals without a code are exempt.
            var codeIndex = new CreateIndexModel<Terminal>(
                Builders<Terminal>.IndexKeys
                    .Ascending(t => t.CompanyId)
                    .Ascending(t => t.Code),
                new CreateIndexOptions { Unique = true, Sparse = true, Name = "ux_company_code" });

            var geoIndex = new CreateIndexModel<Terminal>(
                Builders<Terminal>.IndexKeys.Geo2DSphere(t => t.Location),
                new CreateIndexOptions { Name = "gx_terminal_location" });

            await terminals.Indexes.CreateManyAsync(new[] { codeIndex, geoIndex });
        }
    }
}
