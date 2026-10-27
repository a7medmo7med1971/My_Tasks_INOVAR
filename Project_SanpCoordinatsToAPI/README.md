# Map Snapshot API

An **ASP.NET Core 8 API** that accepts **WGS84 coordinates**, generates an Esri map image with an optional location marker, and returns the image URL in JSON.

## Technologies

- ASP.NET Core 8
- Microsoft Playwright and Chromium
- ArcGIS Maps SDK for JavaScript

## Getting Started

Install the **.NET 8 SDK**, then open a terminal in the project directory:

```CMD
dotnet restore
dotnet build
dotnet run -- --install-browsers
dotnet run 
```

Install Chromium once and reinstall it after updating Playwright. Keep the terminal running while using the API. The server needs internet access to load ArcGIS scripts, map tiles, styles, and fonts.

## Usage

Send a **GET** request using Postman or a browser:

```http
http://127.0.0.1:5081/api/QueryData/GetPointShot2GisUrl?x=46.6842152&y=24.7976198
```

An alternative endpoint with the same behavior is `/api/QueryData/GetPointShotEsriUrl`. Both endpoints use Esri as the map source.

### Parameters

| Parameter | Description | Default / Range |
| --- | --- | --- |
| `x` | Longitude in WGS84 decimal degrees | Required; -180 to 180 |
| `y` | Latitude in WGS84 decimal degrees | Required; -90 to 90 |
| `zoom` | Zoom level | 16; 0 to 16 |
| `width` | Image width in pixels | 1000; 256 to 2000 |
| `height` | Image height in pixels | 700; 256 to 2000 |
| `marker` | Show a location marker | `true` |

Google Maps coordinates are commonly copied as **latitude, longitude**. Use the second value for `x` and the first for `y`.

### Example Response

The following URL is illustrative. Each successful request generates a new image ID.

```json
{
    "status": true,
    "errorCode": 0,
    "error_Code": null,
    "gis_code": "save image sucssfuly",
    "imageUrl": "http://localhost:5080/api/QueryData/images/583e9932fe1b43adacbd8e1c8c4f0f31.png",
    "urlEsri": "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_GCS_v2/VectorTileServer"
}
```

The `gis_code` value is the success message returned by the current implementation. Open `imageUrl` to view the PNG image.

## How It Works

1. Validate the coordinates and image settings.
2. Launch Chromium in headless mode.
3. Render the map and optional marker using ArcGIS.
4. Capture the map and save it as a PNG in `Data/map-images`.
5. Return the image URL.

The marker appears in the image; it is not saved as a separate geographic feature. Generated images are not automatically deleted.

## Project Structure

| File | Purpose |
| --- | --- |
| `Program.cs` | Configure the application and register services |
| `Controllers/QueryDataController.cs` | Handle requests and serve generated images |
| `Services/MapImageService.cs` | Generate and save map images |
| `Rendering/map.html` | Render the map and marker |
| `Models/` | Define request, response, and configuration models |
| `appsettings.json` | Configure the map source and image directory |

## Error Responses

| HTTP Status | Meaning |
| --- | --- |
| `400` | Missing or invalid parameters |
| `404` | Image not found |
| `429` | Two rendering requests are already running; retry later |
| `500` | Image generation failed; check application logs |
| `504` | A timeout handled by the application's timeout handler |


