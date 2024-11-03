using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.IO;
using OnDaGO.MAUI.Models;

namespace OnDaGO.MAUI.Services
{
    public class IdAnalyzerService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiUrl = "https://api.idanalyzer.com/scan"; // ID Analyzer API endpoint
        private readonly string _apiKey = "YOUR_ID_ANALYZER_API_KEY"; // Restricted API Key

        public IdAnalyzerService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<(bool Success, string ErrorMessage, string AnalysisResult)> AnalyzeIdAsync(string documentFrontBase64, string documentBackBase64, string selfieBase64)
        {
            // Prepare the request payload
            var json = JsonSerializer.Serialize(new
            {
                api_key = _apiKey,
                document = documentFrontBase64,
                document_back = documentBackBase64,
                face = selfieBase64,
                profile = "security_medium"
            });

            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync(_apiUrl, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();

                    // Deserialize the JSON response
                    var result = JsonSerializer.Deserialize<IdAnalyzerResponse>(responseBody);

                    if (result.Success)
                    {
                        // Successful analysis
                        return (true, null, responseBody); // Or return specific analysis details if needed
                    }
                    else
                    {
                        // API returned an error
                        return (false, result.Error?.Message ?? "Unknown error from ID Analyzer.", null);
                    }
                }
                else
                {
                    // Handle HTTP error response
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return (false, $"ID analysis request failed with status code {response.StatusCode}: {errorContent}", null);
                }
            }
            catch (Exception ex)
            {
                // Handle any unexpected errors
                return (false, $"An error occurred while analyzing the ID: {ex.Message}", null);
            }
        }
    }


    // Response model based on ID Analyzer's JSON response format
    public class IdAnalyzerResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error")]
        public IdAnalyzerError Error { get; set; }

        [JsonPropertyName("result")]
        public IdAnalyzerResult Result { get; set; }
    }

    public class IdAnalyzerError
    {
        [JsonPropertyName("message")]
        public string Message { get; set; }
    }

    public class IdAnalyzerResult
    {
        // Add properties here based on the analysis details in ID Analyzer's response.
        // For example:
        [JsonPropertyName("match")]
        public bool Match { get; set; }

        [JsonPropertyName("details")]
        public string Details { get; set; }

        // Additional fields can be added based on ID Analyzer's API documentation.
    }
}
