using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace OnDaGo.API.Services
{
    /// <summary>
    /// Closes abandoned shifts: a vehicle that is OnDuty but has not broadcast
    /// for Duty:TimeoutMinutes (default 30) goes OffDuty with reason "timeout" —
    /// the driver's phone died or the app was killed without tapping end shift.
    /// Runs every Duty:SweepSeconds (default 60). Without this, a crashed app
    /// would leave its vehicle "on duty · signal lost" forever.
    /// </summary>
    public class DutyTimeoutService : BackgroundService
    {
        private readonly VehicleService _vehicles;
        private readonly ShiftLogService _shiftLogs;
        private readonly ILogger<DutyTimeoutService> _logger;
        private readonly TimeSpan _timeout;
        private readonly TimeSpan _sweepEvery;

        public DutyTimeoutService(IMongoDatabase db, IConfiguration config, ILogger<DutyTimeoutService> logger)
        {
            _vehicles = new VehicleService(db);   // stateless; safe outside DI scope
            _shiftLogs = new ShiftLogService(db); // ditto
            _logger = logger;
            _timeout = TimeSpan.FromMinutes(config.GetValue("Duty:TimeoutMinutes", 30.0));
            _sweepEvery = TimeSpan.FromSeconds(config.GetValue("Duty:SweepSeconds", 60.0));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var closed = await _vehicles.TimeoutStaleDutiesAsync(_timeout);
                    if (closed.Count > 0)
                    {
                        // Durable shift history (Tier 3) — RecordAsync never throws.
                        var endedAt = DateTime.UtcNow;
                        foreach (var vehicle in closed)
                            await _shiftLogs.RecordAsync(vehicle, "timeout", endedAt);
                        _logger.LogInformation("Duty timeout: closed {Count} abandoned shift(s).", closed.Count);
                    }
                }
                catch (Exception ex)
                {
                    // Sweep failures (e.g. transient DB outage) must not kill the host.
                    _logger.LogError(ex, "Duty timeout sweep failed; will retry next interval.");
                }

                try
                {
                    await Task.Delay(_sweepEvery, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    // Host shutting down.
                }
            }
        }
    }
}
