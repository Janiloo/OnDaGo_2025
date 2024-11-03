using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net;
using System.Threading.Tasks;

namespace OnDaGO.MAUI.Services
{
    public class ApiService
    {
        private readonly HttpClient _httpClient;
        private readonly SecureStorageService _secureStorage;
        private readonly string _baseUrl;

        public ApiService(HttpClient httpClient, SecureStorageService secureStorage)
        {
            _httpClient = httpClient;
            _secureStorage = secureStorage;

            // Always use the production URL (Azure)
            _baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net:443";
        }

        // Example: GetProtectedDataAsync
        public async Task<string> GetProtectedDataAsync()
        {
            var token = await _secureStorage.GetTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                throw new UnauthorizedAccessException("No token found.");
            }

            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/protected-data"); // Adjust endpoint as necessary

            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync();
            }

            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                _secureStorage.DeleteToken(); // Use synchronous call
                throw new UnauthorizedAccessException("Token expired or invalid.");
            }

            throw new Exception("Failed to get protected data.");
        }

        // Example: DeleteAccountAsync
        public async Task<HttpResponseMessage> DeleteAccountAsync()
        {
            var token = await _secureStorage.GetTokenAsync();
            if (string.IsNullOrEmpty(token))
            {
                throw new UnauthorizedAccessException("No token found.");
            }

            Console.WriteLine($"Retrieved Token: {token}");
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Console.WriteLine($"Request URL: {_baseUrl}/api/users/delete-account");
            var response = await _httpClient.DeleteAsync($"{_baseUrl}/api/users/delete-account");

            Console.WriteLine($"Response Status Code: {response.StatusCode}");
            return response;
        }
    }
}
