using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using System.Text;
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
        services.AddScoped<IdAnalyzerService>();
        services.AddHttpClient<IdAnalyzerClient>();
        services.AddHttpClient<IdAnalyzerService>();
        services.AddScoped<VehicleService>();     // Register Vehicle service
        services.AddLogging();

        // JSON serialization
        services.AddControllers().AddNewtonsoftJson();

        // CORS configuration
        services.AddCors(options =>
        {
            options.AddPolicy("AllowSpecificOrigins", builder =>
            {
                builder.WithOrigins("https://ondago-fbb0b6f0a7ede3cx.eastasia-01.azurewebsites.net/")
                       .AllowAnyMethod()
                       .AllowAnyHeader();
            });
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
        app.UseCors("AllowAllOrigins");

        app.UseAuthentication(); // Ensure this is added before authorization
        app.UseAuthorization();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}