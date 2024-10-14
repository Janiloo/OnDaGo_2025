using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using OnDaGO.MAUI.Services;
using OnDaGO.MAUI.Models;
using OnDaGO.MAUI.Handlers;
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

        // Register custom map handler for custom pins
        builder.ConfigureMauiHandlers(handlers =>
        {
#if ANDROID || IOS || MACCATALYST
            handlers.AddHandler<Microsoft.Maui.Controls.Maps.Map, CustomMapHandler>();
#endif
        });

        return builder.Build();
    }
}
