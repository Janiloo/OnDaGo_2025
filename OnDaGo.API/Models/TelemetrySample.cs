using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// One per-vehicle snapshot of the live broadcast stream (Tier 3), sampled
    /// about once a minute while a vehicle is broadcasting. Broadcasts update
    /// the vehicle doc in place, so without this the occupancy and position
    /// history that passenger trends, utilization, and heatmaps read would be
    /// discarded three seconds after it existed.
    /// </summary>
    public class TelemetrySample
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string? CompanyId { get; set; }

        [BsonElement("puvNo")]
        public required string PuvNo { get; set; }

        [BsonElement("routeId")]
        [BsonIgnoreIfNull]
        public string? RouteId { get; set; }

        [BsonElement("lat")]
        public double Lat { get; set; }

        [BsonElement("lng")]
        public double Lng { get; set; }

        [BsonElement("passengerCount")]
        public int PassengerCount { get; set; }

        [BsonElement("maxPassengerCount")]
        public int MaxPassengerCount { get; set; }

        [BsonElement("at")]
        public DateTime At { get; set; }
    }
}
