using System.ComponentModel.DataAnnotations;
namespace MapSnapshotApi.Models;
public sealed class SnapshotRequest
{
    [Required, Range(-180d, 180d)] public double? X { get; set; }
    [Required, Range(-90d, 90d)] public double? Y { get; set; }
    [Range(0, 16)] public int Zoom { get; set; } = 16;
    [Range(256, 2000)] public int Width { get; set; } = 1000;
    [Range(256, 2000)] public int Height { get; set; } = 700;
    public bool Marker { get; set; } = true;
}
