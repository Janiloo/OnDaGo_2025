using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using OnDaGo.API.Models;
using OnDaGo.API.Services;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Controllers
{
    /// <summary>
    /// Company-scoped business intelligence (Tier 3) — read-only aggregations
    /// over the recorder collections (shift_logs, telemetry_samples,
    /// stop_arrivals). No UI consumes this yet ("Analytics · soon" in the web
    /// console); the endpoints exist so the dashboard is a pure frontend task
    /// and the data underneath has been accumulating since day one.
    ///
    /// Aggregation happens in memory over the requested window: at the current
    /// fleet scale that is thousands of small documents at most, and it keeps
    /// the queries readable. Move the heavy ones to Mongo pipelines when a
    /// company runs hundreds of vehicles.
    /// </summary>
    [ApiController]
    [Route("api/admin/analytics")]
    [Authorize(Roles = "Admin")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IMongoCollection<ShiftLog> _shifts;
        private readonly IMongoCollection<TelemetrySample> _samples;
        private readonly IMongoCollection<StopArrival> _arrivals;
        private readonly TenantCollection<VehicleModel> _vehicles;
        private readonly TenantContext _tenant;

        public AnalyticsController(IMongoDatabase db, TenantCollection<VehicleModel> vehicles, TenantContext tenant)
        {
            _shifts = db.GetCollection<ShiftLog>("shift_logs");
            _samples = db.GetCollection<TelemetrySample>("telemetry_samples");
            _arrivals = db.GetCollection<StopArrival>("stop_arrivals");
            _vehicles = vehicles;
            _tenant = tenant;
        }

        private static int ClampDays(int days) => Math.Clamp(days, 1, 90);

        /// <summary>Company filter matching TenantCollection semantics: the caller's
        /// company, plus legacy null-company rows during the single-company transition.</summary>
        private FilterDefinition<T> CompanyFilter<T>(System.Linq.Expressions.Expression<Func<T, string?>> companyField)
        {
            var company = _tenant.EffectiveCompanyId;
            if (company == null)
            {
                if (!_tenant.TenancyActive) return Builders<T>.Filter.Empty; // pre-bootstrap
                throw new TenantScopeException("No company scope on this request. Re-authenticate to obtain an updated token.");
            }
            var byId = Builders<T>.Filter.Eq(companyField, company);
            return _tenant.SingleCompanyTransition
                ? Builders<T>.Filter.Or(byId, Builders<T>.Filter.Eq(companyField, (string?)null))
                : byId;
        }

        private static double OccupancyPct(TelemetrySample s) =>
            s.MaxPassengerCount > 0 ? 100.0 * s.PassengerCount / s.MaxPassengerCount : 0;

        /// <summary>Fleet KPIs over the last 24 hours.</summary>
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var since = DateTime.UtcNow.AddHours(-24);

            var fleet = await _vehicles.FindAsync();
            var shifts = await _shifts.Find(Builders<ShiftLog>.Filter.And(
                CompanyFilter<ShiftLog>(s => s.CompanyId),
                Builders<ShiftLog>.Filter.Gte(s => s.EndedAt, since))).ToListAsync();
            var samples = await _samples.Find(Builders<TelemetrySample>.Filter.And(
                CompanyFilter<TelemetrySample>(t => t.CompanyId),
                Builders<TelemetrySample>.Filter.Gte(t => t.At, since))).ToListAsync();
            var arrivalsCount = await _arrivals.CountDocumentsAsync(Builders<StopArrival>.Filter.And(
                CompanyFilter<StopArrival>(a => a.CompanyId),
                Builders<StopArrival>.Filter.Gte(a => a.At, since)));

            return Ok(new
            {
                windowHours = 24,
                fleetSize = fleet.Count,
                activeVehicles = samples.Select(s => s.PuvNo).Distinct().Count(),
                shiftsCompleted = shifts.Count,
                shiftHours = Math.Round(shifts.Sum(s => s.DurationMinutes) / 60.0, 1),
                terminalArrivals = arrivalsCount,
                avgOccupancyPct = samples.Count > 0 ? Math.Round(samples.Average(OccupancyPct), 1) : (double?)null,
                // Honest signal for the future dashboard's empty states.
                recordingSince = (await _samples
                    .Find(CompanyFilter<TelemetrySample>(t => t.CompanyId))
                    .SortBy(t => t.At).Limit(1).FirstOrDefaultAsync())?.At,
            });
        }

        /// <summary>Average occupancy by hour-of-day (UTC) and by day.</summary>
        [HttpGet("passenger-trends")]
        public async Task<IActionResult> PassengerTrends([FromQuery] int days = 7)
        {
            var since = DateTime.UtcNow.AddDays(-ClampDays(days));
            var samples = await _samples.Find(Builders<TelemetrySample>.Filter.And(
                CompanyFilter<TelemetrySample>(t => t.CompanyId),
                Builders<TelemetrySample>.Filter.Gte(t => t.At, since))).ToListAsync();

            var byHour = Enumerable.Range(0, 24).Select(h =>
            {
                var bucket = samples.Where(s => s.At.Hour == h).ToList();
                return new
                {
                    hour = h,
                    samples = bucket.Count,
                    avgOccupancyPct = bucket.Count > 0 ? Math.Round(bucket.Average(OccupancyPct), 1) : (double?)null,
                };
            });

            var byDay = samples
                .GroupBy(s => s.At.Date)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    samples = g.Count(),
                    avgOccupancyPct = Math.Round(g.Average(OccupancyPct), 1),
                    peakPassengers = g.Max(s => s.PassengerCount),
                });

            return Ok(new { days = ClampDays(days), byHour, byDay });
        }

        /// <summary>Per-vehicle shift hours, occupancy, and arrivals.</summary>
        [HttpGet("vehicle-utilization")]
        public async Task<IActionResult> VehicleUtilization([FromQuery] int days = 7)
        {
            var since = DateTime.UtcNow.AddDays(-ClampDays(days));

            var fleet = await _vehicles.FindAsync();
            var shifts = await _shifts.Find(Builders<ShiftLog>.Filter.And(
                CompanyFilter<ShiftLog>(s => s.CompanyId),
                Builders<ShiftLog>.Filter.Gte(s => s.EndedAt, since))).ToListAsync();
            var samples = await _samples.Find(Builders<TelemetrySample>.Filter.And(
                CompanyFilter<TelemetrySample>(t => t.CompanyId),
                Builders<TelemetrySample>.Filter.Gte(t => t.At, since))).ToListAsync();
            var arrivals = await _arrivals.Find(Builders<StopArrival>.Filter.And(
                CompanyFilter<StopArrival>(a => a.CompanyId),
                Builders<StopArrival>.Filter.Gte(a => a.At, since))).ToListAsync();

            var shiftsByPuv = shifts.ToLookup(s => s.PuvNo);
            var samplesByPuv = samples.ToLookup(s => s.PuvNo);
            var arrivalsByPuv = arrivals.ToLookup(a => a.PuvNo);

            var rows = fleet.OrderBy(v => v.PuvNo).Select(v =>
            {
                var vShifts = shiftsByPuv[v.PuvNo].ToList();
                var vSamples = samplesByPuv[v.PuvNo].ToList();
                return new
                {
                    puvNo = v.PuvNo,
                    status = v.Status ?? "Active",
                    shifts = vShifts.Count,
                    shiftHours = Math.Round(vShifts.Sum(s => s.DurationMinutes) / 60.0, 1),
                    avgOccupancyPct = vSamples.Count > 0 ? Math.Round(vSamples.Average(OccupancyPct), 1) : (double?)null,
                    peakPassengers = vSamples.Count > 0 ? vSamples.Max(s => s.PassengerCount) : (int?)null,
                    terminalArrivals = arrivalsByPuv[v.PuvNo].Count(),
                };
            });

            return Ok(new { days = ClampDays(days), vehicles = rows });
        }

        /// <summary>Per-driver shift counts, hours, and how shifts ended.</summary>
        [HttpGet("driver-performance")]
        public async Task<IActionResult> DriverPerformance([FromQuery] int days = 7)
        {
            var since = DateTime.UtcNow.AddDays(-ClampDays(days));
            var shifts = await _shifts.Find(Builders<ShiftLog>.Filter.And(
                CompanyFilter<ShiftLog>(s => s.CompanyId),
                Builders<ShiftLog>.Filter.Gte(s => s.EndedAt, since))).ToListAsync();

            var rows = shifts
                .GroupBy(s => s.DriverId ?? $"(unassigned:{s.PuvNo})")
                .Select(g => new
                {
                    driverId = g.First().DriverId,
                    driverName = g.First().DriverName ?? $"Unassigned · {g.First().PuvNo}",
                    shifts = g.Count(),
                    shiftHours = Math.Round(g.Sum(s => s.DurationMinutes) / 60.0, 1),
                    avgShiftMinutes = Math.Round(g.Average(s => s.DurationMinutes), 0),
                    cleanEnds = g.Count(s => s.EndReason == "driver"),
                    timeoutEnds = g.Count(s => s.EndReason == "timeout"),
                })
                .OrderByDescending(r => r.shiftHours);

            return Ok(new { days = ClampDays(days), drivers = rows });
        }

        /// <summary>Position density buckets (~220m grid) with average occupancy —
        /// the raw material for a heatmap overlay.</summary>
        [HttpGet("heatmap")]
        public async Task<IActionResult> Heatmap([FromQuery] int days = 7)
        {
            const double bucket = 0.002; // ≈220m at Manila's latitude
            var since = DateTime.UtcNow.AddDays(-ClampDays(days));
            var samples = await _samples.Find(Builders<TelemetrySample>.Filter.And(
                CompanyFilter<TelemetrySample>(t => t.CompanyId),
                Builders<TelemetrySample>.Filter.Gte(t => t.At, since))).ToListAsync();

            var cells = samples
                .GroupBy(s => (Lat: Math.Round(s.Lat / bucket) * bucket, Lng: Math.Round(s.Lng / bucket) * bucket))
                .Select(g => new
                {
                    lat = Math.Round(g.Key.Lat, 4),
                    lng = Math.Round(g.Key.Lng, 4),
                    weight = g.Count(),
                    avgOccupancyPct = Math.Round(g.Average(OccupancyPct), 1),
                })
                .OrderByDescending(c => c.weight)
                .Take(400);

            return Ok(new { days = ClampDays(days), bucketDegrees = bucket, cells });
        }
    }
}
