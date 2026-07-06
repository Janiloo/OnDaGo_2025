using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;
using OnDaGo.API.Tenancy;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// A company-owned terminal (a fixed pick-up/drop-off point on the network).
    /// Tenant-scoped like <see cref="VehicleModel"/> and <c>ReportItem</c>: every
    /// read/write for the management surface goes through
    /// <c>TenantCollection&lt;Terminal&gt;</c>, so it can only ever touch the
    /// caller's own company. The commuter discovery layer reads across companies
    /// on a separate, explicit path.
    /// </summary>
    [MongoCollection("terminals")]
    [BsonIgnoreExtraElements]
    public class Terminal : ITenantEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        /// <summary>Owning company. Stamped on insert by TenantCollection.</summary>
        public string? CompanyId { get; set; }

        [BsonElement("name")]
        public string Name { get; set; } = "";

        /// <summary>Short human label (e.g. "MTL-1"); unique within a company.</summary>
        [BsonElement("code")]
        [BsonIgnoreIfNull]
        public string? Code { get; set; }

        [BsonElement("latitude")]
        public double Latitude { get; set; }

        [BsonElement("longitude")]
        public double Longitude { get; set; }

        /// <summary>
        /// RESERVED (Phase 2): link to a shared physical terminal used by multiple
        /// companies, so commuter discovery can later group co-located terminals.
        /// Nullable and unused for now — reserved to avoid a future migration.
        /// </summary>
        [BsonElement("canonicalTerminalId")]
        [BsonIgnoreIfNull]
        public string? CanonicalTerminalId { get; set; }

        /// <summary>Active | Retired. Deletes are soft (set Retired) — the enforced
        /// TenantCollection intentionally exposes no hard delete.</summary>
        [BsonElement("status")]
        public string Status { get; set; } = "Active";

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // GeoJSON mirror of latitude/longitude, maintained on every write so the
        // 2dsphere index can serve $near queries. Mongo-internal only — the API
        // exposes the plain latitude/longitude fields instead.
        [BsonElement("location")]
        [BsonIgnoreIfNull]
        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        public GeoJsonPoint<GeoJson2DGeographicCoordinates>? Location { get; set; }
    }
}
