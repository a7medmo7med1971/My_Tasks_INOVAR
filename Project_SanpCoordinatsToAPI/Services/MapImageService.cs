using MapSnapshotApi.Models;
using Microsoft.Extensions.Options;
using Microsoft.Playwright;

namespace MapSnapshotApi.Services;

public sealed class MapImageService : IDisposable
{
    private readonly SemaphoreSlim _slots = new(2, 2); // wait Q req
    private readonly string _html;  // read content html
    public string DirectoryPath { get; } // path folder el images
    public MapOptions Options { get; } // setting el map

    public MapImageService(IWebHostEnvironment environment, IOptions<MapOptions> options)//MapImageService inilization program
    {
        Options = options.Value;
        DirectoryPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, Options.ImageDirectory));
        Directory.CreateDirectory(DirectoryPath);
        _html = File.ReadAllText(Path.Combine(environment.ContentRootPath, "Rendering", "map.html"));
    }

    public async Task<Guid?> CreateAsync(SnapshotRequest request, CancellationToken ct)//call fun SnapshotRequest request
    {
        if (!await _slots.WaitAsync(0, ct)) return null; // zay el q in fasapi
        try
        {
            using var playwright = await Playwright.CreateAsync();
            await using var browser = await playwright.Chromium.LaunchAsync(new()
            {
                Headless = true,
                Timeout = 10000 ,
                Args = new[] { "--enable-webgl", "--use-angle=swiftshader", "--enable-unsafe-swiftshader" }
            });
            await using var context = await browser.NewContextAsync(new()
            {
                ViewportSize = new() { Width = request.Width, Height = request.Height },
                DeviceScaleFactor = 1,
                Locale = "en-US"
            });
            using var registration = ct.Register(() => { _ = context.CloseAsync(); }); // handel request
            var page = await context.NewPageAsync();
            page.SetDefaultTimeout(60000);
            await page.SetContentAsync(_html, new() { WaitUntil = WaitUntilState.Load });// load map
            await page.WaitForFunctionAsync("() => typeof window.renderMap === 'function'");// waiting fun drawimg
            await page.EvaluateAsync("args => window.renderMap(args)", new //run Js and pass data 
            {
                x = request.X!.Value, y = request.Y!.Value, zoom = request.Zoom,
                marker = request.Marker, serviceUrl = Options.ServiceUrl
            });
            ct.ThrowIfCancellationRequested();// cheak request lasa mougoud
            // Screenshot the DOM so attribution is included with the map.
            var bytes = await page.Locator("#map").ScreenshotAsync(new() { Type = ScreenshotType.Png });
            ct.ThrowIfCancellationRequested();
            var id = Guid.NewGuid(); //genrate d431277d12fa4afc9bd79f324334b766 
            var finalPath = Path.Combine(DirectoryPath, $"{id:N}.png");
            var tempPath = finalPath + ".tmp";
            try
            {
                await File.WriteAllBytesAsync(tempPath, bytes, ct);
                File.Move(tempPath, finalPath);
            }
            finally { if (File.Exists(tempPath)) File.Delete(tempPath); }
            return id; //finalyy
        }
        finally { _slots.Release(); }
    }

    public void Dispose() => _slots.Dispose(); // clean any old request for with user
}
