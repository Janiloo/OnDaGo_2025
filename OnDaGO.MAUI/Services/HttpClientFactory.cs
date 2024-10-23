using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.Maui.Storage;

public static class HttpClientFactory
{
    /*public static HttpClient CreateClient()
    {
        // Use DeviceInfo.Platform to set the base URL
        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
            ? "http://10.0.2.2:5147" // For Android emulator
            : "https://localhost:7140"; // For Windows and other platforms

        var handler = new HttpClientHandler
        {
            // Bypass SSL certificate validation
            ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true
        };

        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri(baseUrl)
        };

        var token = SecureStorage.GetAsync("jwt_token").Result;

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return client;
    }*/

    public static HttpClient CreateClient()
    {
        // Set the base URL to your Azure backend URL
        string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";

        var handler = new HttpClientHandler
        {
            // Bypass SSL certificate validation (consider removing this in production)
            ServerCertificateCustomValidationCallback = (message, cert, chain, sslPolicyErrors) => true
        };

        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri(baseUrl)
        };

        var token = SecureStorage.GetAsync("jwt_token").Result;

        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        return client;
    }

}
