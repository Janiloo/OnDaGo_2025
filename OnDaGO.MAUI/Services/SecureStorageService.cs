using Microsoft.Maui.Storage;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public class SecureStorageService
    {
        private const string TokenKey = "jwt_token";
        private const string UserIdKey = "user_id"; // New key for storing user ID

        // Method to get the JWT token
        public async Task<string> GetTokenAsync()
        {
            return await SecureStorage.GetAsync(TokenKey);
        }

        // Method to save the JWT token
        public async Task SaveTokenAsync(string token)
        {
            if (!string.IsNullOrEmpty(token))
            {
                await SecureStorage.SetAsync(TokenKey, token);
            }
        }

        // Method to delete the JWT token
        public void DeleteToken() // Use synchronous method
        {
            SecureStorage.Remove(TokenKey);
        }

        // Method to get the user ID
        public async Task<string> GetUserIdAsync()
        {
            return await SecureStorage.GetAsync(UserIdKey);
        }

        // Method to save the user ID
        public async Task SaveUserIdAsync(string userId)
        {
            if (!string.IsNullOrEmpty(userId))
            {
                await SecureStorage.SetAsync(UserIdKey, userId);
            }
        }

        // Method to delete the user ID
        public void DeleteUserId() // Use synchronous method
        {
            SecureStorage.Remove(UserIdKey);
        }
    }
}
