var builder = WebApplication.CreateBuilder(args);

// Create an instance of the Startup class and configure services.
var startup = new Startup();
startup.ConfigureServices(builder.Services);

var app = builder.Build();

// Configure the HTTP request pipeline using the Startup class.
startup.Configure(app, builder.Environment);

app.Run();
