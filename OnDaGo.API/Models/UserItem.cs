using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace OnDaGo.API.Models
{
    public class UserItem
    {
        [BsonId]
        public ObjectId Id { get; set; } = ObjectId.GenerateNewId();

        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; } = "User";
        public string DocumentImageBase64 { get; set; } // Base64 string for ID document
        public string FaceImageBase64 { get; set; } // Base64 string for selfie image

        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class UserRegistrationRequest
    {
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string PhoneNumber { get; set; }
        public string Role { get; set; } = "User";
        public string? DocumentImageBase64 { get; set; } // Base64 string for ID document
        public string? FaceImageBase64 { get; set; } // Base64 string for selfie image
    }


    public class UserRegistrationModel
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
    }


}