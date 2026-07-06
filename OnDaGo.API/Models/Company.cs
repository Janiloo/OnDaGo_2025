using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OnDaGo.API.Models
{
    /// <summary>
    /// A tenant: a transport cooperative operating inside OnDaGO. All
    /// company-owned data (vehicles, drivers, terminals, routes, reports) is
    /// scoped by this company's id.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class Company
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

        public string Name { get; set; } = "";
        public string Slug { get; set; } = "";
        public string? LogoUrl { get; set; }
        /// <summary>Small logo stored inline as a data URI (Tier 2 branding) —
        /// size-capped at upload so the company document stays lean.</summary>
        public string? LogoDataUri { get; set; }
        /// <summary>Brand accent color (#RRGGBB) for commuter-facing UI.</summary>
        public string? BrandColor { get; set; }
        public string? ContactEmail { get; set; }
        public string? Phone { get; set; }

        /// <summary>Active | Suspended — platform-level on/off switch.</summary>
        public string Status { get; set; } = "Active";

        /// <summary>Unverified | Verified | Suspended — trust level for commuter discovery.</summary>
        public string VerificationStatus { get; set; } = "Unverified";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
