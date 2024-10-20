using Android.App;
using Android.Runtime;

namespace Maui.Onion
{
    [Application]
    [MetaData("com.google.android.maps.v2.API_KEY",
        Value = "YOUR_GOOGLE_MAPS_API_KEY")]
    public class MainApplication : MauiApplication
    {
        public MainApplication(IntPtr handle, JniHandleOwnership ownership)
            : base(handle, ownership)
        {
        }

        protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();
    }
}
