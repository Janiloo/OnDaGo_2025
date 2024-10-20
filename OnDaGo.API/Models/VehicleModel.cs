using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

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
    public int PuvNo { get; set; } // PUV number

    [BsonElement("maxPassengerCount")]
    public int MaxPassengerCount { get; set; } // New field for maximum passenger count

    [BsonElement("passengerCount")]
    public int PassengerCount { get; set; } // New field for current passenger count
}
