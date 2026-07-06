using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Models;
//using OnDaGO.MAUI.Handlers;
using The49.Maui.BottomSheet;

namespace OnDaGO.MAUI;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .UseMauiMaps()
            .UseBottomSheet()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

#if DEBUG
        builder.Logging.AddDebug();
#endif

        // Safety net: catch any unhandled exceptions from async void / timers
        // so they appear in the logcat AND get persisted to a file that
        // survives the process being killed (a Console.WriteLine is lost the
        // instant the app closes, which is exactly the symptom we're chasing).
        AppDomain.CurrentDomain.UnhandledException += (sender, e) =>
        {
            LogFatal("AppDomain.UnhandledException", e.ExceptionObject);
        };
        TaskScheduler.UnobservedTaskException += (sender, e) =>
        {
            LogFatal("TaskScheduler.UnobservedTaskException", e.Exception);
            e.SetObserved(); // prevent the runtime from tearing down the process
        };

#if ANDROID
        // The two handlers above only see *managed* exceptions. A crash coming
        // from the native Google Maps view (bad/disabled API key, no Play
        // Services) surfaces here, on the Android side, and is otherwise a
        // silent instant close with no error UI.
        Android.Runtime.AndroidEnvironment.UnhandledExceptionRaiser += (sender, e) =>
        {
            LogFatal("AndroidEnvironment.UnhandledExceptionRaiser", e.Exception);
            e.Handled = false; // still let it crash, but now it's logged
        };
#endif

        return builder.Build();
    }

    // Writes to Debug output, Console, and a crash file under AppDataDirectory
    // so you can pull it after an instant close (see logcat instructions).
    static void LogFatal(string source, object error)
    {
        var msg = $"[FATAL] {DateTime.Now:O} {source}:\n{error}";
        System.Diagnostics.Debug.WriteLine(msg);
        Console.WriteLine(msg);
        try
        {
            var path = System.IO.Path.Combine(FileSystem.AppDataDirectory, "crash.log");
            System.IO.File.AppendAllText(path, msg + "\n\n");
        }
        catch { /* never let the logger throw */ }
    }
}