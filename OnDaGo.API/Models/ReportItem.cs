using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;

public class ReportItem
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string? UserId { get; set; }  // Make this nullable if not required

    public string Subject { get; set; }
    public string Description { get; set; }
    public string Status { get; set; }
    public bool IsImportant { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
