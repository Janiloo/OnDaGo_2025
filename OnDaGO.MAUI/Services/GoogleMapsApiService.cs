using Newtonsoft.Json.Linq;

namespace OnDaGO.MAUI.Services;

public class GoogleMapsApiService
{

    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public GoogleMapsApiService(string apiKey)
    {
        _apiKey = apiKey;
        _httpClient = new HttpClient();
    }

    public async Task<JObject> GetGeocodeAsync(string address)
    {
        var requestUri = $"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={_apiKey}";
        var response = await _httpClient.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();
        var responseContent = await response.Content.ReadAsStringAsync();
        // Log the entire response to the console
        Console.WriteLine(responseContent); // Add this line to log the raw response
        return JObject.Parse(responseContent);
    }

    public async Task<JObject> GetReverseGeocodeAsync(double latitude, double longitude)
    {
        var requestUri = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={latitude},{longitude}&key={_apiKey}";
        var response = await _httpClient.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();
        var responseContent = await response.Content.ReadAsStringAsync();
        return JObject.Parse(responseContent);
    }

    public async Task<JObject> GetDirectionsAsync(double originLat, double originLng, double destLat, double destLng)
    {
        var requestUri = $"https://maps.googleapis.com/maps/api/directions/json?origin={originLat},{originLng}&destination={destLat},{destLng}&key={_apiKey}";
        var response = await _httpClient.GetAsync(requestUri);
        response.EnsureSuccessStatusCode();
        var responseContent = await response.Content.ReadAsStringAsync();
        return JObject.Parse(responseContent);
    }


    public async Task<(double Latitude, double Longitude)> GeocodeAddressAsync(string address)
    {
        var geocodeResult = await GetGeocodeAsync(address);
        var location = geocodeResult["results"][0]["geometry"]["location"];
        return (location["lat"].Value<double>(), location["lng"].Value<double>());
    }
}
