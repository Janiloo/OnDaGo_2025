using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Text;
using System.Threading.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi.Models;
using OnDaGo.API.Services;

public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // MongoDB configuration
        services.AddSingleton<IMongoClient, MongoClient>(sp =>
        {
            var settings = sp.GetRequiredService<IConfiguration>().GetConnectionString("MongoDb");
            return new MongoClient(settings);
        });

        services.AddSingleton(sp =>
        {
            var client = sp.GetRequiredService<IMongoClient>();
            return client.GetDatabase("db_ondago");
        });

        // Add your services here
        services.AddScoped<UserService>();
        services.AddScoped<EmailService>(); // Add EmailService
        services.AddScoped<FareMatrixService>();  // Register FareMatrixService
        services.AddScoped<ReportService>();
        services.AddControllers();
        services.AddScoped<IdAnalyzerClient>();
        //services.AddScoped<IdAnalyzerService>();
        services.AddHttpClient<IdAnalyzerClient>();
        //services.AddHttpClient<IdAnalyzerService>();
        services.AddScoped<VehicleService>();     // Register Vehicle service
        services.AddLogging();

        // JSON serialization
        services.AddControllers().AddNewtonsoftJson();

        // Real-time vehicle fan-out (see Hubs/VehicleHub.cs).
        // Ping clients every 10s (they tolerate 60s of silence); allow mobile
        // clients 60s of silence before the server drops them — phones
        // background apps and stall timers far more than browsers do.
        services.AddSignalR(options =>
        {
            options.KeepAliveInterval = TimeSpan.FromSeconds(10);
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(60);
        });

        // CORS configuration
        services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigins", builder =>
            {
                builder.WithOrigins(
                    "https://ondago-api-akfye0eahsamhrgt.southeastasia-01.azurewebsites.net",
                    "http://localhost:5147",
                    "http://10.0.2.2:5147"
                )
                .AllowAnyMethod()
                .AllowAnyHeader();
            });

            // Development-only: Expo dev server / web preview run on random localhost
            // ports (19000, 19006, 8081, ...), so allow any origin while developing.
            // Native mobile apps are not subject to CORS; this is for browser tooling.
            options.AddPolicy("AllowLocalDev", builder =>
            {
                builder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            });
        });

        // Rate limiting for auth endpoints (per client IP). Blunts credential
        // stuffing and makes the 6-digit reset code un-brute-forceable in
        // combination with the 5-attempt token lockout.
        // NOTE: behind a proxy/App Service the connection IP may be shared;
        // limits are sized generously enough for legitimate shared-IP traffic.
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                context.HttpContext.Response.ContentType = "text/plain";
                await context.HttpContext.Response.WriteAsync(
                    "Too many requests. Please wait a few minutes and try again.", cancellationToken);
            };

            static string ClientKey(HttpContext ctx) =>
                ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

            // forgot-password + change-password: 10 requests / 15 min per IP.
            options.AddPolicy("password-reset", ctx =>
                RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(15),
                    QueueLimit = 0,
                }));

            // login: 10 attempts / min per IP.
            options.AddPolicy("login", ctx =>
                RateLimitPartition.GetFixedWindowLimiter(ClientKey(ctx), _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 10,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }));
        });



        // JWT Authentication
        var key = Encoding.ASCII.GetBytes("Yxg/R2jDGHJpLz0LeU8s9y8RcY3ThVwB9yZ9V6n1yQI="); // Replace with your secret key
        services.AddAuthentication(x =>
        {
            x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(x =>
        {
            x.RequireHttpsMetadata = false; // Change to true in production
            x.SaveToken = true;
            x.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero // Token expires exactly at token expiration time
            };

            // WebSockets cannot send an Authorization header, so SignalR clients
            // pass the JWT as ?access_token=... — accept it for hub paths only.
            x.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(accessToken) &&
                        context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        // Swagger configuration
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });

            // Add security definition
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.ApiKey,
                Scheme = "bearer",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Description = "JWT Authorization header using the Bearer scheme."
            });

            // Add security requirement
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        if (env.IsDevelopment() || env.IsProduction()) // Optionally expose Swagger in production
        {
            app.UseSwagger();
            app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "API v1"));
        }

        app.UseRouting();

        // Use CORS policy
        // Permissive CORS in local development, strict origin list elsewhere.
        app.UseCors(env.IsDevelopment() ? "AllowLocalDev" : "AllowSpecificOrigins");

        app.UseRateLimiter();


        app.UseAuthentication(); // Ensure this is added before authorization
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
            endpoints.MapHub<OnDaGo.API.Hubs.VehicleHub>("/hubs/vehicles");
            endpoints.MapHub<OnDaGo.API.Hubs.ReportHub>("/hubs/reports");
        });
    }
}