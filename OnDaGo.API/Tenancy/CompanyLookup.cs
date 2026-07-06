using MongoDB.Driver;
using OnDaGo.API.Models;

namespace OnDaGo.API.Tenancy
{
    /// <summary>
    /// Cached snapshot of how many companies exist (0 / 1 / many). Used to drive
    /// the transition behaviour of tenant scoping without a DB hit per query.
    /// Invalidated whenever a company is created.
    /// </summary>
    public class CompanyLookup
    {
        private readonly IMongoCollection<Company> _companies;
        private readonly object _lock = new();
        private bool _loaded;
        private int _count;         // 0, 1, or 2 (2 == "many")
        private string? _singleId;

        public CompanyLookup(IMongoDatabase database)
        {
            _companies = database.GetCollection<Company>("companies");
        }

        public void Invalidate()
        {
            lock (_lock) { _loaded = false; }
        }

        private void EnsureLoaded()
        {
            lock (_lock) { if (_loaded) return; }
            // Limit(2) is enough to tell 0 / 1 / many apart cheaply.
            var some = _companies.Find(FilterDefinition<Company>.Empty).Limit(2).ToList();
            lock (_lock)
            {
                _count = some.Count;
                _singleId = some.Count == 1 ? some[0].Id : null;
                _loaded = true;
            }
        }

        public bool AnyCompanies()
        {
            EnsureLoaded();
            lock (_lock) { return _count > 0; }
        }

        /// <summary>The company id when EXACTLY one exists, else null.</summary>
        public string? SingleCompanyId()
        {
            EnsureLoaded();
            lock (_lock) { return _count == 1 ? _singleId : null; }
        }
    }
}
