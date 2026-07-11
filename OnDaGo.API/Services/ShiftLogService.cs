using MongoDB.Driver;
using OnDaGo.API.Models;
using System;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Appends the durable per-shift record when a shift closes (Tier 3).
    /// Stateless and DB-only, so it's safe both in request scope
    /// (VehicleController offline) and inside the singleton timeout sweep.
    /// Best-effort: a failed append must never break the shift-close path.
    /// </summary>
    public class ShiftLogService
    {
        private readonly IMongoCollection<ShiftLog> _logs;
        private readonly IMongoCollection<UserItem> _users;

        public ShiftLogService(IMongoDatabase db)
        {
            _logs = db.GetCollection<ShiftLog>("shift_logs");
            _users = db.GetCollection<UserItem>("users");
        }

        /// <summary>
        /// Records the shift that just closed on <paramref name="vehicle"/> (its
        /// duty fields still hold the pre-close values). No-op unless the vehicle
        /// was actually on duty with a known start.
        /// </summary>
        public async Task RecordAsync(VehicleModel vehicle, string endReason, DateTime endedAt)
        {
            try
            {
                if (vehicle.DutyStatus != "OnDuty" || vehicle.DutyStartedAt == null) return;

                var driver = await _users
                    .Find(u => u.Role == "Driver" && u.PlateNumber == vehicle.PuvNo)
                    .FirstOrDefaultAsync();

                var startedAt = vehicle.DutyStartedAt.Value;
                await _logs.InsertOneAsync(new ShiftLog
                {
                    CompanyId = vehicle.CompanyId,
                    PuvNo = vehicle.PuvNo,
                    DriverId = driver?.Id.ToString(),
                    DriverName = driver?.Name,
                    RouteId = vehicle.RouteId,
                    StartedAt = startedAt,
                    EndedAt = endedAt,
                    EndReason = endReason,
                    DurationMinutes = Math.Max(0, (endedAt - startedAt).TotalMinutes),
                });
            }
            catch
            {
                // Best-effort history; the shift close itself already succeeded.
            }
        }

        public static async Task EnsureIndexesAsync(IMongoDatabase db)
        {
            var logs = db.GetCollection<ShiftLog>("shift_logs");
            await logs.Indexes.CreateManyAsync(new[]
            {
                new CreateIndexModel<ShiftLog>(
                    Builders<ShiftLog>.IndexKeys.Ascending(s => s.CompanyId).Descending(s => s.EndedAt),
                    new CreateIndexOptions { Name = "ix_company_ended" }),
                new CreateIndexModel<ShiftLog>(
                    Builders<ShiftLog>.IndexKeys.Ascending(s => s.DriverId).Descending(s => s.EndedAt),
                    new CreateIndexOptions { Name = "ix_driver_ended" }),
            });
        }
    }
}
