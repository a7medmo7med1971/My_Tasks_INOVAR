namespace MapSnapshotApi.Models;
public sealed class MapOptions
{
    public string ServiceUrl { get; set; } = "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_GCS_v2/VectorTileServer";
    //https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}
    //https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_GCS_v2/VectorTileServer
    public string ImageDirectory { get; set; } = "Data/map-images";
    // Set to the external application root, e.g. https://example.com/backend
    public string PublicBaseUrl { get; set; } = "";
}
