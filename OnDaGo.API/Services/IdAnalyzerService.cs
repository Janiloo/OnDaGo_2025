using Microsoft.Extensions.Configuration;
using Newtonsoft.Json;
using OnDaGo.API.Models;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

public class IdAnalyzerService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _profileId;
    private readonly string _apiEndpoint;

    public IdAnalyzerService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _apiKey = configuration["IdAnalyzer:ApiKey"];
        _profileId = configuration["IdAnalyzer:ProfileId"];
        _apiEndpoint = configuration["IdAnalyzer:ApiEndpoint"];
    }

    public async Task<IdAnalyzerResponse> AnalyzeDocumentAsync(string documentBase64, string faceBase64)
    {
        // Configure request headers
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("X-API-KEY", _apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var requestBody = new
        {
            document = documentBase64,
            face = faceBase64,
            profile = _profileId
        };

        var content = new StringContent(JsonConvert.SerializeObject(requestBody), Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync(_apiEndpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            return new IdAnalyzerResponse { Success = false, Message = $"Failed to analyze ID or Selfie" };
        }

        // Read and log the full JSON response
        var jsonResponse = await response.Content.ReadAsStringAsync();
        Console.WriteLine("ID Analyzer Response: " + jsonResponse); // For debugging

        // Deserialize to a dynamic object to inspect structure if necessary
        dynamic responseObject = JsonConvert.DeserializeObject(jsonResponse);

        // Extract fields from the dynamic response
        var decisionField = responseObject?.decision?.ToString(); // Adjust this field based on actual response
        var resultField = responseObject?.result?.ToString();     // Another example field (update as needed)

        // Set the response based on these fields, as per the actual structure
        var idAnalyzerResponse = new IdAnalyzerResponse();

        if (decisionField == "accept" || resultField == "Approved")  // Adjust based on actual response
        {
            idAnalyzerResponse.Success = true;
            idAnalyzerResponse.Message = "Document approved by ID Analyzer.";
        }
        else
        {
            idAnalyzerResponse.Success = false;
            idAnalyzerResponse.Message = "Document rejected by ID Analyzer";
        }

        return idAnalyzerResponse;
    }
}
