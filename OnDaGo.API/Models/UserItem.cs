using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OnDaGo.API.Models
{
    [BsonIgnoreExtraElements]
    public class UserItem
    {
        
        public ObjectId Id { get; set; } = ObjectId.GenerateNewId();

        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; } = "User";
        //public string DocumentImageBase64 { get; set; } // Base64 string for ID document
        //public string FaceImageBase64 { get; set; } // Base64 string for selfie image

        /// <summary>SHA-256 hash (hex) of the reset code — the raw code is never stored.</summary>
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        /// <summary>Failed change-password attempts against the current token; token is invalidated after 5.</summary>
        public int ResetTokenAttempts { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? PlateNumber { get; set; }

        //public string VerificationStatus { get; set; }

    }

    public class UserRegistrationRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; } = "User";
        //public string? DocumentImageBase64 { get; set; } // Base64 string for ID document
        //public string? FaceImageBase64 { get; set; } // Base64 string for selfie image
    }


    /*public class UserRegistrationModel
    {
        public string DocumentImageBase64 { get; set; } // Base64 string for ID document
        public string FaceImageBase64 { get; set; } // Base64 string for selfie image
    }


    public class IdAnalyzerResponse
    {
        // Define the fields based on the IdAnalyzer API response structure.
        public bool Success { get; set; }
        public string Result { get; set; }
        public string Message { get; set; }
        // Add other fields as per the API documentation.
    }*/

    public class DriverRegistrationRequest
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string PlateNumber { get; set; }

        public string Role { get; set; } = "Driver";
    }

    public class VehicleStatusUpdateRequest
    {
        public int PassengerCount { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }

}