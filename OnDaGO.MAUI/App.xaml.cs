using Refit;
using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Views;
using OnDaGO.MAUI.Models; // Added for UserItem
using Newtonsoft.Json.Linq;
using System.IdentityModel.Tokens.Jwt;

namespace OnDaGO.MAUI;

public partial class App : Application
{
    public static IAuthApi AuthApi { get; private set; }

    // 🔹 Store the currently logged-in user
    public static UserItem CurrentUser { get; set; }

    public App()
    {
        InitializeComponent();

        Application.Current.UserAppTheme = AppTheme.Light;

#if DEBUG
        string baseUrl = DeviceInfo.Platform == DevicePlatform.Android
            ? "http://10.0.2.2:5147"  // Android emulator to your local machine
            : "http://localhost:5147"; // Running on Windows/Mac
#else
        string baseUrl = "https://ondago-api-akfye0eahsamhrgt.southeastasia-01.azurewebsites.net";
#endif
        //string baseUrl = "https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net";

        AuthApi = RestService.For<IAuthApi>(baseUrl);

        // 🔸 Developer Options check (DISABLED)
        /*
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
            return;
        }
        #endif
        */

        // Check if the user is already logged in
        var token = SecureStorage.GetAsync("jwt_token").Result;
        var userId = SecureStorage.GetAsync("user_id").Result;

        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(userId))
        {
            var userRole = GetUserRoleFromToken(token);

            // Set minimal CurrentUser (you can fetch full details later)
            CurrentUser = new UserItem
            {
                Id = userId,
                Role = userRole
            };

            // Redirect based on the user's role
            if (userRole == "Admin")
            {
                MainPage = new NavigationPage(new AdminHomePage());
            }
            else if (userRole == "Driver")
            {
                MainPage = new NavigationPage(new DriversHomePage());
            }
            else
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
        var jwtHandler = new JwtSecurityTokenHandler();
        var jwtToken = jwtHandler.ReadJwtToken(token);

        var roleClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == "role");
        return roleClaim?.Value;
    }

#if ANDROID
    private bool AreDeveloperOptionsEnabled()
    {
        var adbEnabled = Android.Provider.Settings.Global.GetInt(
            Android.App.Application.Context.ContentResolver,
            Android.Provider.Settings.Global.DevelopmentSettingsEnabled,
            0);

        return adbEnabled == 1;
    }
#endif
}
