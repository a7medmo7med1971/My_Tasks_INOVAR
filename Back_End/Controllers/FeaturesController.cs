using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using PropertyGis.Api.Models;
using PropertyGis.Api.Services;

namespace PropertyGis.Api.Controllers;

[ApiController]
[Route("api/features")]
public sealed class FeaturesController : ControllerBase
{
    // Allowed geometry types
    private static readonly HashSet<string> SupportedGeometryTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "point",
        "polyline",
        "line",
        "polygon",
        "multipolygon"
    };

    private readonly IFeatureStorageService _storage;

    // Inject storage service
    public FeaturesController(IFeatureStorageService storage)
    {
        _storage = storage;
    }

    // Get all saved features when el user request this
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StoredFeature>>> GetAll(CancellationToken cancellationToken)
    {
        return Ok(await _storage.GetAllAsync(cancellationToken));
    }

    // Get one feature by LayerId + FeatureId end point
    [HttpGet("{layerId:int}/{featureId}")]
    public async Task<ActionResult<StoredFeature>> Get(int layerId, string featureId, CancellationToken cancellationToken)
    {
        var feature = await _storage.GetAsync(layerId, featureId, cancellationToken);
        return feature is null ? NotFound() : Ok(feature);
    }
    // Delete one feature by LayerId + FeatureId
    [HttpDelete("{layerId:int}/{featureId}")]
    public async Task<IActionResult> Delete(int layerId, string featureId, CancellationToken cancellationToken)
    {
        var deleted = await _storage.DeleteAsync(layerId, featureId, cancellationToken);

        if (!deleted) return NotFound(new { message = "Feature not found." });

        return Ok(new
        {
            message = "Feature deleted successfully.",
            layerId,
            featureId
        });
    }
    // Validate and save feature
    [HttpPost]
    public async Task<ActionResult<StoredFeature>> Save([FromBody] SaveFeatureRequest request, CancellationToken cancellationToken)
    {
        var validationError = Validate(request);
        if (validationError is not null) return BadRequest(new { message = validationError });

        // Duplicate check is handled by storage using LayerId + FeatureId
        var result = await _storage.SaveAsync(request, cancellationToken);

        if (result.Status == SaveFeatureStatus.Duplicate)
        {
            return Conflict(new
            {
                message = "This feature has already been saved.",
                layerId = result.Feature.Layer.Id,
                featureId = result.Feature.FeatureId
            });
        }

        return CreatedAtAction(nameof(Get), new
        {
            layerId = result.Feature.Layer.Id,
            featureId = result.Feature.FeatureId
        }, result.Feature);
    }

    // Validate request data
    private static string? Validate(SaveFeatureRequest request)
    {
        if (request.Layer is null) return "Layer is required.";
        if (string.IsNullOrWhiteSpace(request.Layer.Name)) return "Layer name is required.";
        if (string.IsNullOrWhiteSpace(request.FeatureId)) return "FeatureId is required.";
        if (string.IsNullOrWhiteSpace(request.GeometryType)) return "GeometryType is required.";
        if (!SupportedGeometryTypes.Contains(request.GeometryType)) return "GeometryType must be point, line/polyline, polygon, or multipolygon.";
        if (request.Geometry.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null) return "Geometry is required.";

        return null;
    }
}