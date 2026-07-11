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

    /// <summary>Owning company (the operator the report concerns). Scoped by TenantCollection.
    /// For a commuter report this is the bus company they selected; for a driver report it is
    /// the driver's own company. Set explicitly on create — see ReportService.SubmitAsync.</summary>
    public string? CompanyId { get; set; }

    public string? UserId { get; set; }

    /// <summary>"Commuter" | "Driver" — who filed it. Null on legacy rows.</summary>
    public string? ReporterRole { get; set; }
    /// <summary>Denormalized reporter name so the admin list needs no user join.</summary>
    public string? ReporterName { get; set; }

    /// <summary>Plate/PUV number the report concerns (driver's own, or a commuter's optional pick).</summary>
    public string? PlateNumber { get; set; }
    /// <summary>Resolved vehicle id when the plate matches a vehicle in the owning company.</summary>
    public string? VehicleId { get; set; }

    public string Subject { get; set; }
    public string Description { get; set; }

    /// <summary>When the incident happened (commuter optional); distinct from CreatedAt (filed-at).</summary>
    public DateTime? IncidentAt { get; set; }
    /// <summary>Free-text incident location (commuter optional).</summary>
    public string? IncidentLocation { get; set; }

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
    // Nullable so the controller's own validation (with clear messages) runs
    // instead of [ApiController]'s automatic 400 on a missing non-nullable field.
    public string? Subject { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public bool IsImportant { get; set; }

    /// <summary>The bus company the report concerns. REQUIRED for commuter reports;
    /// ignored for drivers (their own company is used). Server validates it.</summary>
    public string? CompanyId { get; set; }
    /// <summary>Optional plate the commuter is reporting about.</summary>
    public string? PlateNumber { get; set; }
    public DateTime? IncidentAt { get; set; }
    public string? IncidentLocation { get; set; }
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
