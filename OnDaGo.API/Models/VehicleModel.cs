using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;
using OnDaGo.API.Tenancy;

[MongoCollection("coll_vehicles")]
public class VehicleModel : ITenantEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; } // MongoDB document ID

    /// <summary>Owning company. Added in Phase 1; vehicle management is scoped in a later phase.</summary>
    public string? CompanyId { get; set; }

    /// <summary>Assigned route (set in the Route phase).</summary>
    [BsonElement("routeId")]
    [BsonIgnoreIfNull]
    public string? RouteId { get; set; }

    /// <summary>"Active" | "Inactive" — null (legacy docs) means Active. An inactive
    /// vehicle is hidden from commuter feeds and rejects driver broadcasts.</summary>
    [BsonElement("status")]
    [BsonIgnoreIfNull]
    public string? Status { get; set; }

    // ---- Operational duty state (driver INTENT), deliberately separate from
    // LastUpdated (connection HEALTH). Transitions are server-owned: any
    // broadcast from an off-duty vehicle starts a shift; the driver's offline
    // call ends it (reason "driver"); DutyTimeoutService ends abandoned ones
    // (reason "timeout"). "OnDuty" + a stale LastUpdated = signal lost, a state
    // that timestamps alone could not express.

    /// <summary>"OnDuty" | "OffDuty" — null (legacy docs) means OffDuty.</summary>
    [BsonElement("dutyStatus")]
    [BsonIgnoreIfNull]
    public string? DutyStatus { get; set; }

    [BsonElement("dutyStartedAt")]
    [BsonIgnoreIfNull]
    public DateTime? DutyStartedAt { get; set; }

    [BsonElement("dutyEndedAt")]
    [BsonIgnoreIfNull]
    public DateTime? DutyEndedAt { get; set; }

    /// <summary>How the last shift ended: "driver" (tapped end shift) | "timeout" (stopped broadcasting).</summary>
    [BsonElement("dutyEndReason")]
    [BsonIgnoreIfNull]
    public string? DutyEndReason { get; set; }

    [BsonElement("currentLong")]
    public double CurrentLong { get; set; }

    [BsonElement("currentLat")]
    public double CurrentLat { get; set; }

    [BsonElement("puv_no")]
    public required string PuvNo { get; set; } // PUV number

    [BsonElement("maxPassengerCount")]
    public int MaxPassengerCount { get; set; } // New field for maximum passenger count

    [BsonElement("passengerCount")]
    public int PassengerCount { get; set; } // New field for current passenger count

    [BsonElement("lastUpdated")]
    [BsonIgnoreIfNull]
    public DateTime? LastUpdated { get; set; } // Set on every status broadcast; used by clients to detect stale/offline vehicles

    // GeoJSON mirror of currentLat/currentLong, maintained on every status
    // update so the 2dsphere index can serve $near queries without full scans.
    // Mongo-internal only — excluded from API/SignalR payloads.
    [BsonElement("location")]
    [BsonIgnoreIfNull]
    [Newtonsoft.Json.JsonIgnore]
    [System.Text.Json.Serialization.JsonIgnore]
    public GeoJsonPoint<GeoJson2DGeographicCoordinates>? Location { get; set; }
}
