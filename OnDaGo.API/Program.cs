using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using OnDaGo.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Create an instance of the Startup class and configure services.
var startup = new Startup();
startup.ConfigureServices(builder.Services);

var app = builder.Build();

// Configure the HTTP request pipeline using the Startup class.
startup.Configure(app, builder.Environment);

// Ensure MongoDB indexes (unique plate number + 2dsphere on vehicle location).
// Idempotent and non-fatal: index creation failing (e.g. DB unreachable at
// boot) shouldn't stop the API from serving.
_ = Task.Run(async () =>
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        await VehicleService.EnsureIndexesAsync(db);
        await TerminalService.EnsureIndexesAsync(db);
        await RouteService.EnsureIndexesAsync(db);
        await StopArrivalService.EnsureIndexesAsync(db);
        await ShiftLogService.EnsureIndexesAsync(db);
        await TelemetryService.EnsureIndexesAsync(db);
        app.Logger.LogInformation("Vehicle, terminal, and route indexes ensured.");
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not create vehicle indexes at startup.");
    }
});

app.Run();
