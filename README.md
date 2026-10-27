# INOVAR GIS Tasks

A collection of GIS applications and APIs developed for property exploration, spatial analysis, feature storage, and map image generation.

## Projects

| Project | Description | Technologies |
| --- | --- | --- |
| Property GIS Application | Interactive map for exploring properties, roads, and street addresses in Otago, New Zealand. | HTML, CSS, Vanilla JavaScript, ArcGIS Maps SDK for JavaScript |
| Property GIS API | REST API for saving, retrieving, and deleting selected GIS features. | C#, ASP.NET Core, JSON file storage |
| Map Snapshot API | REST API that generates an Esri map image from WGS84 coordinates. | C#, ASP.NET Core 8, Playwright, Chromium, ArcGIS Maps SDK |

## 1. Property GIS Application

A web-based application for exploring property and road data, performing spatial analysis, and saving selected features through the Property GIS API.

### Features

- Filter by Territorial Authority, Locality, Road, Property, and Street Address.
- Highlight selected properties and roads and navigate to them on the map.
- Find properties intersecting a 15-meter road buffer.
- Measure property areas, perimeters, sides, line segments, and distances to roads.
- Draw points, lines, polygons, rectangles, and circles using ArcGIS Sketch.
- Analyze intersections and calculate property overlap percentages.
- Import zipped Shapefiles and export drawings as Shapefiles.
- Save selected GIS features using the Property GIS API.

### Data source

The application uses the [Otago Regional Council PropertyExternal MapServer](https://maps.orc.govt.nz/arcgis/rest/services/PropertyExternal/MapServer):

| Layer ID | Layer |
| --- | --- |
| 0 | ORC Properties |
| 2 | Street Address |
| 3 | Roads |

The property data uses **NZTM2000 (WKID 2193)**, with coordinates measured in meters. WGS84 (WKID 4326) is also used where geographic coordinates or export require it.

### Run the frontend

Serve the folder containing `index.html` using a local web server, such as the VS Code Live Server extension. Open the address supplied by the server, for example:

```text
http://localhost:5500
```

The frontend requires access to the ArcGIS services. To save features, run the Property GIS API and configure the frontend's API URL to match the backend address.

## 2. Property GIS API

An ASP.NET Core API that stores selected feature geometry, attributes, spatial reference, and optional measurements in a JSON file. Features are identified by layer ID and feature ID; duplicate saves return `409 Conflict`.

### Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/features` | Retrieve all saved features |
| GET | `/api/features/{layerId}/{featureId}` | Retrieve one feature |
| POST | `/api/features` | Save a feature |
| DELETE | `/api/features/{layerId}/{featureId}` | Delete a saved feature from local storage |

The API accepts `point`, `line`, `polyline`, `polygon`, and `multipolygon` geometry types. It stores the geometry and measurements provided by the client; it does not calculate measurements or reproject coordinates.

### Run the API

Install the .NET SDK version required by the project, then open a terminal in the backend folder containing the `.csproj` file:

```bash
dotnet restore
dotnet build
dotnet run
```

Use the address printed in the terminal, followed by `/api/features`. The default storage path is `Data/features.json`, configurable through `FeatureStorage:FilePath`. The application needs read and write access to the storage directory.

The supplied backend README was written for an archive missing its project file and model definitions. If those files are also missing from your checkout, add them from the complete backend project before building.

For browser requests, configure CORS to match the frontend's exact origin. The supplied backend configuration allows `http://localhost:5500`.

## 3. Map Snapshot API

An ASP.NET Core 8 API that receives WGS84 coordinates, renders an Esri map in headless Chromium, saves a PNG, and returns its URL.

### Setup and run

Install the .NET 8 SDK. In the Map Snapshot API folder containing the `.csproj` file, run:

```bash
dotnet restore
dotnet build
dotnet run -- --install-browsers
dotnet run
```

Install Chromium once and again after updating Playwright. The server needs internet access to load ArcGIS resources and map tiles.

### Example request

Use the actual port printed by the application; `5081` below is an example:

```http
GET http://127.0.0.1:5081/api/QueryData/GetPointShot2GisUrl?x=46.6842152&y=24.7976198
```

An alternative endpoint is `/api/QueryData/GetPointShotEsriUrl`.

| Parameter | Description | Default / range |
| --- | --- | --- |
| `x` | Longitude in WGS84 decimal degrees | Required; -180 to 180 |
| `y` | Latitude in WGS84 decimal degrees | Required; -90 to 90 |
| `zoom` | Map zoom level | Default 16; 0 to 16 |
| `width` | Image width in pixels | Default 1000; 256 to 2000 |
| `height` | Image height in pixels | Default 700; 256 to 2000 |
| `marker` | Show a location marker | Default `true` |

Google Maps coordinates are commonly copied as latitude, longitude; pass longitude as `x` and latitude as `y`. Generated images are stored in `Data/map-images` and are not automatically deleted.

### Example response

```json
{
  "status": true,
  "errorCode": 0,
  "error_Code": null,
  "gis_code": "save image sucssfuly",
  "imageUrl": "http://localhost:5081/api/QueryData/images/example.png",
  "urlEsri": "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_GCS_v2/VectorTileServer"
}
```

The image URL is illustrative; use the URL returned by the API.

## Deployment notes

- For IIS hosting, install the ASP.NET Core Hosting Bundle matching the backend runtime and grant the application write access to its data directory.
- When frontend and backend are hosted on the same origin, a relative API URL such as `/backend/api/features` can avoid hard-coding `localhost`.
- Back up stored JSON data separately before deploying updates.
- The supplied Property GIS API documentation notes that its scoped file-storage service uses a per-instance semaphore. Concurrent requests may race; use a suitable shared synchronization strategy or a database for concurrent production use.

## Author

**Ahmed Mohamed** — GIS Full-Stack Developer  
[GitHub](https://github.com/a7medmo7med1971) · [LinkedIn](https://www.linkedin.com/in/ahmed-mohamed-3160b6264/)
