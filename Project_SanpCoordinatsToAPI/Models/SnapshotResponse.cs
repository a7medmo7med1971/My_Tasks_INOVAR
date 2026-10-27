using System.Text.Json.Serialization;

namespace MapSnapshotApi.Models;

public sealed record SnapshotResponse(
    [property: JsonPropertyName("status")] bool Status,
    [property: JsonPropertyName("errorCode")] int ErrorCode,
    [property: JsonPropertyName("error_Code")] string? ErrorMessage,
    [property: JsonPropertyName("gis_code")] string? GisCode,
    [property: JsonPropertyName("imageUrl")] string? ImageUrl,
    [property: JsonPropertyName("urlEsri")] string? UrlEsri)
{
    public static SnapshotResponse Fail(int code, string message) => new(false, code, message, null, null, null);
}
