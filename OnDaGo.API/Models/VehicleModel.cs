using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

public class VehicleModel
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; } // MongoDB document ID

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
