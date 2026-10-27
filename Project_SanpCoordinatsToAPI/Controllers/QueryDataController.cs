using MapSnapshotApi.Models;
using MapSnapshotApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MapSnapshotApi.Controllers;

[ApiController]
[Route("api/QueryData")]
public sealed class QueryDataController(MapImageService images, ILogger<QueryDataController> logger) : ControllerBase
{
    // Dependency Injection
    [HttpGet("GetPointShot2GisUrl")]
    [HttpGet("GetPointShotEsriUrl")]
    public async Task<IActionResult> Get([FromQuery] SnapshotRequest input, CancellationToken ct)
    {
        if (!double.IsFinite(input.X!.Value) || !double.IsFinite(input.Y!.Value))
            return BadRequest(SnapshotResponse.Fail(400, "Coordinates must be finite numbers."));
        try
        {
            var id = await images.CreateAsync(input, ct);
            if (id is null)
            {
                Response.Headers["Retry-After"] = "3"; // over reguest
                return StatusCode(429, SnapshotResponse.Fail(429, "Renderer busy. Retry shortly."));
            }
            var root = images.Options.PublicBaseUrl.TrimEnd('/'); //creat link image for user
            if (string.IsNullOrWhiteSpace(root))
                root = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";
            return Ok(new SnapshotResponse(true, 0, null, "save image sucssfuly",
                $"{root}/api/QueryData/images/{id.Value:N}.png", images.Options.ServiceUrl)); //id.ValueN => genertaed with mapservice
        }
        catch (Exception) when (ct.IsCancellationRequested) { return new EmptyResult(); }
        catch (System.TimeoutException ex)
        {
            logger.LogError(ex, "Map rendering timed out");
            return StatusCode(504, SnapshotResponse.Fail(504, "Map loading timed out. Check server internet access."));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Map image generation failed");
            return StatusCode(500, SnapshotResponse.Fail(500,
                "Image generation failed. Check server logs, Chromium installation and map connectivity."));
        }
    }

    [HttpGet("images/{name}")] // this is pass idimage for Image fun
    
    public IActionResult Image(string name) 
    {
        if (!name.EndsWith(".png", StringComparison.OrdinalIgnoreCase) || //camcase or not
            !Guid.TryParseExact(name[..^4], "N", out var id))
            return NotFound(SnapshotResponse.Fail(404, "Image not found."));
        var path = Path.Combine(images.DirectoryPath, $"{id:N}.png");
        return System.IO.File.Exists(path)// return image for user when saved on server
            ? PhysicalFile(path, "image/png")
            : NotFound(SnapshotResponse.Fail(404, "Image not found."));
    }
}
