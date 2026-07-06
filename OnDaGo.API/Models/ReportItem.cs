using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using OnDaGo.API.Tenancy;

[MongoCollection("reports")]
public class ReportItem : ITenantEntity
{
    // Stored as an ObjectId in Mongo but exposed to the API/clients as its hex
    // string, so the id round-trips through JSON (previously [JsonIgnore]'d,
    // which left clients unable to target a report for update/delete).
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    /// <summary>Owning company (the operator the report concerns). Scoped by TenantCollection.</summary>
    public string? CompanyId { get; set; }

    public string? UserId { get; set; }

    public string Subject { get; set; }
    public string Description { get; set; }

    /// <summary>Pending | InProgress | Completed.</summary>
    public string Status { get; set; } = "Pending";

    public bool IsImportant { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Set when the report is marked Completed; cleared if reopened.</summary>
    public DateTime? CompletedAt { get; set; }
    /// <summary>Soft-delete marker; non-null rows are hidden from every query.</summary>
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

/// <summary>Body for PATCH /api/Reports/{id}/status.</summary>
public class UpdateReportStatusDto
{
    public string Status { get; set; } = "Pending";
}

/// <summary>Body for PATCH /api/Reports/{id}/important (mark important or not).</summary>
public class SetImportantDto
{
    public bool IsImportant { get; set; }
}
