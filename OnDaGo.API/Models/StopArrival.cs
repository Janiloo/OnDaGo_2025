using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// One recorded terminal arrival (Tier 2): a broadcasting vehicle came within
    /// the arrival radius of a stop on its route. This is the raw material for
    /// historical per-segment travel times — it can't be backfilled, so recording
    /// starts as early as possible even though nothing consumes it yet.
    /// </summary>
    public class StopArrival
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        public string? CompanyId { get; set; }

        [BsonElement("routeId")]
        public required string RouteId { get; set; }

        [BsonElement("terminalId")]
        public required string TerminalId { get; set; }

        [BsonElement("puvNo")]
        public required string PuvNo { get; set; }

        [BsonElement("at")]
        public DateTime At { get; set; }
    }
}
