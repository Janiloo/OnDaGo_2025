using Foundation;
using UIKit;

namespace OnDaGO.MAUI;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool FinishedLaunching(UIApplication app, NSDictionary options)
    {
        // Set the status bar style to light content
        UIApplication.SharedApplication.SetStatusBarStyle(UIStatusBarStyle.LightContent, false);

        // Make the status bar transparent (if using navigation controller, set its appearance)
        UINavigationBar.Appearance.SetBackgroundImage(new UIImage(), UIBarMetrics.Default);
        UINavigationBar.Appearance.ShadowImage = new UIImage();
        UINavigationBar.Appearance.Translucent = true;

        return base.FinishedLaunching(app, options);
    }
}
