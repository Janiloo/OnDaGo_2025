using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Bson;
using Newtonsoft.Json;

public class ReportItem
{
    [BsonId]
    [JsonIgnore]
    public ObjectId Id { get; set; }

    public string? UserId { get; set; }  // Make this nullable if not required

    public string Subject { get; set; }
    public string Description { get; set; }
    public string Status { get; set; }
    public bool IsImportant { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}
public class CreateReportDto
{
    public string? UserId { get; set; }
    public string Subject { get; set; }
    public string Description { get; set; }
    public string Status { get; set; }
    public bool IsImportant { get; set; }
}
