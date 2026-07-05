using Microsoft.AspNetCore.SignalR;

namespace OnDaGo.API.Hubs
{
    /// <summary>
    /// Real-time fan-out of vehicle status. Writes still go through
    /// PATCH /api/Vehicle/{puvNo}/status (single write path, works from the
    /// driver's background task); the controller broadcasts "VehicleUpdated"
    /// to all connected clients after each successful write.
    ///
    /// Kept anonymous for now (positions are public read data within the app);
    /// JWT-over-query-string is already wired in Startup so this can become
    /// [Authorize] without client changes once the auth branch is merged.
    /// </summary>
    public class VehicleHub : Hub
    {
        /// <summary>Event name for a single updated vehicle.</summary>
        public const string VehicleUpdated = "VehicleUpdated";

        /// <summary>Event name signalling a vehicle went offline (driver ended shift).
        /// Payload is the PUV number so clients drop it immediately.</summary>
        public const string VehicleOffline = "VehicleOffline";
    }
}
