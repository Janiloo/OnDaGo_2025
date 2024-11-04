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

        Application.Current.UserAppTheme = AppTheme.Light;

        // Set the new Azure domain URL
        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
            ? "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net"
            : "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";

        AuthApi = RestService.For<IAuthApi>(baseUrl);

        // Check for developer options if in release mode
#if RELEASE && ANDROID
        if (AreDeveloperOptionsEnabled())
        {
            MainPage = new ContentPage
            {
                Content = new Label
                {
                    Text = "Please disable developer options to use this app.",
                    HorizontalOptions = LayoutOptions.Center,
                    VerticalOptions = LayoutOptions.Center
                }
            };
            return; // Exit early if developer options are enabled
        }
#endif

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
            else if (userRole == "User")
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

#if ANDROID // Define the method only for Android
    private bool AreDeveloperOptionsEnabled()
    {
        // Import the Android namespace at the top of your file
        //using Android.Provider;

        var adbEnabled = Android.Provider.Settings.Global.GetInt(Android.App.Application.Context.ContentResolver, Android.Provider.Settings.Global.DevelopmentSettingsEnabled, 0);
        return adbEnabled == 1;
    }
#endif
}