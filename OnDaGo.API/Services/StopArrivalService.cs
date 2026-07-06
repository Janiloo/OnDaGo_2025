using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Records terminal arrivals from the live broadcast stream (Tier 2 improved
    /// ETA groundwork). Called fire-and-forget on every vehicle status PATCH:
    /// when a vehicle on a route comes within <see cref="ArrivalRadiusM"/> of one
    /// of that route's terminals, one StopArrival event is written. An in-memory
    /// "last terminal per PUV" gate stops a vehicle loading passengers at a stop
    /// from spamming events; leaving the radius re-arms it. Registered singleton
    /// (the gate must survive across requests); route stop coordinates are cached
    /// and refreshed lazily every few minutes.
    /// </summary>
    public class StopArrivalService
    {
        private const double ArrivalRadiusM = 120;
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

        private readonly IMongoCollection<StopArrival> _arrivals;
        private readonly IMongoCollection<RouteModel> _routes;
        private readonly IMongoCollection<Terminal> _terminals;

        private readonly ConcurrentDictionary<string, string> _lastTerminalByPuv = new();
        private Dictionary<string, List<(string TerminalId, double Lat, double Lng)>> _stopsByRoute = new();
        private DateTime _cacheLoadedAt = DateTime.MinValue;
        private readonly SemaphoreSlim _cacheLock = new(1, 1);

        public StopArrivalService(IMongoDatabase db)
        {
            _arrivals = db.GetCollection<StopArrival>("stop_arrivals");
            _routes = db.GetCollection<RouteModel>("routes");
            _terminals = db.GetCollection<Terminal>("terminals");
        }

        /// <summary>Observe one broadcast. Never throws — this is a best-effort
        /// side channel that must not affect the broadcast path.</summary>
        public async Task ObserveAsync(VehicleModel vehicle)
        {
            try
            {
                if (string.IsNullOrEmpty(vehicle.RouteId) || string.IsNullOrEmpty(vehicle.PuvNo)) return;
                if (vehicle.CurrentLat == 0 && vehicle.CurrentLong == 0) return; // placeholder position

                var stops = await GetRouteStopsAsync(vehicle.RouteId);
                if (stops == null || stops.Count == 0) return;

                var here = stops
                    .Select(s => (s.TerminalId, Distance: HaversineMeters(vehicle.CurrentLat, vehicle.CurrentLong, s.Lat, s.Lng)))
                    .Where(s => s.Distance <= ArrivalRadiusM)
                    .OrderBy(s => s.Distance)
                    .Select(s => s.TerminalId)
                    .FirstOrDefault();

                if (here == null)
                {
                    // Left the stop — re-arm so the next approach records again.
                    _lastTerminalByPuv.TryRemove(vehicle.PuvNo, out _);
                    return;
                }

                if (_lastTerminalByPuv.TryGetValue(vehicle.PuvNo, out var last) && last == here) return;
                _lastTerminalByPuv[vehicle.PuvNo] = here;

                await _arrivals.InsertOneAsync(new StopArrival
                {
                    CompanyId = vehicle.CompanyId,
                    RouteId = vehicle.RouteId,
                    TerminalId = here,
                    PuvNo = vehicle.PuvNo,
                    At = DateTime.UtcNow,
                });
            }
            catch
            {
                // Best-effort recording; a miss just means one fewer data point.
            }
        }

        private async Task<List<(string TerminalId, double Lat, double Lng)>?> GetRouteStopsAsync(string routeId)
        {
            if (DateTime.UtcNow - _cacheLoadedAt > CacheTtl)
            {
                await _cacheLock.WaitAsync();
                try
                {
                    if (DateTime.UtcNow - _cacheLoadedAt > CacheTtl)
                    {
                        var routes = await _routes.Find(r => r.Status == "Active").ToListAsync();
                        var terminalIds = routes.SelectMany(r => r.TerminalIds).Distinct().ToList();
                        var terminals = await _terminals
                            .Find(Builders<Terminal>.Filter.In(t => t.Id, terminalIds))
                            .ToListAsync();
                        var byId = terminals.Where(t => t.Id != null).ToDictionary(t => t.Id!);

                        _stopsByRoute = routes.Where(r => r.Id != null).ToDictionary(
                            r => r.Id!,
                            r => r.TerminalIds
                                .Where(byId.ContainsKey)
                                .Select(tid => (tid, byId[tid].Latitude, byId[tid].Longitude))
                                .ToList());
                        _cacheLoadedAt = DateTime.UtcNow;
                    }
                }
                finally
                {
                    _cacheLock.Release();
                }
            }

            return _stopsByRoute.TryGetValue(routeId, out var stops) ? stops : null;
        }

        private static double HaversineMeters(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6_371_000;
            double ToRad(double d) => d * Math.PI / 180.0;
            var dLat = ToRad(lat2 - lat1);
            var dLng = ToRad(lng2 - lng1);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }

        /// <summary>Historical-query index (idempotent). Called at startup.</summary>
        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var arrivals = db.GetCollection<StopArrival>("stop_arrivals");
            var index = new CreateIndexModel<StopArrival>(
                Builders<StopArrival>.IndexKeys
                    .Ascending(a => a.RouteId)
                    .Ascending(a => a.TerminalId)
                    .Descending(a => a.At),
                new CreateIndexOptions { Name = "ix_route_terminal_at" });
            await arrivals.Indexes.CreateManyAsync(new[] { index });
        }
    }
}
