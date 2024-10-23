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

        /*public ApiService(HttpClient httpClient, SecureStorageService secureStorage)
        {
            _httpClient = httpClient;
            _secureStorage = secureStorage;

            // Use DeviceInfo.Platform to set the base URL
            _baseUrl = DeviceInfo.Platform == DevicePlatform.Android
                ? "http://10.0.2.2:5147" // For Android emulator
                : "https://localhost:7140"; // For Windows and other platforms
        }*/

        /*public ApiService(HttpClient httpClient, SecureStorageService secureStorage)
        {
            _httpClient = httpClient;
            _secureStorage = secureStorage;

            // Change this based on your environment settings
            bool isTestingLocally = false; // Set this based on your environment configuration

            _baseUrl = isTestingLocally
                ? (DeviceInfo.Platform == DevicePlatform.Android ? "http://10.0.2.2:5147" : "https://localhost:7140")
                : "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";
        }*/

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

            // Handle token expiry or other errors
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                // Token might be expired or invalid
                _secureStorage.DeleteToken(); // Use synchronous call
                throw new UnauthorizedAccessException("Token expired or invalid.");
            }

            throw new Exception("Failed to get protected data.");
        }

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
            Console.WriteLine($"Authorization Header: Bearer {token}");

            var response = await _httpClient.DeleteAsync($"{_baseUrl}/api/users/delete-account");

            Console.WriteLine($"Response Status Code: {response.StatusCode}");
            var responseContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Response Content: {responseContent}");

            return response;
        }


    }
}
