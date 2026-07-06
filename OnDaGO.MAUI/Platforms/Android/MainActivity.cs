using Android.App;
using Android.Content.PM;
using Android.OS;
using Android.Views;
using AndroidX.AppCompat.App;

namespace OnDaGO.MAUI;

[Activity(
    Theme = "@style/Maui.SplashTheme",
    MainLauncher = true,
    LaunchMode = LaunchMode.SingleTop,
    ConfigurationChanges = ConfigChanges.ScreenSize
        | ConfigChanges.Orientation
        | ConfigChanges.UiMode
        | ConfigChanges.ScreenLayout
        | ConfigChanges.SmallestScreenSize
        | ConfigChanges.Density)]
public class MainActivity : MauiAppCompatActivity
{
    protected override void OnCreate(Bundle savedInstanceState)
    {
        base.OnCreate(savedInstanceState);

        // ✅ Force light mode for this activity (Android 10+)
        if (Build.VERSION.SdkInt >= BuildVersionCodes.Q)
        {
            AppCompatDelegate.DefaultNightMode = AppCompatDelegate.ModeNightNo;
        }

        // ✅ Set system bar colors for a clean light look
        if (Build.VERSION.SdkInt >= BuildVersionCodes.Lollipop)
        {
            // Status bar - white background, dark icons
            Window.SetStatusBarColor(Android.Graphics.Color.White);
            Window.DecorView.SystemUiVisibility =
                (StatusBarVisibility)(SystemUiFlags.LightStatusBar | SystemUiFlags.LightNavigationBar);

            // Navigation bar - white background (for consistency)
            Window.SetNavigationBarColor(Android.Graphics.Color.White);
        }
    }
}
