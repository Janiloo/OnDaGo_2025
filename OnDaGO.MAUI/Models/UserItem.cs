namespace OnDaGO.MAUI.Models
{
    public class UserItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string PhoneNumber { get; set; }

        //public string DocumentImageBase64 { get; set; } // Base64 string for ID document
        //public string FaceImageBase64 { get; set; } // Base64 string for selfie image

        public string Role { get; set; } = "User";  // New Role property with default value "User"
        public string PlateNumber { get; set; }
        public string ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string Email { get; set; }
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

    public class UpdateProfileRequest
    {
        public string Name { get; set; }
        public string PhoneNumber { get; set; }
        // Add other fields as needed, such as address, profile picture URL, etc.
    }

    public class DriverRegistrationRequest
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string PlateNumber { get; set; }

        public string Role { get; set; } = "Driver"; // Default role is Driver

    }

    public class VehicleStatusUpdateRequest
    {
        public int PassengerCount { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
    }
}
