using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;

namespace OnDaGO.MAUI.Models
{
    public class ReportItem
    {
        [BsonId]
        public ObjectId Id { get; set; }
        public string? UserId { get; set; }  // Make this nullable if not required
        public string Subject { get; set; }
        public string Description { get; set; }
        public string Status { get; set; }
        public bool IsImportant { get; set; } // New property to indicate importance
        public DateTime CreatedAt { get; set; }
        public DateTime? DeletedAt { get; set; } // Nullable for soft delete
    }
}
