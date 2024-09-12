using Microsoft.Maui.Storage;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public class SecureStorageService
    {
        private const string TokenKey = "jwt_token";

        public async Task<string> GetTokenAsync()
        {
            return await SecureStorage.GetAsync(TokenKey);
        }

        public async Task SaveTokenAsync(string token)
        {
            if (!string.IsNullOrEmpty(token))
            {
                await SecureStorage.SetAsync(TokenKey, token);
            }
        }

        public void DeleteToken() // Use synchronous method
        {
            SecureStorage.Remove(TokenKey);
        }
    }
}
