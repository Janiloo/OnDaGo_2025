using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Samples the live broadcast stream into telemetry_samples (Tier 3):
    /// at most one snapshot per vehicle per Telemetry:SampleSeconds (default 60),
    /// gated by an in-memory last-sample clock — so it must be a SINGLETON.
    /// Called fire-and-forget from the vehicle status PATCH, same discipline as
    /// StopArrivalService: never throws, never blocks the broadcast.
    /// </summary>
    public class TelemetryService
    {
        private readonly IMongoCollection<TelemetrySample> _samples;
        private readonly TimeSpan _interval;
        private readonly ConcurrentDictionary<string, DateTime> _lastSampleAt = new();

        public TelemetryService(IMongoDatabase db, IConfiguration config)
        {
            _samples = db.GetCollection<TelemetrySample>("telemetry_samples");
            _interval = TimeSpan.FromSeconds(config.GetValue("Telemetry:SampleSeconds", 60.0));
        }

        public async Task ObserveAsync(VehicleModel vehicle)
        {
            try
            {
                if (string.IsNullOrEmpty(vehicle.PuvNo)) return;
                if (vehicle.CurrentLat == 0 && vehicle.CurrentLong == 0) return; // placeholder position

                var now = DateTime.UtcNow;
                var last = _lastSampleAt.GetOrAdd(vehicle.PuvNo, DateTime.MinValue);
                if (now - last < _interval) return;
                if (!_lastSampleAt.TryUpdate(vehicle.PuvNo, now, last)) return; // lost the race — other call samples

                await _samples.InsertOneAsync(new TelemetrySample
                {
                    CompanyId = vehicle.CompanyId,
                    PuvNo = vehicle.PuvNo,
                    RouteId = vehicle.RouteId,
                    Lat = vehicle.CurrentLat,
                    Lng = vehicle.CurrentLong,
                    PassengerCount = vehicle.PassengerCount,
                    MaxPassengerCount = vehicle.MaxPassengerCount,
                    At = now,
                });
            }
            catch
            {
                // Best-effort sampling; a missed minute is just one fewer data point.
            }
        }

        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var samples = db.GetCollection<TelemetrySample>("telemetry_samples");
            await samples.Indexes.CreateManyAsync(new[]
            {
                new CreateIndexModel<TelemetrySample>(
                    Builders<TelemetrySample>.IndexKeys.Ascending(t => t.CompanyId).Descending(t => t.At),
                    new CreateIndexOptions { Name = "ix_company_at" }),
                new CreateIndexModel<TelemetrySample>(
                    Builders<TelemetrySample>.IndexKeys.Ascending(t => t.PuvNo).Descending(t => t.At),
                    new CreateIndexOptions { Name = "ix_puv_at" }),
            });
        }
    }
}
