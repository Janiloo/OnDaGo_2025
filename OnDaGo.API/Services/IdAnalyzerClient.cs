using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration; // Add this namespace for IConfiguration

public class IdAnalyzerClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<IdAnalyzerClient> _logger;
    private readonly string _apiKey; // Store API Key
    private readonly string _apiUrl; // Store API URL

    // Include IConfiguration in the constructor
    public IdAnalyzerClient(HttpClient httpClient, ILogger<IdAnalyzerClient> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _logger = logger; // Initialize the logger

        // Fetch the API key and endpoint from configuration
        _apiKey = configuration["IdAnalyzer:ApiKey"];
        _apiUrl = configuration["IdAnalyzer:ApiEndpoint"];

        _httpClient.DefaultRequestHeaders.Add("X-API-KEY", _apiKey);
    }

    public async Task<JObject> AnalyzeIdAsync(string documentImageBase64, string selfieImageBase64)
    {
        var payload = new
        {
            document_image = documentImageBase64, // Ensure these keys match the API documentation
            selfie_image = selfieImageBase64,
            profile = "e6100e38b213422dbff682c3ae7ba49d", // Ensure this is included if required
            output_image = true
        };

        var jsonContent = new StringContent(
            Newtonsoft.Json.JsonConvert.SerializeObject(payload),
            Encoding.UTF8,
            "application/json");

        // Use _apiUrl here instead of ApiUrl
        var response = await _httpClient.PostAsync(_apiUrl, jsonContent);

        if (!response.IsSuccessStatusCode)
        {
            var errorMessage = await response.Content.ReadAsStringAsync();
            // Log the response body for more context
            _logger.LogError($"ID Analyzer API error: {response.StatusCode} - {errorMessage}");
            return null; // or throw a specific exception
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        return JObject.Parse(responseBody);
    }
}
