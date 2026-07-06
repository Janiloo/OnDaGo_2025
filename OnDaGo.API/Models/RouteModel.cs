using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// A company-owned route: an ordered chain of the company's own
    /// <see cref="Terminal"/>s (origin → destination). Named RouteModel (not
    /// Route) to avoid colliding with ASP.NET routing types, matching the
    /// VehicleModel convention. Tenant-scoped like Terminal; the commuter
    /// discovery layer reads across companies on a separate path.
    /// </summary>
    [MongoCollection("routes")]
    [BsonIgnoreExtraElements]
    public class RouteModel : ITenantEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        /// <summary>Owning company. Stamped on insert by TenantCollection.</summary>
        public string? CompanyId { get; set; }

        [BsonElement("name")]
        public string Name { get; set; } = "";

        /// <summary>Short human label (e.g. "MTL-CUB"); unique within a company.</summary>
        [BsonElement("code")]
        [BsonIgnoreIfNull]
        public string? Code { get; set; }

        /// <summary>Ordered Terminal ids (origin → destination). Every id must be a
        /// terminal owned by the same company — validated on write.</summary>
        [BsonElement("terminalIds")]
        public List<string> TerminalIds { get; set; } = new();

        /// <summary>Active | Retired. Soft-delete, like Terminal.</summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Active";

        /// <summary>
        /// RESERVED (Phase 3): an optional road-following polyline for drawing the
        /// route on the commuter map. Nullable and unused for now — the client can
        /// connect the terminals directly until this is populated.
        /// </summary>
        [BsonElement("path")]
        [BsonIgnoreIfNull]
        public List<RoutePathPoint>? Path { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class RoutePathPoint
    {
        [BsonElement("lat")]
        public double Latitude { get; set; }

        [BsonElement("lng")]
        public double Longitude { get; set; }
    }
}
