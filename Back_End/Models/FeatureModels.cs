using System.Text.Json;

namespace PropertyGis.Api.Models;

public  class SaveFeatureRequest
{
    public LayerInfo Layer { get; set; } = new();
    public string FeatureId { get; set; } = string.Empty;
    public string GeometryType { get; set; } = string.Empty;
    public SpatialReferenceDto? SpatialReference { get; set; }
    public JsonElement Geometry { get; set; }
    public Dictionary<string, JsonElement> Attributes { get; set; } = new();
    public MeasurementsDto? Measurements { get; set; }
}

public sealed class LayerInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public sealed class SpatialReferenceDto
{
    public int? Wkid { get; set; }
    public int? LatestWkid { get; set; }
    public string? Wkt { get; set; }
}

public sealed class MeasurementsDto
{
    public double? AreaSquareMeters { get; set; }
    public double? PerimeterMeters { get; set; }
    public double? LengthMeters { get; set; }
    public List<SideDto> Sides { get; set; } = [];
}

public sealed class SideDto
{
    public int Side { get; set; }
    public double LengthMeters { get; set; }
}

public sealed class StoredFeature : SaveFeatureRequest
{
    public DateTimeOffset SavedAtUtc { get; set; }
}

public sealed class FeatureStore
{
    public List<StoredFeature> Features { get; set; } = [];
}
