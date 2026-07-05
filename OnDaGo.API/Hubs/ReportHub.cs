using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace OnDaGo.API.Hubs
{
    /// <summary>
    /// Real-time fan-out of report changes to the admin console. Writes go
    /// through the REST controller (single write path); it broadcasts
    /// "ReportUpdated"/"ReportDeleted" here after each change so every open
    /// admin Reports screen stays in sync without polling.
    ///
    /// Admin-only: reports contain user-submitted content, so unlike the public
    /// vehicle hub this one requires the Admin role. The JWT arrives via the
    /// ?access_token query string (wired in Startup for /hubs paths).
    /// </summary>
    [Authorize(Roles = "Admin")]
    public class ReportHub : Hub
    {
        /// <summary>A report was created or changed; payload is the report.</summary>
        public const string ReportUpdated = "ReportUpdated";

        /// <summary>A report was (soft) deleted; payload is its id.</summary>
        public const string ReportDeleted = "ReportDeleted";
    }
}
