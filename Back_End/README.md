# Property GIS API

An ASP.NET Core Web API for saving and retrieving selected GIS features. The API stores feature geometry, attributes, spatial reference, and measurements in a JSON file and identifies each saved feature by its layer ID and feature ID.

## Features

- List all saved features and retrieve an individual feature.
- Save features with geometry, attributes, and optional measurements.
- Prevent duplicate saves using the combination of `layerId` and `featureId` (case-insensitive feature ID).
- Delete a saved feature from local storage.
- Configure the JSON file location and allowed frontend origin.

## What is included

```text
Program.cs
Controllers/
  FeaturesController.cs
Services/
  IFeatureStorageService.cs
  JsonFeatureStorageService.cs
Data/
  features.json
```

> The supplied archive contains backend source files only. It does **not** include the `.csproj`, `Models` folder, frontend, or runtime configuration files. The source references models such as `SaveFeatureRequest`, `StoredFeature`, and `FeatureStore`. Add these files from the complete project before building or running. The .NET target version must be checked in the complete project's `.csproj`.

## Requirements

- .NET SDK matching the target framework in the project file. For example, install the .NET 8 SDK if the project targets `net8.0`.
- Postman or another HTTP client for testing.
- For IIS deployment: Windows, IIS, and the ASP.NET Core Hosting Bundle matching the project's runtime.

## Run locally

From the complete backend project directory containing the `.csproj` file:

```bash
dotnet restore
dotnet build
dotnet run
```

Use the URL printed in the console. The port depends on your configuration; replace `<port>` in the examples below. This source archive alone cannot be built or run until the missing project and model files are supplied.

## Configuration

### Storage path

The storage service reads `FeatureStorage:FilePath`. If it is not configured, it uses `Data/features.json` relative to the application's content root. An absolute path can also be used.

Example `appsettings.json` in the complete project:

```json
{
  "FeatureStorage": {
    "FilePath": "Data/features.json"
  }
}
```

The application creates the directory when needed. Give the application identity read and write access to the directory, including permission to create and replace files. Back up the JSON data separately before deploying new files.

### CORS

The supplied `Program.cs` allows the frontend origin:

```text
http://localhost:5500
```

If the browser frontend uses another origin, update `WithOrigins(...)` in `Program.cs` to match its exact scheme, host, and port. CORS applies to browser requests; Postman is not subject to browser CORS enforcement.

## API endpoints

Base URL for local development: `http://localhost:<port>/api/features`

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| GET | `/api/features` | Get all saved features | `200 OK` |
| GET | `/api/features/{layerId}/{featureId}` | Get one saved feature | `200 OK`; `404` if missing |
| POST | `/api/features` | Validate and save a new feature | `201 Created`; `400` for validation errors; `409` for a duplicate |
| DELETE | `/api/features/{layerId}/{featureId}` | Delete one saved feature | `200 OK`; `404` if missing |

`layerId` must be an integer. The API considers two features duplicates when both their layer IDs and their feature IDs match. Duplicate requests do not update the existing feature. The controller imposes no fixed list of allowed layer IDs.

### Save a polygon in Postman

1. Select **POST** and enter `http://localhost:<port>/api/features`.
2. Select **Body → raw → JSON** and send the following example:

```json
{
  "layer": { "id": 0, "name": "Properties" },
  "featureId": "74654",
  "geometryType": "polygon",
  "spatialReference": { "wkid": 2193, "latestWkid": null, "wkt": null },
  "geometry": {
    "spatialReference": { "wkid": 2193 },
    "rings": [[
      [1316766.5825, 4983079.222],
      [1316784.8694, 4983076.3214],
      [1316778.4561, 4983035.8834],
      [1316764.1449, 4983038.1513],
      [1316760.1708, 4983038.7803],
      [1316766.5825, 4983079.222]
    ]]
  },
  "attributes": {
    "OBJECTID": 74654,
    "StreetName": "Killarney St"
  },
  "measurements": {
    "areaSquareMeters": 758.0698171453604,
    "perimeterMeters": 118.91907493459445,
    "lengthMeters": null,
    "sides": [
      { "side": 1, "lengthMeters": 18.515512198187817 },
      { "side": 2, "lengthMeters": 40.94340314169047 },
      { "side": 3, "lengthMeters": 18.513352632278842 },
      { "side": 4, "lengthMeters": 40.94680690519017 }
    ]
  }
}
```

The request example is based on the provided data; verify its fields against the missing model definitions. `savedAtUtc` is set by the server. A successful response contains the saved feature and a `Location` header pointing to its GET endpoint. Sending the same layer ID and feature ID again returns `409 Conflict`:

```json
{
  "message": "This feature has already been saved.",
  "layerId": 0,
  "featureId": "74654"
}
```

### Retrieve and delete

```http
GET /api/features
GET /api/features/0/74654
DELETE /api/features/0/74654
```

A successful delete returns:

```json
{
  "message": "Feature deleted successfully.",
  "layerId": 0,
  "featureId": "74654"
}
```

Deletion affects the local JSON storage only; it does not delete the source feature from ArcGIS.

## Validation and geometry

The controller requires a layer and layer name, a feature ID, a supported geometry type, and a non-null geometry. Geometry type is case-insensitive and accepts `point`, `polyline`, `line`, `polygon`, and `multipolygon`.

The controller checks that geometry is present; it does not validate coordinates, topology, ring closure, or consistency with the geometry type. It stores the geometry and measurements sent by the client without calculating measurements or reprojecting coordinates. The example uses ArcGIS JSON and WKID 2193; supported geometry representation depends on the client and project models.

## IIS deployment

1. On the machine with the complete project, publish from its `.csproj` directory:

   ```powershell
   dotnet publish -c Release -o .\publish
   ```

2. Install the matching ASP.NET Core Hosting Bundle on the IIS server and configure an IIS site or application to point to the published directory.
3. Give the application pool identity read/write access to the configured data directory. Store data outside the publish folder when possible to avoid overwriting it during future deployments.
4. Configure CORS for the actual frontend origin, then test `GET` and `POST` using the application's URL. If deployed as an IIS application named `backend`, the endpoint is typically `http://<server>/backend/api/features`.

Consult the complete project's deployment configuration for its exact runtime and binding. If a request returns `500`, inspect the server logs and verify the storage directory permissions and JSON file contents.

## Storage and concurrency

Each save or delete reads and rewrites the entire JSON store. Writes go to a temporary file first, then replace the main file. The in-memory semaphore protects operations only within the **same service instance**.

The supplied `Program.cs` registers this service with `AddScoped`, so separate requests can receive separate instances and semaphores. Concurrent requests can therefore race, causing lost updates or file conflicts. If using this file-based design in a single application process, consider registering it as a singleton after checking its dependencies; this still does not coordinate multiple processes or servers. For concurrent production use, a database with a unique constraint on `(LayerId, FeatureId)` is a more robust option.
