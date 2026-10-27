using MapSnapshotApi.Models;
using MapSnapshotApi.Services;

// Optional CLI shortcut: dotnet run -- --install-browsers
if (args.Contains("--install-browsers"))
    return Microsoft.Playwright.Program.Main(new[] { "install", "chromium" });

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
    options.InvalidModelStateResponseFactory = context =>
        new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
            SnapshotResponse.Fail(400, "Invalid parameters. Use x=longitude, y=latitude, zoom=0..16, width/height=256..2000.")));
builder.Services.Configure<MapOptions>(builder.Configuration.GetSection("Map"));
builder.Services.AddSingleton<MapImageService>();
var app = builder.Build();
app.MapControllers();
app.MapGet("/", () => Results.Ok(new {
    message = "Map Snapshot API", example = "/api/QueryData/GetPointShot2GisUrl?x=46.6842152&y=24.7976198"
}));
app.Run();
return 0;
