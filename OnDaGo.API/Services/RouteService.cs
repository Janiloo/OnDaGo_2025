using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Tenancy;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Routes mirror <see cref="TerminalService"/>: company-scoped writes through
    /// <see cref="TenantCollection{T}"/>, cross-tenant discovery reads through the
    /// raw collection intersected with Verified companies. Adds terminal-membership
    /// validation (a route may only chain the company's own terminals) and
    /// vehicle→route assignment.
    /// </summary>
    public class RouteService
    {
        private readonly TenantCollection<RouteModel> _scoped;
        private readonly TenantCollection<Terminal> _terminalsScoped;
        private readonly IMongoCollection<RouteModel> _raw;
        private readonly IMongoCollection<Terminal> _terminalsRaw;
        private readonly IMongoCollection<VehicleModel> _vehicles;
        private readonly CompanyService _companies;
        private readonly TenantContext _tenant;

        public RouteService(
            TenantCollection<RouteModel> scoped,
            TenantCollection<Terminal> terminalsScoped,
            IMongoDatabase db,
            CompanyService companies,
            TenantContext tenant)
        {
            _scoped = scoped;
            _terminalsScoped = terminalsScoped;
            _raw = db.GetCollection<RouteModel>("routes");
            _terminalsRaw = db.GetCollection<Terminal>("terminals");
            _vehicles = db.GetCollection<VehicleModel>("coll_vehicles");
            _companies = companies;
            _tenant = tenant;
        }

        // ---- Management (company-scoped) -------------------------------------

        public async Task<List<RouteModel>> GetForCompanyAsync()
        {
            var list = await _scoped.FindAsync();
            list.Sort((a, b) => b.CreatedAt.CompareTo(a.CreatedAt));
            return list;
        }

        /// <summary>All requested terminal ids exist AND belong to the caller's company.</summary>
        public async Task<bool> TerminalsOwnedByCompanyAsync(List<string> terminalIds)
        {
            if (terminalIds == null || terminalIds.Count < 2) return false; // need origin + destination
            if (terminalIds.Distinct().Count() != terminalIds.Count) return false; // no duplicate stops
            var filter = Builders<Terminal>.Filter.In(t => t.Id, terminalIds);
            var owned = await _terminalsScoped.FindAsync(filter); // scoped to this company
            var ownedIds = owned.Select(t => t.Id).ToHashSet();
            return terminalIds.All(id => ownedIds.Contains(id));
        }

        public async Task<RouteModel> CreateAsync(string name, string? code, List<string> terminalIds)
        {
            var route = new RouteModel
            {
                Name = name,
                Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim(),
                TerminalIds = terminalIds,
            };
            await _scoped.InsertAsync(route); // stamps CompanyId
            return route;
        }

        public Task<RouteModel?> UpdateAsync(string id, string name, string? code, List<string> terminalIds)
        {
            var filter = Builders<RouteModel>.Filter.Eq(r => r.Id, id);
            var update = Builders<RouteModel>.Update
                .Set(r => r.Name, name)
                .Set(r => r.Code, string.IsNullOrWhiteSpace(code) ? null : code!.Trim())
                .Set(r => r.TerminalIds, terminalIds);
            return _scoped.FindOneAndUpdateAsync(filter, update);
        }

        public async Task<bool> RetireAsync(string id)
        {
            var filter = Builders<RouteModel>.Filter.Eq(r => r.Id, id);
            var update = Builders<RouteModel>.Update.Set(r => r.Status, "Retired");
            var result = await _scoped.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        /// <summary>The route exists AND is owned by the caller's company.</summary>
        public async Task<RouteModel?> GetOwnedRouteAsync(string id)
        {
            var filter = Builders<RouteModel>.Filter.Eq(r => r.Id, id);
            return await _scoped.FindOneAsync(filter);
        }

        // ---- Vehicle ↔ route assignment (company-scoped) ---------------------

        public enum AssignResult { Ok, RouteNotFound, VehicleNotFound }

        /// <summary>
        /// Assigns a vehicle to a route (or clears it when routeId is null). Both the
        /// vehicle and the route must belong to the caller's company.
        /// </summary>
        public async Task<AssignResult> AssignVehicleAsync(string puvNo, string? routeId)
        {
            if (!string.IsNullOrEmpty(routeId) && await GetOwnedRouteAsync(routeId) == null)
                return AssignResult.RouteNotFound;

            var company = _tenant.EffectiveCompanyId;
            var byPuv = Builders<VehicleModel>.Filter.Eq(v => v.PuvNo, puvNo);
            // Only touch a vehicle in the caller's company (unless pre-bootstrap, where
            // there is no company yet and everything is unscoped).
            var filter = company == null
                ? byPuv
                : Builders<VehicleModel>.Filter.And(byPuv, Builders<VehicleModel>.Filter.Eq(v => v.CompanyId, company));

            var update = Builders<VehicleModel>.Update.Set(v => v.RouteId, string.IsNullOrEmpty(routeId) ? null : routeId);
            var result = await _vehicles.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0 ? AssignResult.Ok : AssignResult.VehicleNotFound;
        }

        // ---- Discovery (cross-tenant, Verified companies only) ---------------

        private FilterDefinition<RouteModel> ActiveVerifiedFilter(IEnumerable<string> verifiedIds) =>
            Builders<RouteModel>.Filter.And(
                Builders<RouteModel>.Filter.Eq(r => r.Status, "Active"),
                Builders<RouteModel>.Filter.In(r => r.CompanyId, verifiedIds));

        public async Task<List<RouteModel>> DiscoverAllAsync()
        {
            var verified = await _companies.GetVerifiedCompanyIdsAsync();
            if (verified.Count == 0) return new List<RouteModel>();
            return await _raw.Find(ActiveVerifiedFilter(verified)).ToListAsync();
        }

        /// <summary>A single active route from a verified company, with its terminal
        /// stops resolved in order. Null if not found/visible.</summary>
        public async Task<object?> DiscoverByIdAsync(string id)
        {
            var verified = await _companies.GetVerifiedCompanyIdsAsync();
            if (verified.Count == 0) return null;

            var filter = Builders<RouteModel>.Filter.And(
                ActiveVerifiedFilter(verified),
                Builders<RouteModel>.Filter.Eq(r => r.Id, id));
            var route = await _raw.Find(filter).FirstOrDefaultAsync();
            if (route == null) return null;

            var terminals = await _terminalsRaw
                .Find(Builders<Terminal>.Filter.In(t => t.Id, route.TerminalIds))
                .ToListAsync();
            // Preserve the route's declared stop order.
            var ordered = route.TerminalIds
                .Select(tid => terminals.FirstOrDefault(t => t.Id == tid))
                .Where(t => t != null)
                .ToList();

            return new
            {
                route.Id,
                route.CompanyId,
                route.Name,
                route.Code,
                route.TerminalIds,
                terminals = ordered,
            };
        }

        // ---- Indexes ---------------------------------------------------------

        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var routes = db.GetCollection<RouteModel>("routes");
            var codeIndex = new CreateIndexModel<RouteModel>(
                Builders<RouteModel>.IndexKeys
                    .Ascending(r => r.CompanyId)
                    .Ascending(r => r.Code),
                new CreateIndexOptions { Unique = true, Sparse = true, Name = "ux_company_route_code" });
            await routes.Indexes.CreateManyAsync(new[] { codeIndex });
        }
    }
}
