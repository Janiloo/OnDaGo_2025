using Refit;
using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Views;
using Newtonsoft.Json.Linq;
using System.IdentityModel.Tokens.Jwt;

namespace OnDaGO.MAUI;

public partial class App : Application
{
    public static IAuthApi AuthApi { get; private set; }

    public App()
    {
        InitializeComponent();

        // Use DeviceInfo.Platform to set the base URL
        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
            ? "http://10.0.2.2:5147" // For Android emulator
            : "https://localhost:7140"; // For Windows and other platforms

        AuthApi = RestService.For<IAuthApi>(baseUrl);

        // Check if the user is already logged in
        var token = SecureStorage.GetAsync("jwt_token").Result;
        if (!string.IsNullOrEmpty(token))
        {
            // Extract role information from the JWT token
            var userRole = GetUserRoleFromToken(token);

            // Redirect based on the user's role
            if (userRole == "Admin")
            {
                MainPage = new NavigationPage(new AdminHomePage());
            }
            if (userRole == "User")
            {
                MainPage = new NavigationPage(new HomePage());
            }
        }
        else
        {
            MainPage = new NavigationPage(new LoginPage());
        }
    }

    private string GetUserRoleFromToken(string token)
    {
        // Decode the JWT token to extract the role information
        var jwtHandler = new JwtSecurityTokenHandler();
        var jwtToken = jwtHandler.ReadJwtToken(token);

        // Assuming the role is stored in the "role" claim in the JWT
        var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role");
        return roleClaim?.Value;
    }
}
