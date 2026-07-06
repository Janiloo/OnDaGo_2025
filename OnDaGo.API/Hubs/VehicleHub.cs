using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace OnDaGo.API.Hubs
{
    /// <summary>
    /// Real-time fan-out of vehicle status. Writes still go through
    /// PATCH /api/Vehicle/{puvNo}/status (single write path, works from the
    /// driver's background task); the controller broadcasts "VehicleUpdated"
    /// after each successful write.
    ///
    /// Fan-out is scoped by SignalR GROUPS (Phase 5B) so a commuter filtered to
    /// one route only receives that route's pushes as the network grows:
    ///   - <see cref="AllGroup"/> — the firehose; every vehicle update. The admin
    ///     map and the commuter "All routes" view join this.
    ///   - <c>vehicles:route:{routeId}</c> — one route's updates only.
    /// A vehicle update is sent to AllGroup AND (if assigned) its route group.
    /// This is a pure bandwidth optimization: clients still seed/reconcile via
    /// GET /api/Vehicle and filter client-side, so a group hiccup only means
    /// slightly staler updates, never a blank map.
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

        /// <summary>Firehose group: every vehicle update.</summary>
        public const string AllGroup = "vehicles:all";

        /// <summary>Group name carrying only one route's vehicle updates.</summary>
        public static string RouteGroup(string routeId) => "vehicles:route:" + routeId;

        /// <summary>Client joins a fan-out group (the firehose or a single route).</summary>
        public Task Subscribe(string group) =>
            string.IsNullOrWhiteSpace(group) ? Task.CompletedTask : Groups.AddToGroupAsync(Context.ConnectionId, group);

        /// <summary>Client leaves a group (e.g. when it narrows to a single route).</summary>
        public Task Unsubscribe(string group) =>
            string.IsNullOrWhiteSpace(group) ? Task.CompletedTask : Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
    }
}
