using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;

namespace OnDaGo.API.Tenancy
{
    /// <summary>
    /// The ONLY sanctioned way to read/write a company-owned entity. Every
    /// operation runs through <see cref="Scope"/>, which injects the company
    /// filter from <see cref="TenantContext"/> — so a developer physically
    /// cannot forget it and leak another company's data. Cross-tenant reads
    /// (the commuter discovery layer) deliberately use the raw collection on a
    /// separate, explicit path instead.
    ///
    /// Registered as an open generic scoped service:
    ///   services.AddScoped(typeof(TenantCollection&lt;&gt;));
    /// </summary>
    public class TenantCollection<T> where T : ITenantEntity
    {
        private readonly IMongoCollection<T> _col;
        private readonly TenantContext _tenant;

        public TenantCollection(IMongoDatabase db, TenantContext tenant)
        {
            var name = typeof(T).GetCustomAttribute<MongoCollectionAttribute>()?.Name
                ?? throw new InvalidOperationException(
                    $"{typeof(T).Name} must declare [MongoCollection(\"...\")] to be tenant-scoped.");
            _col = db.GetCollection<T>(name);
            _tenant = tenant;
        }

        private FilterDefinition<T> Scope(FilterDefinition<T>? extra = null)
        {
            var effective = _tenant.EffectiveCompanyId;
            FilterDefinition<T> scope;

            if (effective != null)
            {
                var byId = Builders<T>.Filter.Eq(x => x.CompanyId, effective);
                // Single-company transition: legacy rows still have a null companyId
                // (backfill not run yet) — keep them visible to the sole company.
                scope = _tenant.SingleCompanyTransition
                    ? Builders<T>.Filter.Or(byId, Builders<T>.Filter.Eq(x => x.CompanyId, (string?)null))
                    : byId;
            }
            else if (!_tenant.TenancyActive)
            {
                // Pre-bootstrap: no companies exist yet → behave like the current
                // single-tenant system (unscoped).
                scope = FilterDefinition<T>.Empty;
            }
            else
            {
                // Multiple companies but no company on the token → refuse rather
                // than risk a cross-tenant read.
                throw new TenantScopeException(
                    "No company scope on this request. Re-authenticate to obtain an updated token.");
            }

            return extra == null ? scope : Builders<T>.Filter.And(scope, extra);
        }

        public Task<List<T>> FindAsync(FilterDefinition<T>? filter = null) =>
            _col.Find(Scope(filter)).ToListAsync();

        public Task<T> FindOneAsync(FilterDefinition<T> filter) =>
            _col.Find(Scope(filter)).FirstOrDefaultAsync();

        public async Task InsertAsync(T doc)
        {
            // Stamp ownership on write (except pre-bootstrap, where there is none yet).
            var effective = _tenant.EffectiveCompanyId;
            if (effective != null) doc.CompanyId = effective;
            await _col.InsertOneAsync(doc);
        }

        public Task<T?> FindOneAndUpdateAsync(FilterDefinition<T> filter, UpdateDefinition<T> update)
        {
            return _col.FindOneAndUpdateAsync(
                Scope(filter),
                update,
                new FindOneAndUpdateOptions<T> { ReturnDocument = ReturnDocument.After });
        }

        public Task<UpdateResult> UpdateOneAsync(FilterDefinition<T> filter, UpdateDefinition<T> update) =>
            _col.UpdateOneAsync(Scope(filter), update);
    }
}
