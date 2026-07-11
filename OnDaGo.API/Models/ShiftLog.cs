using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// One completed driver shift (Tier 3). The duty markers on the vehicle doc
    /// are overwritten every shift — this collection is the durable history that
    /// driver-performance and utilization analytics read. Appended wherever a
    /// shift closes: the driver's offline call and the duty-timeout sweep.
    /// </summary>
    public class ShiftLog
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string? CompanyId { get; set; }

        [BsonElement("puvNo")]
        public required string PuvNo { get; set; }

        /// <summary>Driver holding the plate when the shift closed; null if unassigned.</summary>
        [BsonElement("driverId")]
        [BsonIgnoreIfNull]
        public string? DriverId { get; set; }

        /// <summary>Denormalized so analytics never needs a user join.</summary>
        [BsonElement("driverName")]
        [BsonIgnoreIfNull]
        public string? DriverName { get; set; }

        [BsonElement("routeId")]
        [BsonIgnoreIfNull]
        public string? RouteId { get; set; }

        [BsonElement("startedAt")]
        public DateTime StartedAt { get; set; }

        [BsonElement("endedAt")]
        public DateTime EndedAt { get; set; }

        /// <summary>"driver" (tapped end shift) | "timeout" (stopped broadcasting).</summary>
        [BsonElement("endReason")]
        public required string EndReason { get; set; }

        [BsonElement("durationMinutes")]
        public double DurationMinutes { get; set; }
    }
}
